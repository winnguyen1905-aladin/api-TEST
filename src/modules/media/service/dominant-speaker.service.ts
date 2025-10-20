import { Server as SocketIOServer } from 'socket.io';
import * as mediasoup from 'mediasoup';
import { config } from '@/shared';
import { Room } from '@/modules/room';

interface DominantSpeakerInfo {
	producer: {
		id: string;
	};
}

interface NewTransportsByPeer {
	[socketId: string]: string[];
}

export async function newDominantSpeaker(ds: DominantSpeakerInfo, room: Room, io: SocketIOServer): Promise<void> {
	console.log('[DominantSpeaker] New dominant speaker:', ds.producer.id);

	const i = room.activeSpeakerList.findIndex(pid => pid === ds.producer.id);

	// Check if this is actually a meaningful change to avoid unnecessary updates
	const isAlreadyTopSpeaker = i === 0;
	if (isAlreadyTopSpeaker) {
		console.log('[DominantSpeaker] Already top speaker, skipping update for smoother video');
		return; // No change needed, avoid disrupting video streams
	}

	if (i > -1) {
		const [pid] = room.activeSpeakerList.splice(i, 1);
		room.activeSpeakerList.unshift(pid);
	} else {
		room.activeSpeakerList.unshift(ds.producer.id);
	}

	// Import config to get the max active speakers limit
	const maxActiveSpeakers = config.roomSettings.maxActiveSpeakers;

	console.log('[DominantSpeaker] Updated active speakers:', room.activeSpeakerList.slice(0, maxActiveSpeakers));

	// Use lightweight update process for smooth video
	const { updateActiveSpeakers } = require('./active-speakers.service');
	const newTransportsByPeer: NewTransportsByPeer = await updateActiveSpeakers(room, io);

	// Only process new transports if needed to minimize video interruptions
	if (Object.keys(newTransportsByPeer).length === 0) {
		console.log('[DominantSpeaker] No new transports needed, sending lightweight update');
		// Just send the updated speaker list without heavy transport operations
		io.to(room.roomName).emit('updateActiveSpeakers', room.activeSpeakerList.slice(0, maxActiveSpeakers));
		return;
	}

	// Process socket emissions with minimal delay for smooth operation
	const emissionPromises = Object.entries(newTransportsByPeer).map(([socketId, audioPidsToCreate]) => {
		return new Promise<void>((resolve) => {
			const videoPidsToCreate: (string | null)[] = audioPidsToCreate.map(aPid => {
				const producerClient = room.clients.find(c => c?.producer?.audio?.id === aPid || c?.producer?.screenAudio?.id === aPid);
				if (producerClient?.producer?.screenAudio?.id === aPid) {
					return producerClient?.producer?.screenVideo?.id || null;
				}
				return producerClient?.producer?.video?.id || null;
			});

			const associatedUserNames: string[] = audioPidsToCreate.map(aPid => {
				const producerClient = room.clients.find(c => c?.producer?.audio?.id === aPid || c?.producer?.screenAudio?.id === aPid);
				const isScreenShare = producerClient?.producer?.screenAudio?.id === aPid;
				const userName = producerClient?.userName || 'Unknown User';
				return isScreenShare ? `${userName} Sharing` : userName;
			});

			io.to(socketId).emit('newProducersToConsume', {
				routerRtpCapabilities: room.router!.rtpCapabilities,
				audioPidsToCreate,
				videoPidsToCreate,
				associatedUserNames,
				activeSpeakerList: room.activeSpeakerList.slice(0, maxActiveSpeakers)
			});
			resolve();
		});
	});

	// Process all emissions efficiently
	await Promise.all(emissionPromises);

	console.log(`[DominantSpeaker] Smoothly notified ${emissionPromises.length} clients of new producers`);
}
