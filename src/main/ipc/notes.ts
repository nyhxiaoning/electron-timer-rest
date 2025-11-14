import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { NotesManager } from '../services/NotesManager';
import { OCRService } from '../services/OCRService';

let notesManager: NotesManager | null = null;
let ocrService: OCRService | null = null;

export function initializeNotesIPC(): void {
  // 初始化服务
  notesManager = new NotesManager({
    storagePath: path.join(app.getPath('userData'), 'notes'),
    autoSave: true,
    backupEnabled: true
  });

  ocrService = new OCRService({
    defaultLanguage: 'chi_sim+eng',
    maxWorkers: 2,
    cachePath: path.join(app.getPath('userData'), 'ocr-cache')
  });

  // 文件操作
  ipcMain.handle('notes:save-file', async (_, { path, content }) => {
    try {
      await fs.mkdir(path.dirname(path), { recursive: true });
      await fs.writeFile(path, content, 'utf-8');
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to save file: ${error}`);
    }
  });

  ipcMain.handle('notes:read-file', async (_, filePath) => {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  });

  ipcMain.handle('notes:select-file', async (_, options = {}) => {
    try {
      const properties: ('openFile' | 'multiSelections')[] = ['openFile'];
      if (options.multiSelections) {
        properties.push('multiSelections');
      }
      
      const result = await dialog.showOpenDialog({
        properties,
        filters: options.filters || [
          { name: 'All Supported', extensions: ['txt', 'json', 'xml', 'csv', 'md', 'png', 'jpg', 'jpeg', 'bmp', 'tiff'] },
          { name: 'Text Files', extensions: ['txt', 'json', 'xml', 'csv', 'md'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'tiff'] }
        ]
      });

      if (result.canceled) {
        return [];
      }

      return result.filePaths;
    } catch (error) {
      throw new Error(`Failed to select file: ${error}`);
    }
  });

  ipcMain.handle('notes:select-directory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });

      if (result.canceled) {
        return '';
      }

      return result.filePaths[0];
    } catch (error) {
      throw new Error(`Failed to select directory: ${error}`);
    }
  });

  // 笔记管理
  ipcMain.handle('notes:import', async (event, { filePath, parserType }) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      const result = await notesManager.importNotes(filePath, parserType);
      
      // 发送事件到渲染进程
      event.sender.send('notes:imported', {
        bookTitle: result.metadata.title,
        noteCount: result.notes.length
      });

      return result;
    } catch (error) {
      event.sender.send('notes:error', {
        message: 'Failed to import notes',
        error: error
      });
      throw error;
    }
  });

  ipcMain.handle('notes:export', async (event, { bookTitle, format, options }) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      const filePath = await notesManager.exportNotes(bookTitle, format, options);
      
      event.sender.send('notes:exported', {
        format,
        filePath
      });

      return filePath;
    } catch (error) {
      event.sender.send('notes:error', {
        message: 'Failed to export notes',
        error: error
      });
      throw error;
    }
  });

  ipcMain.handle('notes:get-all-books', async () => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.getAllBooks();
    } catch (error) {
      throw new Error(`Failed to get all books: ${error}`);
    }
  });

  ipcMain.handle('notes:get-book', async (_, bookTitle) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.getBook(bookTitle);
    } catch (error) {
      throw new Error(`Failed to get book: ${error}`);
    }
  });

  ipcMain.handle('notes:delete-book', async (_, bookTitle) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.deleteBook(bookTitle);
    } catch (error) {
      throw new Error(`Failed to delete book: ${error}`);
    }
  });

  ipcMain.handle('notes:update-note', async (_, { noteId, updates }) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.updateNote(noteId, updates);
    } catch (error) {
      throw new Error(`Failed to update note: ${error}`);
    }
  });

  ipcMain.handle('notes:delete-note', async (_, noteId) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.deleteNote(noteId);
    } catch (error) {
      throw new Error(`Failed to delete note: ${error}`);
    }
  });

  ipcMain.handle('notes:search', async (_, query) => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.searchNotes(query);
    } catch (error) {
      throw new Error(`Failed to search notes: ${error}`);
    }
  });

  ipcMain.handle('notes:get-statistics', async () => {
    if (!notesManager) {
      throw new Error('Notes manager not initialized');
    }

    try {
      return notesManager.getStatistics();
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error}`);
    }
  });

  // OCR 服务
  ipcMain.handle('ocr:process-image', async (_, { imagePath, options }) => {
    if (!ocrService) {
      throw new Error('OCR service not initialized');
    }

    try {
      await ocrService.initialize();
      return await ocrService.processBookScan(imagePath, options);
    } catch (error) {
      throw new Error(`Failed to process image: ${error}`);
    }
  });

  ipcMain.handle('ocr:batch-process-images', async (_, { imagePaths, options }) => {
    if (!ocrService) {
      throw new Error('OCR service not initialized');
    }

    try {
      await ocrService.initialize();
      return await ocrService.batchProcessImages(imagePaths, options);
    } catch (error) {
      throw new Error(`Failed to batch process images: ${error}`);
    }
  });
}

export function cleanupNotesIPC(): void {
  if (ocrService) {
    ocrService.terminate();
    ocrService = null;
  }
  
  if (notesManager) {
    notesManager.removeAllListeners('notes:imported');
    notesManager.removeAllListeners('notes:exported');
    notesManager.removeAllListeners('notes:error');
    notesManager = null;
  }
}