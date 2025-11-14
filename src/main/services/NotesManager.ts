import { BookNote, ParsedBookData, NoteParser, MarkdownFormatter } from '../../shared/types/notes';
import { DuokanParser } from '../parsers/DuokanParser';
import { WeChatParser } from '../parsers/WeChatParser';
import { DefaultMarkdownFormatter } from '../formatters/MarkdownFormatter';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface NotesManagerConfig {
  storagePath?: string;
  autoSave?: boolean;
  backupEnabled?: boolean;
}

export interface NotesManagerEvents {
  'notes:imported': { bookTitle: string; noteCount: number };
  'notes:exported': { format: string; filePath: string };
  'notes:deleted': { noteId: string };
  'notes:updated': { noteId: string };
  'error': { message: string; error: Error };
}

export class NotesManager extends EventEmitter {
  private parsers: Map<string, NoteParser> = new Map();
  private formatters: Map<string, MarkdownFormatter> = new Map();
  private notes: Map<string, BookNote> = new Map();
  private books: Map<string, ParsedBookData> = new Map();
  private config: NotesManagerConfig;

  constructor(config: NotesManagerConfig = {}) {
    super();
    this.config = {
      storagePath: config.storagePath || './data/notes',
      autoSave: config.autoSave !== false,
      backupEnabled: config.backupEnabled !== false
    };
    
    this.initializeParsers();
    this.initializeFormatters();
  }

  private initializeParsers(): void {
    const duokanParser = new DuokanParser();
    const wechatParser = new WeChatParser();
    
    this.parsers.set('duokan', duokanParser);
    this.parsers.set('wechat', wechatParser);
  }

  private initializeFormatters(): void {
    const markdownFormatter = new DefaultMarkdownFormatter();
    this.formatters.set('markdown', markdownFormatter);
    this.formatters.set('default', markdownFormatter);
  }

  async importNotes(filePath: string, parserType?: string): Promise<ParsedBookData> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parser = this.getParser(fileContent, parserType);
      
      if (!parser) {
        throw new Error('No suitable parser found for this file format');
      }

      const parsedData = await parser.parse(fileContent);
      
      this.storeParsedData(parsedData);
      
      this.emit('notes:imported', {
        bookTitle: parsedData.metadata.title,
        noteCount: parsedData.notes.length
      });

      if (this.config.autoSave) {
        await this.saveToStorage(parsedData);
      }

