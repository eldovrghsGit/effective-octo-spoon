/**
 * Copilot IPC Handlers
 * 
 * This module registers IPC handlers for Copilot communication between
 * the renderer and main processes.
 * 
 * @module copilot-ipc
 */

import { ipcMain, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import {
  initCopilot,
  createCopilotSession,
  sendMessage,
  getStatus,
  stopCopilot,
} from './copilot-service.js';

/**
 * Register all Copilot-related IPC handlers
 */
export function registerCopilotHandlers(database: Database.Database, getMainWindow: () => BrowserWindow | null): void {
  console.log('📡 Registering Copilot IPC handlers...');

  // Initialize Copilot
  ipcMain.handle('copilot:init', async () => {
    console.log('🤖 Initializing Copilot...');
    const status = await initCopilot(database);
    
    if (status.isConnected) {
      // Auto-create session after initialization
      try {
        await createCopilotSession();
      } catch (error) {
        console.error('Failed to create initial session:', error);
      }
    }
    
    return status;
  });

  // Send message to Copilot
  ipcMain.handle('copilot:send', async (_, prompt: string) => {
    console.log('💬 Sending message to Copilot:', prompt.substring(0, 50) + '...');
    
    const mainWindow = getMainWindow();
    
    try {
      const response = await sendMessage(prompt, (delta: string) => {
        // Send streaming updates to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('copilot:delta', delta);
        }
      });
      
      // If this was a task creation, trigger UI refresh
      if (prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('add')) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('🔄 Triggering tasks refresh after creation');
          mainWindow.webContents.send('tasks:refresh');
        }
      }
      
      return { success: true, response };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Copilot error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // Get Copilot status
  ipcMain.handle('copilot:status', () => {
    return getStatus();
  });

  // Stop Copilot
  ipcMain.handle('copilot:stop', async () => {
    await stopCopilot();
    return { success: true };
  });

  console.log('✅ Copilot IPC handlers registered');
}

/**
 * Cleanup Copilot on app quit
 */
export async function cleanupCopilot(): Promise<void> {
  await stopCopilot();
}
