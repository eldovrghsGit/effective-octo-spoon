/**
 * Copilot Module Entry Point
 * 
 * This is the main entry point for the Copilot integration.
 * Import from this module to use Copilot features.
 * 
 * To remove Copilot from the app:
 * 1. Remove the import and calls in main.ts
 * 2. Remove this entire copilot folder
 * 3. Remove Copilot-related code from preload.ts
 * 4. Remove Copilot components from renderer
 * 
 * @module copilot
 */

export { registerCopilotHandlers, cleanupCopilot } from './copilot-ipc.js';
export { 
  initCopilot, 
  sendMessage, 
  getStatus, 
  stopCopilot,
  type CopilotMessage,
  type CopilotStatus,
} from './copilot-service.js';
