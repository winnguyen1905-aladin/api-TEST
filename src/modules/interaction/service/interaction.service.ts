import { Client } from "@/modules/room/domain/client.domain";
import * as mediasoup from "mediasoup";
import { injectable, inject } from "inversify";
import { TYPES } from "@/common/di/types";
import { DrawingService } from "./drawing.service";
import { ARService } from "./ar.service";
import { DetectionService } from "./detection.service";
import {
  DrawingEventDto,
  DrawingStateDto,
  AddAR3DObjectRequestDto,
  AR3DObjectDto,
  DetectionSettingsDto,
  DetectionResultDto,
  DetectedObjectDto
} from "../dto";

@injectable()
export class InteractionService {
  constructor(
    @inject(TYPES.DrawingService) private readonly drawingService: DrawingService,
    @inject(TYPES.ARService) private readonly arService: ARService,
    @inject(TYPES.DetectionService) private readonly detectionService: DetectionService
  ) { }

  // Drawing Methods
  async startDrawing(client: Client, rtpParameters: mediasoup.types.RtpParameters): Promise<string> {
    return this.drawingService.startDrawingStream(client, rtpParameters);
  }

  handleDrawingEvent(client: Client, event: DrawingEventDto): void {
    this.drawingService.handleDrawingEvent(client, event);
  }

  getDrawingState(roomId?: string): DrawingStateDto | undefined {
    return roomId ? this.drawingService.getDrawingState(roomId) : undefined;
  }

  // AR Methods
  async startAR(client: Client, rtpParameters: mediasoup.types.RtpParameters): Promise<string> {
    return this.arService.startARStream(client, rtpParameters);
  }

  addAR3DObject(client: Client, object: AddAR3DObjectRequestDto): string {
    return this.arService.addAR3DObject(client, object);
  }

  updateAR3DObject(client: Client, objectId: string, updates: Partial<AR3DObjectDto>): void {
    this.arService.updateAR3DObject(client, objectId, updates);
  }

  removeAR3DObject(client: Client, objectId: string): void {
    this.arService.removeAR3DObject(client, objectId);
  }

  getRoomARObjects(roomId?: string): AR3DObjectDto[] {
    return roomId ? this.arService.getRoomARObjects(roomId) : [];
  }

  // Detection Methods
  async startDetection(client: Client, rtpParameters: mediasoup.types.RtpParameters, settings?: Partial<DetectionSettingsDto>): Promise<string> {
    return this.detectionService.startDetectionStream(client, rtpParameters, settings);
  }

  async processDetectionFrame(clientId: string, frameData: ArrayBuffer, frameId: string): Promise<DetectionResultDto> {
    return this.detectionService.processVideoFrame(clientId, frameData, frameId);
  }

  updateDetectionSettings(clientId: string, settings: Partial<DetectionSettingsDto>): void {
    this.detectionService.updateDetectionSettings(clientId, settings);
  }

  getDetectionHistory(clientId: string): DetectedObjectDto[] {
    return this.detectionService.getDetectionHistory(clientId);
  }

  stopDetection(clientId: string): void {
    this.detectionService.stopDetection(clientId);
  }

  // General cleanup
  handleClientDisconnect(client: Client): void {
    if (client.room) {
      this.drawingService.handleClientLeave(client.room.roomName, client.socket.id);
      this.arService.handleClientLeave(client.socket.id, client.room.roomName);
    }
    this.detectionService.handleClientLeave(client.socket.id);
  }
}
