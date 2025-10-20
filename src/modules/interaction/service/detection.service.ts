import { Client } from "@/modules/room/domain/client.domain";
import * as mediasoup from "mediasoup";
import { injectable, inject } from "inversify";
import { TYPES } from "@/common/di/types";
import { ServerContext } from "@/common";
import {
  DetectedObjectDto,
  DetectionSettingsDto,
  DetectionModelType,
  DetectionSessionDto,
  DetectionResultDto
} from "../dto";

// Internal interface for detection session with Map (can't serialize Maps to JSON)
interface DetectionSessionInternal {
  clientId: string;
  roomId: string;
  settings: DetectionSettingsDto;
  recentDetections: DetectedObjectDto[];
  isActive: boolean;
  lastProcessedFrame: number;
  trackingHistory: Map<string, DetectedObjectDto[]>; // objectId -> history
}

@injectable()
export class DetectionService {
  private detectionSessions = new Map<string, DetectionSessionInternal>(); // clientId -> DetectionSession
  private modelCache = new Map<DetectionModelType, any>(); // Cache loaded AI models

  constructor(@inject(TYPES.ServerContext) private readonly context: ServerContext) {
    this.initializeModels();
  }

  async startDetectionStream(client: Client, rtpParameters: mediasoup.types.RtpParameters, settings?: Partial<DetectionSettingsDto>): Promise<string> {
    if (!client.upstreamTransport) {
      throw new Error("No upstream transport available");
    }

    // Create producer for detection-enhanced video stream
    const producerId = await client.upstreamTransport.produce({
      kind: "video",
      rtpParameters,
    });

    client.addProducer("detection", producerId);

    // Initialize detection session
    if (client.room) {
      const defaultSettings: DetectionSettingsDto = {
        enabledModels: [DetectionModelType.FACE, DetectionModelType.HAND, DetectionModelType.OBJECT],
        confidenceThreshold: 0.7,
        maxObjectsPerFrame: 10,
        processingInterval: 100, // Process every 100ms
        enableTracking: true,
        ...settings
      };

      const session: DetectionSessionInternal = {
        clientId: client.socket.id,
        roomId: client.room.roomName,
        settings: defaultSettings,
        recentDetections: [],
        isActive: true,
        lastProcessedFrame: 0,
        trackingHistory: new Map()
      };

      this.detectionSessions.set(client.socket.id, session);

      // Start processing pipeline
      this.startDetectionPipeline(session);
    }

    console.log(`AI detection stream started for client ${client.socket.id}`);
    return producerId.id;
  }

