export interface BookNote {
  id: string;
  bookTitle: string;
  bookAuthor?: string;
  noteType: 'highlight' | 'note' | 'bookmark';
  content: string;
  position?: number;
  location?: string;
  chapter?: string;
  createdAt: Date;
  updatedAt?: Date;
  tags?: string[];
  color?: string;
  source: 'duokan' | 'wechat' | 'manual' | 'ocr';
}

export interface BookMetadata {
  title: string;
  author?: string;
  isbn?: string;
  coverImage?: string;
  totalNotes: number;
  lastSyncDate?: Date;
}

export interface ParsedBookData {
  metadata: BookMetadata;
  notes: BookNote[];
  rawData?: any;
}

export interface NoteParser {
  name: string;
  supportedFormats: string[];
  parse(data: string | Buffer): Promise<ParsedBookData>;
  validate(data: string | Buffer): boolean;
}

export interface OCRResult {
  text: string;
  confidence: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MarkdownFormatter {
  format(notes: BookNote[], options?: FormatOptions): string;
  formatBook(data: ParsedBookData, options?: FormatOptions): string;
}

export interface FormatOptions {
  includeMetadata?: boolean;
  includeLocation?: boolean;
  includeTags?: boolean;
  groupByChapter?: boolean;
  sortBy?: 'position' | 'date' | 'chapter';
  template?: string;
}