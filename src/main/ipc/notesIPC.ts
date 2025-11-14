import { ipcMain } from 'electron';
import { NotesManager } from '../services/NotesManager';
import { OCRService } from '../services/OCRService';

let notesManager: NotesManager | null = null;
let ocrService: OCRService | null = null;

export function initializeNotesIPC(): void {
  // 初始化服务
  notesManager = new NotesManager({
    storagePath: './data/notes',
    autoSave: true,
    backupEnabled: true
  });

  ocrService = new OCRService({
    defaultLanguage: 'chi_sim+eng',
    maxWorkers: 2
  });

  // 监听事件并转发到渲染进程
  notesManager.on('notes:imported', (data) => {
    // 需要获取所有窗口并广播事件
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('notes:imported', data);
    });
  });

  notesManager.on('notes:exported', (data) => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('notes:exported', data);
    });
  });

  notesManager.on('error', (error) => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('notes:error', { message: error.message });
    });
  });

  // 笔记管理 IPC 处理
  ipcMain.handle('notes:import', async (_event, filePath: string, format?: string) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return await notesManager.importNotes(filePath, format);
  });

  ipcMain.handle('notes:getAllBooks', async () => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.getAllBooks();
  });

  ipcMain.handle('notes:getBookByTitle', async (_event, title: string) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.getBook(title);
  });

  ipcMain.handle('notes:deleteBook', async (_event, title: string) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.deleteBook(title);
  });

  ipcMain.handle('notes:updateNote', async (_event, noteId: string, updates: any) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.updateNote(noteId, updates);
  });

  ipcMain.handle('notes:deleteNote', async (_event, noteId: string) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.deleteNote(noteId);
  });

  ipcMain.handle('notes:exportBook', async (_event, title: string, format: string, _filePath: string) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.exportNotes(title, format);
  });

  ipcMain.handle('notes:getStatistics', async () => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.getStatistics();
  });

  ipcMain.handle('notes:search', async (_event, query: string) => {
    if (!notesManager) throw new Error('NotesManager not initialized');
    return notesManager.searchNotes(query);
  });

  // OCR服务 IPC 处理
  ipcMain.handle('ocr:processImage', async (_event, imagePath: string) => {
    if (!ocrService) throw new Error('OCRService not initialized');
    const result = await ocrService.recognizeImage(imagePath);
    return result.text;
  });

  ipcMain.handle('ocr:processImageFromData', async (_event, imageData: ArrayBuffer, _mimeType: string) => {
    if (!ocrService) throw new Error('OCRService not initialized');
    const result = await ocrService.recognizeFromBuffer(Buffer.from(imageData));
    return result.text;
  });

  // 初始化存储
  notesManager.loadFromStorage().catch(console.error);
}

export function cleanupNotesIPC(): void {
  if (ocrService) {
    ocrService.terminate();
    ocrService = null;
  }
  notesManager = null;
}