      return parsedData;
    } catch (error) {
      this.emit('error', {
        message: 'Failed to import notes',
        error: error as Error
      });
      throw error;
    }
  }

  async exportNotes(
    bookTitle: string, 
    format: string = 'markdown', 
    options: any = {}
  ): Promise<string> {
    try {
      const book = this.books.get(bookTitle);
      if (!book) {
        throw new Error(`Book "${bookTitle}" not found`);
      }

      const formatter = this.formatters.get(format);
      if (!formatter) {
        throw new Error(`Formatter "${format}" not found`);
      }

      const markdownContent = formatter.formatBook(book, options);
      
      const fileName = `${this.sanitizeFileName(bookTitle)}_${new Date().getTime()}.md`;
      const filePath = path.join(this.config.storagePath || './exports', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, markdownContent, 'utf-8');

      this.emit('notes:exported', { format, filePath });
      return filePath;
    } catch (error) {
      this.emit('error', {
        message: 'Failed to export notes',
        error: error as Error
      });
      throw error;
    }
  }

  async exportAllNotes(format: string = 'markdown', options: any = {}): Promise<string[]> {
    const exportPaths: string[] = [];
    
    for (const [bookTitle] of this.books) {
      try {
        const filePath = await this.exportNotes(bookTitle, format, options);
        exportPaths.push(filePath);
      } catch (error) {
        console.error(`Failed to export notes for book "${bookTitle}":`, error);
      }
    }

    return exportPaths;
  }

  getAllBooks(): ParsedBookData[] {
    return Array.from(this.books.values());
  }

  getBook(bookTitle: string): ParsedBookData | undefined {
    return this.books.get(bookTitle);
  }

  getAllNotes(): BookNote[] {
    return Array.from(this.notes.values());
  }

  getNotesByBook(bookTitle: string): BookNote[] {
    const book = this.books.get(bookTitle);
    return book ? book.notes : [];
  }

  getNoteById(noteId: string): BookNote | undefined {
    return this.notes.get(noteId);
  }

  updateNote(noteId: string, updates: Partial<BookNote>): boolean {
    const note = this.notes.get(noteId);
    if (!note) {
      return false;
    }

    const updatedNote = { ...note, ...updates, updatedAt: new Date() };
    this.notes.set(noteId, updatedNote);

    const book = this.books.get(note.bookTitle);
    if (book) {
      const noteIndex = book.notes.findIndex(n => n.id === noteId);
      if (noteIndex !== -1) {
        book.notes[noteIndex] = updatedNote;
      }
    }

    this.emit('notes:updated', { noteId });
    return true;
  }

  deleteNote(noteId: string): boolean {
    const note = this.notes.get(noteId);
    if (!note) {
      return false;
    }

    this.notes.delete(noteId);

    const book = this.books.get(note.bookTitle);
    if (book) {
      book.notes = book.notes.filter(n => n.id !== noteId);
      book.metadata.totalNotes = book.notes.length;
    }

    this.emit('notes:deleted', { noteId });
    return true;
  }

  deleteBook(bookTitle: string): boolean {
    const book = this.books.get(bookTitle);
    if (!book) {
      return false;
    }

    book.notes.forEach(note => {
      this.notes.delete(note.id);
    });

    this.books.delete(bookTitle);
    return true;
  }

  searchNotes(query: string): BookNote[] {
    const results: BookNote[] = [];
    const searchTerm = query.toLowerCase();

    for (const note of this.notes.values()) {
      if (
        note.content.toLowerCase().includes(searchTerm) ||
        note.bookTitle.toLowerCase().includes(searchTerm) ||
        (note.chapter && note.chapter.toLowerCase().includes(searchTerm)) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      ) {
        results.push(note);
      }
    }

    return results;
  }

  getStatistics(): {
    totalBooks: number;
    totalNotes: number;
    notesBySource: Record<string, number>;
    notesByType: Record<string, number>;
  } {
    const stats = {
      totalBooks: this.books.size,
      totalNotes: this.notes.size,
      notesBySource: {} as Record<string, number>,
      notesByType: {} as Record<string, number>
    };

    for (const note of this.notes.values()) {
      stats.notesBySource[note.source] = (stats.notesBySource[note.source] || 0) + 1;
      stats.notesByType[note.noteType] = (stats.notesByType[note.noteType] || 0) + 1;
    }

    return stats;
  }

  private getParser(content: string, parserType?: string): NoteParser | undefined {
    if (parserType) {
      return this.parsers.get(parserType);
    }

    for (const parser of this.parsers.values()) {
      if (parser.validate(content)) {
        return parser;
      }
    }

    return undefined;
  }

  private storeParsedData(data: ParsedBookData): void {
    // 处理重复书籍标题的情况
    let bookTitle = data.metadata.title;
    let counter = 1;
    while (this.books.has(bookTitle)) {
      bookTitle = `${data.metadata.title}_${counter}`;
      counter++;
    }
    
    // 更新数据中的标题
    const updatedData = {
      ...data,
      metadata: {
        ...data.metadata,
        title: bookTitle
      },
      notes: data.notes.map(note => ({
        ...note,
        bookTitle
      }))
    };
    
    this.books.set(bookTitle, updatedData);
    
    // 处理重复笔记ID的情况
    updatedData.notes.forEach(note => {
      let noteId = note.id;
      let counter = 1;
      while (this.notes.has(noteId)) {
        noteId = `${note.id}_${counter}`;
        counter++;
      }
      
      const updatedNote = {
        ...note,
        id: noteId
      };
      
      this.notes.set(noteId, updatedNote);
      
      // 更新书籍数据中的笔记ID
      const book = this.books.get(bookTitle);
      if (book) {
        const noteIndex = book.notes.findIndex(n => n.id === note.id);
        if (noteIndex !== -1) {
          book.notes[noteIndex] = updatedNote;
        }
      }
    });
  }

  private async saveToStorage(data: ParsedBookData): Promise<void> {
    if (!this.config.storagePath) return;

    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      
      const fileName = `${this.sanitizeFileName(data.metadata.title)}.json`;
      const filePath = path.join(this.config.storagePath, fileName);
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save notes to storage:', error);
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }

  async loadFromStorage(): Promise<void> {
    if (!this.config.storagePath) return;

    try {
      const files = await fs.readdir(this.config.storagePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.storagePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          this.storeParsedData(data);
        }
      }
    } catch (error) {
      console.error('Failed to load notes from storage:', error);
    }
  }

  addParser(name: string, parser: NoteParser): void {
    this.parsers.set(name, parser);
  }

  addFormatter(name: string, formatter: MarkdownFormatter): void {
    this.formatters.set(name, formatter);
  }

  getParsers(): string[] {
    return Array.from(this.parsers.keys());
  }

  getFormatters(): string[] {
    return Array.from(this.formatters.keys());
  }
}