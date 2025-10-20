import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';

// Create and configure InversifyJS container
export const container = new Container();

// Helper function to get container instance (for compatibility)
export const getContainer = () => container;

// Export TYPES for backward compatibility
export { TYPES };
