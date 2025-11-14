import { ipcRenderer } from 'electron';

export interface NotesAPI {
  // 笔记管理
  importNotes: (filePath: string, format?: string) => Promise<any>;
  getAllBooks: () => Promise<any[]>;
  getBookByTitle: (title: string) => Promise<any>;
  deleteBook: (title: string) => Promise<void>;
  updateNote: (noteId: string, updates: any) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  exportBook: (title: string, format: string, filePath: string) => Promise<string>;
  getStatistics: () => Promise<any>;
  searchNotes: (query: string) => Promise<any[]>;
  
  // OCR服务
  processImage: (imagePath: string) => Promise<string>;
  processImageFromData: (imageData: ArrayBuffer, mimeType: string) => Promise<string>;
  
  // 事件监听
  onNotesImported: (callback: (data: any) => void) => void;
  onNotesExported: (callback: (data: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
}

const notesAPI: NotesAPI = {
  // 笔记管理
  importNotes: (filePath: string, format?: string) => 
    ipcRenderer.invoke('notes:import', filePath, format),
  
  getAllBooks: () => 
    ipcRenderer.invoke('notes:getAllBooks'),
  
  getBookByTitle: (title: string) => 
    ipcRenderer.invoke('notes:getBookByTitle', title),
  
  deleteBook: (title: string) => 
    ipcRenderer.invoke('notes:deleteBook', title),
  
  updateNote: (noteId: string, updates: any) => 
    ipcRenderer.invoke('notes:updateNote', noteId, updates),
  
  deleteNote: (noteId: string) => 
    ipcRenderer.invoke('notes:deleteNote', noteId),
  
  exportBook: (title: string, format: string, filePath: string) => 
    ipcRenderer.invoke('notes:exportBook', title, format, filePath),
  
  getStatistics: () => 
    ipcRenderer.invoke('notes:getStatistics'),
  
  searchNotes: (query: string) => 
    ipcRenderer.invoke('notes:search', query),
  
  // OCR服务
  processImage: (imagePath: string) => 
    ipcRenderer.invoke('ocr:processImage', imagePath),
  
  processImageFromData: (imageData: ArrayBuffer, mimeType: string) => 
    ipcRenderer.invoke('ocr:processImageFromData', imageData, mimeType),
  
  // 事件监听
  onNotesImported: (callback: (data: any) => void) => {
    ipcRenderer.on('notes:imported', (_event, data) => callback(data));
  },
  
  onNotesExported: (callback: (data: any) => void) => {
    ipcRenderer.on('notes:exported', (_event, data) => callback(data));
  },
  
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on('notes:error', (_event, error) => callback(error));
  }
};

export default notesAPI;