// ========== GENERAL INTERACTION DTOs ==========

import { ARCapabilitiesDto } from "./ar.dto";
import { DetectionCapabilitiesDto } from "./detection.dto";
import { DrawingCapabilitiesDto } from "./drawing.dto";

// ========== INTERACTION CAPABILITIES DTOs ==========

export interface InteractionCapabilitiesDto {
  drawing: boolean;
  ar: boolean;
  detection: boolean;
  supportedDetectionModels: string[];
  supportedARPrimitives: string[];
  maxARObjects: number;
  maxDrawingStrokes: number;
  detailedCapabilities?: {
    drawing?: DrawingCapabilitiesDto;
    ar?: ARCapabilitiesDto;
    detection?: DetectionCapabilitiesDto;
  };
}

// ========== ERROR DTOs ==========

export type InteractionErrorType =
  | 'drawing-start-failed'
  | 'drawing-event-failed'
  | 'drawing-state-failed'
  | 'ar-start-failed'
  | 'ar-object-add-failed'
  | 'ar-object-update-failed'
  | 'ar-object-remove-failed'
  | 'ar-objects-failed'
  | 'detection-start-failed'
  | 'frame-process-failed'
  | 'detection-settings-failed'
  | 'detection-history-failed'
  | 'detection-stop-failed'
  | 'client-not-found'
  | 'room-not-found'
  | 'insufficient-permissions'
  | 'rate-limit-exceeded'
  | 'feature-not-available';

export interface InteractionErrorDto {
  type: InteractionErrorType;
  message: string;
  details?: any;
  timestamp: number;
}

// ========== SUCCESS RESPONSE DTOs ==========

export interface InteractionSuccessDto {
  success: boolean;
  message?: string;
  data?: any;
}

// ========== CLIENT STATUS DTOs ==========

export interface ClientInteractionStatusDto {
  clientId: string;
  roomId: string;
  activeFeatures: {
    drawing: boolean;
    ar: boolean;
    detection: boolean;
  };
  resourceUsage: {
    drawingStrokes: number;
    arObjects: number;
    detectionFps: number;
  };
}

// ========== ROOM INTERACTION STATUS DTOs ==========

export interface RoomInteractionStatusDto {
  roomId: string;
  clientCount: number;
  totalDrawingStrokes: number;
  totalARObjects: number;
  activeDetectionClients: number;
  lastActivity: number;
}

// ========== DISCONNECT HANDLING DTOs ==========

export interface DisconnectCleanupDto {
  clientId: string;
  roomId: string;
  cleanedResources: {
    drawingStrokes: number;
    arObjects: number;
    detectionSessions: number;
  };
}
