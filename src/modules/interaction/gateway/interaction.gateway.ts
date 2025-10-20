import { inject } from 'inversify';
import { TYPES } from '@/common/di/types';
import { Gateway, On, ConnectedSocket, MessageBody } from '@/common/decorators/ws-decorators';
import { AuthenticatedSocket, ServerContext } from '@/common';
import { InteractionService } from '../service/interaction.service';
import {
  StartDrawingRequestDto,
  StartDrawingResponseDto,
  DrawingEventDto,
  DrawingStateDto,
  StartARRequestDto,
  StartARResponseDto,
  AddAR3DObjectRequestDto,
  AddAR3DObjectResponseDto,
  UpdateAR3DObjectRequestDto,
  UpdateAR3DObjectResponseDto,
  RemoveAR3DObjectRequestDto,
  RemoveAR3DObjectResponseDto,
  AR3DObjectDto,
  StartDetectionRequestDto,
  StartDetectionResponseDto,
  ProcessFrameRequestDto,
  DetectionResultDto,
  UpdateDetectionSettingsRequestDto,
  UpdateDetectionSettingsResponseDto,
  GetDetectionHistoryResponseDto,
  StopDetectionResponseDto,
  InteractionCapabilitiesDto
} from '../dto';

@Gateway('/interaction')
export class InteractionGateway {
  constructor(
    @inject(TYPES.ServerContext) private readonly context: ServerContext,
    @inject(TYPES.InteractionService) private readonly interactionService: InteractionService
  ) { }

  // ========== DRAWING HANDLERS ==========

  @On('start-drawing')
  async handleStartDrawing(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: StartDrawingRequestDto
  ): Promise<StartDrawingResponseDto> {
    const client = this.getClientFromSocket(socket);
    const producerId = await this.interactionService.startDrawing(client, data.rtpParameters);
    return { producerId };
  }

  @On('drawing-event')
  handleDrawingEvent(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() event: DrawingEventDto
  ): void {
    const client = this.getClientFromSocket(socket);
    this.interactionService.handleDrawingEvent(client, event);
  }

  @On('get-drawing-state')
  getDrawingState(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): DrawingStateDto | undefined {
    const client = this.getClientFromSocket(socket);
    return this.interactionService.getDrawingState(client.room?.roomName);
  }

  // ========== AR HANDLERS ==========

  @On('start-ar')
  async handleStartAR(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: StartARRequestDto
  ): Promise<StartARResponseDto> {
    const client = this.getClientFromSocket(socket);
    const producerId = await this.interactionService.startAR(client, data.rtpParameters);
    return { producerId };
  }

  @On('add-ar-object')
  addARObject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: AddAR3DObjectRequestDto
  ): AddAR3DObjectResponseDto {
    const client = this.getClientFromSocket(socket);
    const objectId = this.interactionService.addAR3DObject(client, data);
    return { objectId };
  }

  @On('update-ar-object')
  updateARObject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: UpdateAR3DObjectRequestDto
  ): UpdateAR3DObjectResponseDto {
    const client = this.getClientFromSocket(socket);
    this.interactionService.updateAR3DObject(client, data.objectId, data.updates);
    return { objectId: data.objectId, success: true };
  }

  @On('remove-ar-object')
  removeARObject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: RemoveAR3DObjectRequestDto
  ): RemoveAR3DObjectResponseDto {
    const client = this.getClientFromSocket(socket);
    this.interactionService.removeAR3DObject(client, data.objectId);
    return { objectId: data.objectId, success: true };
  }

  @On('get-ar-objects')
  getARObjects(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): AR3DObjectDto[] {
    const client = this.getClientFromSocket(socket);
    return this.interactionService.getRoomARObjects(client.room?.roomName);
  }

  // ========== DETECTION HANDLERS ==========

  @On('start-detection')
  async handleStartDetection(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: StartDetectionRequestDto
  ): Promise<StartDetectionResponseDto> {
    const client = this.getClientFromSocket(socket);
    const producerId = await this.interactionService.startDetection(client, data.rtpParameters, data.settings);
    return { producerId };
  }

  @On('process-frame')
  async processDetectionFrame(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: ProcessFrameRequestDto
  ): Promise<DetectionResultDto> {
    const client = this.getClientFromSocket(socket);
    return await this.interactionService.processDetectionFrame(client.socket.id, data.frameData, data.frameId);
  }

  @On('update-detection-settings')
  updateDetectionSettings(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: UpdateDetectionSettingsRequestDto
  ): UpdateDetectionSettingsResponseDto {
    const client = this.getClientFromSocket(socket);
    this.interactionService.updateDetectionSettings(client.socket.id, data.settings);
    return { success: true };
  }

  @On('get-detection-history')
  getDetectionHistory(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): GetDetectionHistoryResponseDto {
    const client = this.getClientFromSocket(socket);
    const recentDetections = this.interactionService.getDetectionHistory(client.socket.id);
    return {
      recentDetections,
      totalProcessedFrames: recentDetections.length,
      averageProcessingTime: 0 // TODO: Calculate from detection service
    };
  }

  @On('stop-detection')
  stopDetection(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): StopDetectionResponseDto {
    const client = this.getClientFromSocket(socket);
    this.interactionService.stopDetection(client.socket.id);
    return { success: true };
  }

  // ========== GENERAL HANDLERS ==========

  @On('get-interaction-capabilities')
  getInteractionCapabilities(): InteractionCapabilitiesDto {
    return {
      drawing: true,
      ar: true,
      detection: true,
      supportedDetectionModels: ['face', 'hand', 'body', 'object', 'emotion', 'gesture'],
      supportedARPrimitives: ['cube', 'sphere', 'cylinder'],
      maxARObjects: 50,
      maxDrawingStrokes: 1000
    };
  }

  @On('disconnect')
  handleDisconnect(
    @ConnectedSocket() socket: AuthenticatedSocket
  ): void {
    try {
      const client = this.getClientFromSocket(socket);
      this.interactionService.handleClientDisconnect(client);
    } catch (error) {
      console.error('Error handling client disconnect:', error);
    }
  }

  // ========== HELPER METHODS ==========

  private getClientFromSocket(socket: AuthenticatedSocket): any {
    // This should extract the client from the socket
    // Implementation depends on your existing authentication/client management
    return (socket as any).client;
  }
}
