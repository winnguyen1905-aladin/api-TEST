import * as mediasoup from "mediasoup";

// ========== AR REQUEST/RESPONSE DTOs ==========

export interface StartARRequestDto {
  rtpParameters: mediasoup.types.RtpParameters;
}

export interface StartARResponseDto {
  producerId: string;
}

// ========== AR OBJECT DTOs ==========

export type AR3DObjectType = 'model' | 'primitive' | 'effect';
export type ARPrimitiveType = 'cube' | 'sphere' | 'cylinder';
export type ARAnimationType = 'rotate' | 'scale' | 'translate';

export interface Vector3Dto {
  x: number;
  y: number;
  z: number;
}

export interface ARMaterialDto {
  color?: string;
  texture?: string;
  opacity?: number;
}

export interface ARAnimationDto {
  type: ARAnimationType;
  duration: number;
  loop: boolean;
}

export interface AR3DObjectDto {
  id: string;
  type: AR3DObjectType;
  position: Vector3Dto;
  rotation: Vector3Dto;
  scale: Vector3Dto;
  modelUrl?: string; // For 3D models
  primitiveType?: ARPrimitiveType; // For basic shapes
  material: ARMaterialDto;
  animation?: ARAnimationDto;
  clientId: string;
  timestamp: number;
}

// ========== AR REQUEST DTOs ==========

export interface AddAR3DObjectRequestDto {
  type: AR3DObjectType;
  position: Vector3Dto;
  rotation: Vector3Dto;
  scale: Vector3Dto;
  modelUrl?: string;
  primitiveType?: ARPrimitiveType;
  material: ARMaterialDto;
  animation?: ARAnimationDto;
}

export interface UpdateAR3DObjectRequestDto {
  objectId: string;
  updates: Partial<AR3DObjectDto>;
}

export interface RemoveAR3DObjectRequestDto {
  objectId: string;
}

// ========== AR RESPONSE DTOs ==========

export interface AddAR3DObjectResponseDto {
  objectId: string;
}

export interface UpdateAR3DObjectResponseDto {
  objectId: string;
  success: boolean;
}

export interface RemoveAR3DObjectResponseDto {
  objectId: string;
  success: boolean;
}

export interface GetAR3DObjectsResponseDto {
  objects: AR3DObjectDto[];
}

// ========== AR MARKER DTOs ==========

export type ARMarkerType = 'face' | 'hand' | 'image' | 'surface';

export interface ARMarkerDto {
  id: string;
  type: ARMarkerType;
  position: Vector3Dto;
  confidence: number;
}

export interface UpdateARMarkersRequestDto {
  markers: ARMarkerDto[];
}

// ========== AR SESSION DTOs ==========

export interface ARSessionDto {
  clientId: string;
  roomId: string;
  objectCount: number;
  anchorPointCount: number;
  isActive: boolean;
}

// ========== AR EVENT DTOs ==========

export type AREventType = 'object-added' | 'object-updated' | 'object-removed' | 'markers-updated';

export interface AREventDto {
  type: AREventType;
  objectId?: string;
  object?: AR3DObjectDto;
  updates?: Partial<AR3DObjectDto>;
  clientId?: string;
  markers?: ARMarkerDto[];
}

// ========== AR CAPABILITIES DTOs ==========

export interface ARCapabilitiesDto {
  maxObjects: number;
  supportedPrimitives: ARPrimitiveType[];
  supportedMarkerTypes: ARMarkerType[];
  supportedAnimations: ARAnimationType[];
  maxModelSize: number; // in MB
}
