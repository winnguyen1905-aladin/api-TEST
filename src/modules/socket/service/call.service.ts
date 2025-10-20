import { Server as SocketIOServer } from 'socket.io'
import * as mediasoup from 'mediasoup'
import {
  Client,
  RoomService,
  WorkerManager,
  TransportService,
  MediaService,
  updateActiveSpeakers,
  TransportRequestDto,
  ConnectTransportDto,
  TransportRole,
  TransportParamsDto
} from '@modules'
import { config } from '@/shared'
import { SocketHelpersUtil, socketHelpersUtil } from '@/utils'
import {
  JoinRoomData,
  JoinRoomResponse,
  TransportRequestData,
  ConnectTransportData,
  StartProducingData,
  ConsumeMediaData,
  UnpauseConsumerData,
  SocketEventCallback,
  ServerContext
} from '@/common'
// Interaction services are now injected via MediaService 

import { injectable, inject } from 'inversify';
import { TYPES } from '@/common/di/types';
import { Room } from '@/modules/room/domain/room.domain'

@injectable()
export class CallService {
  constructor(
    @inject(TYPES.RoomService) private readonly roomService: RoomService,
    @inject(TYPES.TransportService) private readonly transportService: TransportService,
    @inject(TYPES.MediaService) private readonly mediaService: MediaService,
    @inject(TYPES.ServerContext) private readonly context: ServerContext) { }

  // Screen sharing, AR, and detection logic moved to MediaService via startProducing method

  async handleJoinRoom(
    client: Client,
    data: JoinRoomData,
    io: SocketIOServer
  ): Promise<JoinRoomResponse> {
    if (!this.context) {
      throw new Error('ServerContext not set. Call setContext() first.')
    }

    const { userName, roomName } = data
    let newRoom: boolean = false
    let requestedRoom: Room | undefined = this.roomService.findRoom(roomName)

    if (!requestedRoom) {
      newRoom = true
      try {
        // Use modern WorkerManager to pick optimal worker for this room
        const workerRecord = this.context.workerManager.pickWorkerForRoom(roomName)
        console.log(`Selected worker ${workerRecord.id} (PID: ${workerRecord.pid}, Score: ${workerRecord.score}) for room: ${roomName}`)

        requestedRoom = this.roomService.createRoom(roomName, workerRecord.worker)
        await requestedRoom.createRouter(io)

        // IMPORTANT: Increment router count for load balancing
        this.context.workerManager.incRouters(workerRecord.pid, +1)

      } catch (error) {
        console.error('Failed to create new room:', error)
        return { error: 'Failed to create room - workers not available' }
      }
    } else {
      // Check room member limit for existing rooms
      if (requestedRoom.clients.length >= config.roomSettings.maxRoomMembers) {
        console.log(`[Server] Room ${roomName} is full (${requestedRoom.clients.length}/${config.roomSettings.maxRoomMembers})`)
        return { error: `Room is full. Maximum ${config.roomSettings.maxRoomMembers} members allowed.` }
      }
    }

    client.room = requestedRoom as Room
    client.room.addClient(client)

    // Import config to get the max active speakers limit
    const audioPidsToCreate = client.room.activeSpeakerList.slice(0, config.roomSettings.maxActiveSpeakers)
    const { videoPidsToCreate, associatedUserNames } = SocketHelpersUtil.extractProducerInfo(
      client.room,
      audioPidsToCreate
    )

    return {
      routerRtpCapabilities: client.room?.router?.rtpCapabilities,
      newRoom,
      audioPidsToCreate,
      videoPidsToCreate,
      associatedUserNames
    }
  }

  async handleRequestTransport(
    client: Client,
    data: TransportRequestData
  ): Promise<TransportParamsDto> {
    try {
      const clientTransportParams = await this.transportService.handleTransportRequest(
        client,
        { type: data.type as 'producer' | 'consumer', audioPid: data.audioPid } as TransportRequestDto
      )
      return clientTransportParams
    } catch (error) {
      console.error('Transport request error:', error)
      throw new Error('Failed to create transport')
    }
  }

