/**
 * Copilot IPC Handlers
 *
 * Registers IPC handlers for Copilot communication between the
 * renderer and main processes. Supports init, messaging, settings,
 * and status queries.
 *
 * @module copilot-ipc
 */

import { ipcMain, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import {
  initCopilot,
  sendMessage,
  getStatus,
  getSettings,
  updateSettings,
  stopCopilot,
} from './copilot-service.js';

/**
 * Register all Copilot-related IPC handlers
 */
export function registerCopilotHandlers(
  database: Database.Database,
  getMainWindow: () => BrowserWindow | null,
): void {
  console.log('📡 Registering Copilot IPC handlers...');

  // Initialize Copilot
  ipcMain.handle('copilot:init', async () => {
    console.log('🤖 Initializing Copilot SDK...');
    const status = await initCopilot(database);
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

      // If this was a mutation, trigger UI refresh
      const lowerPrompt = prompt.toLowerCase();
      if (
        lowerPrompt.includes('create') ||
        lowerPrompt.includes('add') ||
        lowerPrompt.includes('update') ||
        lowerPrompt.includes('complete') ||
        lowerPrompt.includes('done') ||
        lowerPrompt.includes('delete')
      ) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('🔄 Triggering tasks refresh after AI action');
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

  // Get settings (safe, no secrets)
  ipcMain.handle('copilot:getSettings', () => {
    return getSettings();
  });

  // Update settings & reinitialise
  ipcMain.handle('copilot:updateSettings', async (_, newSettings: any) => {
    const status = await updateSettings(newSettings);
    return status;
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
