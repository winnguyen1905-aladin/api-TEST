import * as mediasoup from "mediasoup";

// ========== DRAWING REQUEST/RESPONSE DTOs ==========

export interface StartDrawingRequestDto {
  rtpParameters: mediasoup.types.RtpParameters;
}

export interface StartDrawingResponseDto {
  producerId: string;
}

// ========== DRAWING EVENT DTOs ==========

export type DrawingEventType = 'draw' | 'erase' | 'clear' | 'undo' | 'redo';

export interface DrawingEventDto {
  type: DrawingEventType;
  coordinates?: { x: number; y: number };
  brushSize?: number;
  color?: string;
  clientId: string;
  timestamp: number;
  roomId: string;
}

// ========== DRAWING DATA DTOs ==========

export interface DrawingStrokeDto {
  id: string;
  clientId: string;
  points: { x: number; y: number }[];
  brushSize: number;
  color: string;
  timestamp: number;
}

export interface DrawingStateDto {
  strokes: DrawingStrokeDto[];
  activeClients: string[]; // Array instead of Set for JSON serialization
}

export interface DrawingConfigDto {
  maxStrokes: number;
  maxPointsPerStroke: number;
  allowedColors: string[];
  minBrushSize: number;
  maxBrushSize: number;
}

// ========== DRAWING RESPONSE DTOs ==========

export interface DrawingCapabilitiesDto {
  maxStrokes: number;
  maxClients: number;
  supportedEvents: DrawingEventType[];
  allowedBrushSizes: { min: number; max: number };
}
