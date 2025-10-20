import { Server as SocketIOServer } from 'socket.io'
import { Client, Room } from '@/modules'
import { config } from '@/shared'
import { ProducerClientInfo } from '@/common'

export class SocketHelpersUtil {

	static async emitNewProducersInParallel(
		io: SocketIOServer,
		newTransportsByPeer: Record<string, string[]>,
		room: Room
	): Promise<void> {
		const emissionPromises = Object.entries(newTransportsByPeer).map(([socketId, audioPidsToCreate]) => {
			return new Promise<void>((resolve) => {
				setImmediate(() => {
					const videoPidsToCreate = audioPidsToCreate.map((aPid: string) => {
						const producerClient = room.clients.find((c: any) => c?.producer?.audio?.id === aPid || c?.producer?.screenAudio?.id === aPid)
						if (producerClient?.producer?.screenAudio?.id === aPid) {
							return producerClient?.producer?.screenVideo?.id || null
						}
						return producerClient?.producer?.video?.id || null
					})

					const associatedUserNames = audioPidsToCreate.map((aPid: string) => {
						const producerClient = room.clients.find((c: any) => c?.producer?.audio?.id === aPid || c?.producer?.screenAudio?.id === aPid)
						const isScreenShare = producerClient?.producer?.screenAudio?.id === aPid
						const userName = producerClient?.userName || 'Unknown User'
						return isScreenShare ? `${userName} Sharing` : userName
					})

					io.to(socketId).emit('newProducersToConsume', {
						routerRtpCapabilities: room.router?.rtpCapabilities,
						audioPidsToCreate,
						videoPidsToCreate,
						associatedUserNames,
						activeSpeakerList: room.activeSpeakerList.slice(0, config.roomSettings.maxActiveSpeakers)
					})
					resolve()
				})
			})
		})

		await Promise.all(emissionPromises)
		console.log(`[Server] Notified ${emissionPromises.length} clients of new producer`)
	}

	static extractProducerInfo(room: Room, audioPids: string[]) {
		const videoPidsToCreate = audioPids.map((aid: string) => {
			const producingClient = room.clients.find((c: any) => c?.producer?.audio?.id === aid || c?.producer?.screenAudio?.id === aid)
			if (producingClient?.producer?.screenAudio?.id === aid) {
				return producingClient?.producer?.screenVideo?.id || null
			}
			return producingClient?.producer?.video?.id || null
		})

		const associatedUserNames = audioPids.map((aid: string) => {
			const producingClient = room.clients.find((c: any) => c?.producer?.audio?.id === aid || c?.producer?.screenAudio?.id === aid)
			const isScreenShare = producingClient?.producer?.screenAudio?.id === aid
			const userName = producingClient?.userName || 'Unknown User'
			return isScreenShare ? `${userName} Sharing` : userName
		})

		return { videoPidsToCreate, associatedUserNames }
	}
}

export const socketHelpersUtil = new SocketHelpersUtil();