  async handleConnectTransport(
    client: Client,
    data: ConnectTransportData
  ): Promise<string> {
    try {
      const connectData: ConnectTransportDto = {
        dtlsParameters: data.dtlsParameters as mediasoup.types.DtlsParameters,
        type: data.type as TransportRole,
        audioPid: data.audioPid
      }
      const result = await this.transportService.connectTransport(client, connectData)
      return result
    } catch (error) {
      console.log('Connect transport error:', error)
      throw new Error('error')
    }
  }

  async handleStartProducing(
    client: Client,
    data: StartProducingData,
    io: SocketIOServer
  ): Promise<any> {
    try {
      const producerId = await this.mediaService.startProducing(
        client,
        { kind: data.kind as 'audio' | 'video', rtpParameters: data.rtpParameters }
      )

      // Update active speakers for both audio and video producers (async for better performance)
      const newTransportsByPeer = await updateActiveSpeakers(client.room as Room, io)

      // Process socket emissions in parallel for better performance
      await SocketHelpersUtil.emitNewProducersInParallel(io, newTransportsByPeer, client.room as Room)
      console.log(`[Server] Notified clients of new producer: ${producerId}`)

      return producerId
    } catch (error) {
      console.log('Start producing error:', error)
      throw new Error('Failed to start producing')
    }
  }

  handleAudioChange(client: Client, typeOfChange: string): void {
    this.mediaService.handleAudioChange(client, typeOfChange)
  }

  async handleConsumeMedia(
    client: Client,
    data: ConsumeMediaData
  ): Promise<any> {
    console.log("Kind: ", data.kind, "   pid:", data.pid)
    try {
      const result = await this.mediaService.consumeMedia(
        client,
        { rtpCapabilities: data.rtpCapabilities, pid: data.pid, kind: data.kind as 'audio' | 'video' }
      )
      return result
    } catch (error) {
      console.log('Consume media error:', error)
      throw new Error('consumeFailed')
    }
  }

  async handleUnpauseConsumer(
    client: Client,
    data: UnpauseConsumerData
  ): Promise<string> {
    try {
      const result = await this.mediaService.unpauseConsumer(
        client,
        { pid: data.pid, kind: data.kind as 'audio' | 'video' }
      )
      return result
    } catch (error) {
      console.log("Error unpausing consumer:", error)
      throw new Error("error")
    }
  }

  handleDisconnect(client: Client): void {
    console.log(`Client ${client?.userName || 'unknown'} disconnected`)
    if (client && client.room) {
      client.room.removeClient(client.socket.id)

      // Count transports before cleanup for WorkerManager tracking
      const transportCount = this.countClientTransports(client)

      client.cleanup()

      // Remove room if empty and update WorkerManager counters
      if (client.room.clients.length === 0) {
        console.log(`[Server] Room ${client.room.roomName} is empty, removing...`)

        // IMPORTANT: Decrement router count when room is removed
        if (this.context && client.room.worker) {
          const workerPid = (client.room.worker as any)._child?.pid ?? -1
          if (workerPid !== -1) {
            this.context.workerManager.incRouters(workerPid, -1)
            console.log(`Decremented router count for worker ${workerPid}`)
          }
        }

        this.roomService.removeRoom(client.room.roomName)
      }

      // IMPORTANT: Decrement transport count for this client's transports
      if (this.context && client.room.worker && transportCount > 0) {
        const workerPid = (client.room.worker as any)._child?.pid ?? -1
        if (workerPid !== -1) {
          this.context.workerManager.incTransports(workerPid, -transportCount)
          console.log(`Decremented ${transportCount} transports for worker ${workerPid}`)
        }
      }
    }
  }

  private countClientTransports(client: Client): number {
    let count = 0
    if (client.upstreamTransport) count++
    count += client.downstreamTransports.length
    return count
  }
}
