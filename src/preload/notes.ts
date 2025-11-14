import { contextBridge, ipcRenderer } from 'electron';

export interface NotesIPC {
  // 文件操作
  saveFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  selectFile: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
    multiSelections?: boolean;
  }) => Promise<string[]>;
  selectDirectory: () => Promise<string>;
  
  // 笔记管理
  importNotes: (filePath: string, parserType?: string) => Promise<any>;
  exportNotes: (bookTitle: string, format: string, options?: any) => Promise<string>;
  getAllBooks: () => Promise<any[]>;
  getBook: (bookTitle: string) => Promise<any>;
  deleteBook: (bookTitle: string) => Promise<boolean>;
  updateNote: (noteId: string, updates: any) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;
  searchNotes: (query: string) => Promise<any[]>;
  getStatistics: () => Promise<any>;
  
  // OCR 服务
  processImage: (imagePath: string, options?: any) => Promise<any>;
  batchProcessImages: (imagePaths: string[], options?: any) => Promise<any[]>;
  
  // 事件监听
  onNotesImported: (callback: (data: any) => void) => void;
  onNotesExported: (callback: (data: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

const notesAPI: NotesIPC = {
  // 文件操作
  saveFile: async (path: string, content: string) => {
    return await ipcRenderer.invoke('notes:save-file', { path, content });
  },
  
  readFile: async (path: string) => {
    return await ipcRenderer.invoke('notes:read-file', path);
  },
  
  selectFile: async (options = {}) => {
    return await ipcRenderer.invoke('notes:select-file', options);
  },
  
  selectDirectory: async () => {
    return await ipcRenderer.invoke('notes:select-directory');
  },
  
  // 笔记管理
  importNotes: async (filePath: string, parserType?: string) => {
    return await ipcRenderer.invoke('notes:import', { filePath, parserType });
  },
  
  exportNotes: async (bookTitle: string, format: string, options = {}) => {
    return await ipcRenderer.invoke('notes:export', { bookTitle, format, options });
  },
  
  getAllBooks: async () => {
    return await ipcRenderer.invoke('notes:get-all-books');
  },
  
  getBook: async (bookTitle: string) => {
    return await ipcRenderer.invoke('notes:get-book', bookTitle);
  },
  
  deleteBook: async (bookTitle: string) => {
    return await ipcRenderer.invoke('notes:delete-book', bookTitle);
  },
  
  updateNote: async (noteId: string, updates: any) => {
    return await ipcRenderer.invoke('notes:update-note', { noteId, updates });
  },
  
  deleteNote: async (noteId: string) => {
    return await ipcRenderer.invoke('notes:delete-note', noteId);
  },
  
  searchNotes: async (query: string) => {
    return await ipcRenderer.invoke('notes:search', query);
  },
  
  getStatistics: async () => {
    return await ipcRenderer.invoke('notes:get-statistics');
  },
  
  // OCR 服务
  processImage: async (imagePath: string, options = {}) => {
    return await ipcRenderer.invoke('ocr:process-image', { imagePath, options });
  },
  
  batchProcessImages: async (imagePaths: string[], options = {}) => {
    return await ipcRenderer.invoke('ocr:batch-process-images', { imagePaths, options });
  },
  
  // 事件监听
  onNotesImported: (callback: (data: any) => void) => {
    ipcRenderer.on('notes:imported', (_, data) => callback(data));
  },
  
  onNotesExported: (callback: (data: any) => void) => {
    ipcRenderer.on('notes:exported', (_, data) => callback(data));
  },
  
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on('notes:error', (_, error) => callback(error));
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

contextBridge.exposeInMainWorld('notesAPI', notesAPI);

export type NotesAPI = typeof notesAPI;