  async processVideoFrame(clientId: string, frameData: ArrayBuffer, frameId: string): Promise<DetectionResultDto> {
    const session = this.detectionSessions.get(clientId);
    if (!session || !session.isActive) {
      throw new Error("Detection session not found or inactive");
    }

    const startTime = Date.now();
    const detectedObjects: DetectedObjectDto[] = [];

    try {
      // Process frame with enabled models
      for (const model of session.settings.enabledModels) {
        const modelResults = await this.runDetectionModel(model, frameData, frameId);
        detectedObjects.push(...modelResults);
      }

      // Filter by confidence threshold
      const filteredObjects = detectedObjects.filter(
        obj => obj.confidence >= session.settings.confidenceThreshold
      );

      // Limit max objects per frame
      const finalObjects = filteredObjects
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, session.settings.maxObjectsPerFrame);

      // Update tracking if enabled
      if (session.settings.enableTracking) {
        this.updateObjectTracking(session, finalObjects);
      }

      // Update session state
      session.recentDetections = finalObjects;
      session.lastProcessedFrame = Date.now();

      const result: DetectionResultDto = {
        frameId,
        objects: finalObjects,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      };

      // Broadcast detection results
      this.broadcastDetectionResults(session.roomId, clientId, result);

      return result;

    } catch (error) {
      console.error('Detection processing error:', error);
      throw error;
    }
  }

  private async runDetectionModel(model: DetectionModelType, frameData: ArrayBuffer, frameId: string): Promise<DetectedObjectDto[]> {
    // This is where you'd integrate with actual AI models
    // Examples: TensorFlow.js, ONNX.js, or external APIs

    const mockResults: DetectedObjectDto[] = [];

    switch (model) {
      case DetectionModelType.FACE:
        // Mock face detection
        mockResults.push({
          id: `face_${frameId}_1`,
          label: 'face',
          confidence: 0.95,
          boundingBox: { x: 100, y: 50, width: 120, height: 120 },
          landmarks: [
            { x: 140, y: 80 }, // left eye
            { x: 180, y: 80 }, // right eye
            { x: 160, y: 100 }, // nose
            { x: 160, y: 140 }  // mouth
          ],
          attributes: { age: 25, gender: 'male', emotion: 'happy' },
          timestamp: Date.now(),
          frameId
        });
        break;

      case DetectionModelType.HAND:
        // Mock hand detection
        mockResults.push({
          id: `hand_${frameId}_1`,
          label: 'hand',
          confidence: 0.85,
          boundingBox: { x: 200, y: 200, width: 80, height: 100 },
          landmarks: [
            { x: 220, y: 220 }, // thumb
            { x: 240, y: 210 }, // index
            { x: 260, y: 205 }, // middle
            { x: 270, y: 210 }, // ring
            { x: 275, y: 220 }  // pinky
          ],
          attributes: { gesture: 'peace', handedness: 'right' },
          timestamp: Date.now(),
          frameId
        });
        break;

      case DetectionModelType.OBJECT:
        // Mock object detection
        mockResults.push({
          id: `object_${frameId}_1`,
          label: 'laptop',
          confidence: 0.88,
          boundingBox: { x: 50, y: 300, width: 200, height: 120 },
          attributes: { brand: 'unknown', color: 'silver' },
          timestamp: Date.now(),
          frameId
        });
        break;
    }

    return mockResults;
  }

  private updateObjectTracking(session: DetectionSessionInternal, currentObjects: DetectedObjectDto[]): void {
    // Simple tracking based on overlap and label matching
    for (const obj of currentObjects) {
      const trackingKey = obj.label;
      if (!session.trackingHistory.has(trackingKey)) {
        session.trackingHistory.set(trackingKey, []);
      }

      const history = session.trackingHistory.get(trackingKey)!;
      history.push(obj);

      // Keep only recent history (last 10 detections)
      if (history.length > 10) {
        history.shift();
      }
    }
  }

  private startDetectionPipeline(session: DetectionSessionInternal): void {
    // This would typically involve setting up frame extraction from the video stream
    // For now, this is a placeholder for the processing pipeline
    console.log(`Detection pipeline started for client ${session.clientId}`);
  }

  private async initializeModels(): Promise<void> {
    // Initialize AI models (TensorFlow.js, ONNX.js, etc.)
    // This is where you'd load pre-trained models
    console.log('Initializing AI detection models...');

    // Example: Load face detection model
    // const faceModel = await tf.loadLayersModel('/models/face-detection.json');
    // this.modelCache.set(DetectionModelType.FACE, faceModel);
  }

  updateDetectionSettings(clientId: string, settings: Partial<DetectionSettingsDto>): void {
    const session = this.detectionSessions.get(clientId);
    if (session) {
      session.settings = { ...session.settings, ...settings };
      console.log(`Detection settings updated for client ${clientId}`);
    }
  }

  private broadcastDetectionResults(roomId: string, clientId: string, result: DetectionResultDto): void {
    // Broadcast detection results to all clients in room
    this.context.io.to(roomId).emit('detection-results', {
      clientId,
      result
    });
  }

  getDetectionHistory(clientId: string): DetectedObjectDto[] {
    const session = this.detectionSessions.get(clientId);
    return session ? session.recentDetections : [];
  }

  getTrackingHistory(clientId: string, objectLabel: string): DetectedObjectDto[] {
    const session = this.detectionSessions.get(clientId);
    return session?.trackingHistory.get(objectLabel) || [];
  }

  // Clean up when client leaves
  handleClientLeave(clientId: string): void {
    const session = this.detectionSessions.get(clientId);
    if (session) {
      session.isActive = false;
      this.detectionSessions.delete(clientId);
      console.log(`Detection session cleaned up for client ${clientId}`);
    }
  }

  // Stop detection for a client
  stopDetection(clientId: string): void {
    const session = this.detectionSessions.get(clientId);
    if (session) {
      session.isActive = false;
      console.log(`Detection stopped for client ${clientId}`);
    }
  }
}

// Singleton export removed - use DI container instead
