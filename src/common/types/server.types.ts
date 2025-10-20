import * as mediasoup from 'mediasoup'
import { Server as SocketIOServer, Server } from 'socket.io'
import { WorkerManager } from '@/modules/worker'
import { Producer } from '@/modules/room/domain/client.domain'

export interface ServerContext {
  io: SocketIOServer,
  workerManager: WorkerManager
  workers: mediasoup.types.Worker[] // Keep for backward compatibility, but prefer workerManager
}

export interface InitializationResult {
  success: boolean
  workers?: mediasoup.types.Worker[]
  error?: string
}

export interface ProducerClientInfo {
  userName: string
  producer: Producer
}
