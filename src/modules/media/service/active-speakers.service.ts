import { Server as SocketIOServer } from "socket.io";
import * as mediasoup from "mediasoup";
import { config } from '@/shared';
import { Room } from "@/modules/room";

interface NewTransportsByPeer {
  [socketId: string]: string[];
}

export const updateActiveSpeakers = async (
  room: Room,
  io: SocketIOServer,
): Promise<NewTransportsByPeer> => {
  // Import config to get the max active speakers limit
  const maxActiveSpeakers = config.roomSettings.maxActiveSpeakers;

  const activeSpeakers = room.activeSpeakerList.slice(0, maxActiveSpeakers);
  const mutedSpeakers = room.activeSpeakerList.slice(maxActiveSpeakers);
  const newTransportsByPeer: NewTransportsByPeer = {};

  // Reduced logging for better performance
  console.log(
    `[ActiveSpeakers] Room: ${room.roomName}, Clients: ${room.clients.length}, Active: [${activeSpeakers.length}]`,
  );

  // Process all clients in parallel for much better performance
  const clientProcessingPromises = room.clients.map(async (client, index) => {
    const newSpeakersToThisClient: string[] = [];

    try {
      // SMOOTH VIDEO OPTIMIZATION: Only pause/resume audio, avoid disrupting video streams
      const audioOperations: Promise<void>[] = [];

      // Mute speakers beyond max limit (AUDIO ONLY - don't interrupt video)
      mutedSpeakers.forEach((pid) => {
        if (client?.producer?.audio?.id === pid) {
          audioOperations.push(
            Promise.resolve().then(() => client?.producer?.audio?.pause()),
          );
          return;
        }

        const downstreamToStop = client.downstreamTransports.find(
          (t) => t?.audio?.producerId === pid,
        );
        if (downstreamToStop?.audio) {
          audioOperations.push(
            Promise.resolve().then(() => downstreamToStop.audio?.pause()),
          );
        }
      });

      // Resume active speakers (AUDIO ONLY - let video run smoothly)
      activeSpeakers.forEach((pid) => {
        if (client?.producer?.audio?.id === pid) {
          audioOperations.push(
            Promise.resolve().then(() => client?.producer?.audio?.resume()),
          );
          return;
        }

        const downstreamToStart = client.downstreamTransports.find(
          (t) => t?.associatedAudioPid === pid,
        );
        if (downstreamToStart?.audio) {
          audioOperations.push(
            Promise.resolve().then(() => downstreamToStart?.audio?.resume()),
          );
        } else {
          newSpeakersToThisClient.push(pid);
        }
      });

      // Execute all audio operations in parallel (without affecting video)
      if (audioOperations.length > 0) {
        await Promise.all(audioOperations);
      }

      // Handle video separately for smooth transitions - only resume, don't pause active video
      const videoResumePromises: Promise<void>[] = [];
      activeSpeakers.forEach((pid) => {
        if (client?.producer?.video?.id && client?.producer?.audio?.id === pid) {
          if (client.producer.video.paused) {
            videoResumePromises.push(
              Promise.resolve().then(() => client?.producer?.video?.resume()),
            );
          }
          return;
        }

        const downstreamToStart = client.downstreamTransports.find(
          (t) => t?.associatedAudioPid === pid,
        );
        if (downstreamToStart?.video && downstreamToStart.video.paused) {
          videoResumePromises.push(
            Promise.resolve().then(() => downstreamToStart?.video?.resume()),
          );
        }
      });

      // Resume video streams without blocking
      if (videoResumePromises.length > 0) {
        Promise.all(videoResumePromises).catch((err) =>
          console.warn(`[ActiveSpeakers] Video resume warning for ${client.userName}:`, err),
        );
      }

      return {
        clientId: client.socket.id,
        newSpeakers: newSpeakersToThisClient,
      };
    } catch (error) {
      console.error(
        `[ActiveSpeakers] Error processing client ${client.userName}:`,
        error,
      );
      return {
        clientId: client.socket.id,
        newSpeakers: newSpeakersToThisClient,
      };
    }
  });

  // Wait for all clients to be processed in parallel
  const results = await Promise.all(clientProcessingPromises);

  // Build the result map
  results.forEach(({ clientId, newSpeakers }) => {
    if (newSpeakers.length) {
      newTransportsByPeer[clientId] = newSpeakers;
    }
  });

  console.log(
    `[ActiveSpeakers] Processed ${room.clients.length} clients, ${Object.keys(newTransportsByPeer).length} need new transports`,
  );

  // Emit to all clients with minimal delay for smoother updates
  setTimeout(() => {
    io.to(room.roomName).emit("updateActiveSpeakers", activeSpeakers);
  }, 0);

  return newTransportsByPeer;
};
