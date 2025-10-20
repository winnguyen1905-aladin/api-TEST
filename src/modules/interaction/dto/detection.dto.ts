import * as mediasoup from "mediasoup";

// ========== DETECTION REQUEST/RESPONSE DTOs ==========

export interface StartDetectionRequestDto {
  rtpParameters: mediasoup.types.RtpParameters;
  settings?: Partial<DetectionSettingsDto>;
}

export interface StartDetectionResponseDto {
  producerId: string;
}

// ========== DETECTION SETTINGS DTOs ==========

export enum DetectionModelType {
  FACE = 'face',
  HAND = 'hand',
  BODY = 'body',
  OBJECT = 'object',
  EMOTION = 'emotion',
  GESTURE = 'gesture'
}

export interface DetectionSettingsDto {
  enabledModels: DetectionModelType[];
  confidenceThreshold: number;
  maxObjectsPerFrame: number;
  processingInterval: number; // milliseconds between detections
  enableTracking: boolean; // Track objects across frames
}

export interface UpdateDetectionSettingsRequestDto {
  settings: Partial<DetectionSettingsDto>;
}

export interface UpdateDetectionSettingsResponseDto {
  success: boolean;
}

// ========== DETECTION OBJECT DTOs ==========

export interface BoundingBoxDto {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LandmarkDto {
  x: number;
  y: number;
}

export interface DetectedObjectDto {
  id: string;
  label: string;
  confidence: number;
  boundingBox: BoundingBoxDto;
  landmarks?: LandmarkDto[]; // For face/hand detection
  attributes?: { [key: string]: any }; // Additional properties
  timestamp: number;
  frameId: string;
}

// ========== DETECTION PROCESSING DTOs ==========

export interface ProcessFrameRequestDto {
  frameData: ArrayBuffer;
  frameId: string;
}

export interface DetectionResultDto {
  frameId: string;
  objects: DetectedObjectDto[];
  processingTime: number;
  timestamp: number;
}

export interface ProcessFrameResponseDto extends DetectionResultDto { }

// ========== DETECTION HISTORY DTOs ==========

export interface GetDetectionHistoryResponseDto {
  recentDetections: DetectedObjectDto[];
  totalProcessedFrames: number;
  averageProcessingTime: number;
}

export interface GetTrackingHistoryRequestDto {
  objectLabel: string;
}

export interface GetTrackingHistoryResponseDto {
  objectLabel: string;
  detections: DetectedObjectDto[];
}

// ========== DETECTION SESSION DTOs ==========

export interface DetectionSessionDto {
  clientId: string;
  roomId: string;
  settings: DetectionSettingsDto;
  isActive: boolean;
  lastProcessedFrame: number;
  totalDetections: number;
}

// ========== DETECTION EVENT DTOs ==========

export interface DetectionEventDto {
  clientId: string;
  result: DetectionResultDto;
}

// ========== STOP DETECTION DTOs ==========

export interface StopDetectionResponseDto {
  success: boolean;
}

// ========== DETECTION CAPABILITIES DTOs ==========

export interface DetectionCapabilitiesDto {
  supportedModels: DetectionModelType[];
  maxFrameSize: { width: number; height: number };
  maxProcessingFps: number;
  supportedFormats: string[];
  modelAccuracy: { [key in DetectionModelType]?: number };
}
