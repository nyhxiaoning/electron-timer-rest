import { NoteParser, ParsedBookData, BookNote } from '../../shared/types/notes';

export class WeChatParser implements NoteParser {
  name = 'WeChat Reading Parser';
  supportedFormats = ['.txt', '.json', '.csv'];

  validate(data: string | Buffer): boolean {
    const content = data.toString();
    return content.includes('微信读书') || 
           content.includes('WeChat') || 
           content.includes('读书笔记') ||
           this.isValidWeChatFormat(content);
  }

  async parse(data: string | Buffer): Promise<ParsedBookData> {
    const content = data.toString();
    
    if (content.includes('微信读书') && content.includes('想法')) {
      return this.parseWeChatFormat(content);
    } else if (this.isValidJSON(content)) {
      return this.parseJSON(content);
    } else if (content.includes(',')) {
      return this.parseCSV(content);
    } else {
      return this.parsePlainText(content);
    }
  }

  private isValidWeChatFormat(content: string): boolean {
    return content.includes('微信读书') && 
           (content.includes('划线') || content.includes('想法') || content.includes('章节'));
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private parseWeChatFormat(content: string): ParsedBookData {
    const lines = content.split('\n').filter(line => line.trim());
    const notes: BookNote[] = [];
    
    let currentBookTitle = 'Unknown Book';
    let currentAuthor = '';
    let currentChapter = '';
    let noteIndex = 0;

    const titleMatch = content.match(/《([^》]+)》/);
    if (titleMatch) {
      currentBookTitle = titleMatch[1];
    }

    const authorMatch = content.match(/作者[:：]\s*([^\n]+)/);
    if (authorMatch) {
      currentAuthor = authorMatch[1].trim();
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('章节') || line.includes('第') && line.includes('章')) {
        currentChapter = line;
        continue;
      }
      
      if (line.includes('划线')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.includes('想法') && !nextLine.includes('章节')) {
          notes.push({
            id: `wechat_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: 'highlight',
            content: nextLine,
            chapter: currentChapter,
            position: i,
            createdAt: this.extractDate(line) || new Date(),
            source: 'wechat'
          });
          noteIndex++;
          i++;
        }
      }
      
      if (line.includes('想法')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.includes('划线') && !nextLine.includes('章节')) {
          notes.push({
            id: `wechat_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: 'note',
            content: nextLine,
            chapter: currentChapter,
            position: i,
            createdAt: this.extractDate(line) || new Date(),
            source: 'wechat'
          });
          noteIndex++;
          i++;
        }
      }
      
      if (line.includes('书签') || line.includes('位置')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine) {
          notes.push({
            id: `wechat_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: 'bookmark',
            content: nextLine,
            location: line,
            chapter: currentChapter,
            position: i,
            createdAt: this.extractDate(line) || new Date(),
            source: 'wechat'
          });
          noteIndex++;
          i++;
        }
      }
    }

    return {
      metadata: {
        title: currentBookTitle,
        author: currentAuthor,
        totalNotes: notes.length,
        lastSyncDate: new Date()
      },
      notes,
      rawData: content
    };
  }

  private parseJSON(content: string): ParsedBookData {
    const data = JSON.parse(content);
    const notes: BookNote[] = [];
    
    if (data.notes && Array.isArray(data.notes)) {
      data.notes.forEach((note: any, index: number) => {
        notes.push({
          id: `wechat_${index}_${Date.now()}`,
          bookTitle: data.bookTitle || note.bookTitle || 'Unknown Book',
          bookAuthor: data.author || note.author,
          noteType: this.mapNoteType(note.type || 'highlight'),
          content: note.content || note.text || '',
          position: note.position || note.location || index,
          location: note.location || note.page || '',
          chapter: note.chapter || note.section,
          createdAt: new Date(note.createdAt || note.date || Date.now()),
          color: note.color,
          source: 'wechat',
          tags: note.tags || []
        });
      });
    }

    return {
      metadata: {
        title: data.bookTitle || data.title || 'Unknown Book',
        author: data.author,
        totalNotes: notes.length,
        lastSyncDate: new Date()
      },
      notes,
      rawData: data
    };
  }

  private parseCSV(content: string): ParsedBookData {
    const lines = content.split('\n').filter(line => line.trim());
    const notes: BookNote[] = [];
    
    let currentBookTitle = 'Unknown Book';
    let currentAuthor = '';
    
    const headers = lines[0].split(',').map(h => h.trim());
    const hasHeaders = headers.some(h => 
      h.includes('内容') || h.includes('content') || 
      h.includes('章节') || h.includes('chapter')
    );
    
    const startIndex = hasHeaders ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let columns: string[] = [];
      
      // 处理CSV引号
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim());
      
      if (columns.length >= 2) {
        const contentIndex = headers.findIndex(h => h.includes('内容') || h.includes('content'));
        const chapterIndex = headers.findIndex(h => h.includes('章节') || h.includes('chapter'));
        const typeIndex = headers.findIndex(h => h.includes('类型') || h.includes('type'));
        
        const noteContent = columns[contentIndex >= 0 ? contentIndex : 0].replace(/^"|"$/g, '');
        const chapter = chapterIndex >= 0 ? columns[chapterIndex].replace(/^"|"$/g, '') : '';
        const noteType = typeIndex >= 0 ? this.mapNoteType(columns[typeIndex].replace(/^"|"$/g, '')) : 'highlight';
        
        if (noteContent) {
          notes.push({
            id: `wechat_csv_${i}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType,
            content: noteContent,
            chapter,
            position: i,
            createdAt: new Date(),
            source: 'wechat'
          });
        }
      }
    }

    return {
      metadata: {
        title: currentBookTitle,
        author: currentAuthor,
        totalNotes: notes.length,
        lastSyncDate: new Date()
      },
      notes,
      rawData: content
    };
  }

  private parsePlainText(content: string): ParsedBookData {
    const lines = content.split('\n').filter(line => line.trim());
    const notes: BookNote[] = [];
    
    let currentBookTitle = 'Unknown Book';
    let currentAuthor = '';
    let currentChapter = '';
    let noteIndex = 0;

    const titleMatch = content.match(/《([^》]+)》/);
    if (titleMatch) {
      currentBookTitle = titleMatch[1];
    }

    const authorMatch = content.match(/作者[:：]\s*(.+)/);
    if (authorMatch) {
      currentAuthor = authorMatch[1].trim();
    }

    // 检测特定的微信读书格式
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // 检测章节标题
      if (line.includes('章节：') || (line.startsWith('第') && line.includes('章'))) {
        currentChapter = line.replace('章节：', '');
        i++;
        continue;
      }
      
      // 检测划线内容
      if (line.includes('划线：')) {
        const content = line.replace('划线：', '').trim();
        if (content) {
          notes.push({
            id: `wechat_txt_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: 'highlight',
            content: content,
            chapter: currentChapter,
            position: i,
            createdAt: new Date(),
            source: 'wechat'
          });
          noteIndex++;
        }
        i++;
        continue;
      }
      
      // 检测想法内容
      if (line.includes('想法：')) {
        const content = line.replace('想法：', '').trim();
        if (content) {
          notes.push({
            id: `wechat_txt_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: 'note',
            content: content,
            chapter: currentChapter,
            position: i,
            createdAt: new Date(),
            source: 'wechat'
          });
          noteIndex++;
        }
        i++;
        continue;
      }
      
      // 检测书签内容
      if (line.includes('书签：')) {
        const content = line.replace('书签：', '').trim();
        if (content) {
          notes.push({
            id: `wechat_txt_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: 'bookmark',
            content: content,
            chapter: currentChapter,
            position: i,
            createdAt: new Date(),
            source: 'wechat'
          });
          noteIndex++;
        }
        i++;
        continue;
      }
      
      // 如果没有特定标记，检测下一行是否为内容
      if (line.includes('划线') || line.includes('想法') || line.includes('书签')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && 
            !nextLine.includes('《') && 
            !nextLine.includes('作者') &&
            !nextLine.includes('章节') &&
            !nextLine.includes('划线') &&
            !nextLine.includes('想法') &&
            !nextLine.includes('书签') &&
            nextLine.length > 5) {
          const noteType = line.includes('划线') ? 'highlight' : 
                          line.includes('想法') ? 'note' : 'bookmark';
          notes.push({
            id: `wechat_txt_${noteIndex}_${Date.now()}`,
            bookTitle: currentBookTitle,
            bookAuthor: currentAuthor,
            noteType: noteType,
            content: nextLine,
            chapter: currentChapter,
            position: i,
            createdAt: new Date(),
            source: 'wechat'
          });
          noteIndex++;
          i += 2; // 跳过当前标记行和下一行内容
          continue;
        }
      }
      
      i++;
    }

    return {
      metadata: {
        title: currentBookTitle,
        author: currentAuthor,
        totalNotes: notes.length,
        lastSyncDate: new Date()
      },
      notes,
      rawData: content
    };
  }

  private extractDate(text: string): Date | null {
    const datePatterns = [
      /(\d{4}[年-]\d{1,2}[月-]\d{1,2}[日]?)/,
      /(\d{1,2}[月-]\d{1,2}[日]?)/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[1]);
      }
    }
    
    return null;
  }

  private mapNoteType(type: string): 'highlight' | 'note' | 'bookmark' {
    const typeMap: Record<string, 'highlight' | 'note' | 'bookmark'> = {
      'highlight': 'highlight',
      'note': 'note',
      'bookmark': 'bookmark',
      '划线': 'highlight',
      '想法': 'note',
      '书签': 'bookmark',
      '高亮': 'highlight'
    };
    
    return typeMap[type] || 'highlight';
  }
}