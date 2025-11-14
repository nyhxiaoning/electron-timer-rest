import { NoteParser, ParsedBookData, BookNote } from '../../shared/types/notes';

export class DuokanParser implements NoteParser {
  name = 'Duokan Notes Parser';
  supportedFormats = ['.txt', '.json', '.xml'];

  validate(data: string | Buffer): boolean {
    const content = data.toString();
    return content.includes('duokan') || 
           content.includes('多看') || 
           content.includes('读书笔记') ||
           this.isValidJSON(content) ||
           this.isValidXML(content);
  }

  async parse(data: string | Buffer): Promise<ParsedBookData> {
    const content = data.toString();
    
    if (this.isValidJSON(content)) {
      return this.parseJSON(content);
    } else if (this.isValidXML(content)) {
      return this.parseXML(content);
    } else {
      return this.parsePlainText(content);
    }
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private isValidXML(str: string): boolean {
    return str.includes('<?xml') || str.includes('<notes>');
  }

  private parseJSON(content: string): ParsedBookData {
    let data;
    try {
      data = JSON.parse(content);
    } catch (error) {
      // 如果JSON解析失败，返回空数据
      return {
        metadata: {
          title: 'Unknown Book',
          author: '',
          totalNotes: 0,
          lastSyncDate: new Date()
        },
        notes: [],
        rawData: content
      };
    }
    
    const notes: BookNote[] = [];
    
    if (data.notes && Array.isArray(data.notes)) {
      data.notes.forEach((note: any, index: number) => {
        notes.push({
          id: `duokan_${index}_${Date.now()}`,
          bookTitle: data.bookTitle || note.bookTitle || 'Unknown Book',
          bookAuthor: data.author || note.author,
          noteType: this.mapNoteType(note.type || 'highlight'),
          content: note.content || note.text || '',
          position: note.position || note.location || index,
          location: note.location || note.page || '',
          chapter: note.chapter || note.section,
          createdAt: new Date(note.createdAt || note.date || Date.now()),
          color: note.color,
          source: 'duokan',
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

  private parseXML(content: string): ParsedBookData {
    const notes: BookNote[] = [];
    
    const titleMatch = content.match(/<bookTitle>(.*?)<\/bookTitle>/);
    const authorMatch = content.match(/<author>(.*?)<\/author>/);
    
    const noteMatches = content.match(/<note>(.*?)<\/note>/gs);
    
    if (noteMatches) {
      noteMatches.forEach((noteMatch, index) => {
        const contentMatch = noteMatch.match(/<content>(.*?)<\/content>/);
        const positionMatch = noteMatch.match(/<position>(.*?)<\/position>/);
        const chapterMatch = noteMatch.match(/<chapter>(.*?)<\/chapter>/);
        const dateMatch = noteMatch.match(/<date>(.*?)<\/date>/);
        
        if (contentMatch) {
          notes.push({
            id: `duokan_xml_${index}_${Date.now()}`,
            bookTitle: titleMatch?.[1] || 'Unknown Book',
            bookAuthor: authorMatch?.[1],
            noteType: 'highlight',
            content: contentMatch[1],
            position: positionMatch ? parseInt(positionMatch[1]) : index,
            chapter: chapterMatch?.[1],
            createdAt: dateMatch ? new Date(dateMatch[1]) : new Date(),
            source: 'duokan'
          });
        }
      });
    }

    return {
      metadata: {
        title: titleMatch?.[1] || 'Unknown Book',
        author: authorMatch?.[1],
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
    
    const titleMatch = content.match(/书名[:：]\s*(.+)/);
    if (titleMatch) {
      currentBookTitle = titleMatch[1].trim();
    }
    
    const authorMatch = content.match(/作者[:：]\s*(.+)/);
    if (authorMatch) {
      currentAuthor = authorMatch[1].trim();
    }

    let noteIndex = 0;

    lines.forEach((line) => {
      line = line.trim();
      
      // 跳过标题和作者行
      if (line.includes('书名') || line.includes('作者')) {
        return;
      }
      
      // 检测章节标题
      if (line.startsWith('第') && line.includes('章')) {
        return;
      }
      
      // 检测位置信息（纯数字）
      if (line.match(/^\d+$/)) {
        return;
      }
      
      // 检测笔记内容（长度大于5个字符，不包含特殊标记）
      if (line.length > 5 && 
          !line.includes('书名') && 
          !line.includes('作者') && 
          !line.includes('读书笔记') &&
          !line.match(/^第.*章/) &&
          !line.match(/^\d+$/)) {
        notes.push({
          id: `duokan_txt_${noteIndex}_${Date.now()}`,
          bookTitle: currentBookTitle,
          bookAuthor: currentAuthor,
          noteType: 'highlight',
          content: line,
          position: noteIndex,
          createdAt: new Date(),
          source: 'duokan'
        });
        noteIndex++;
      }
    });

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

  private mapNoteType(type: string): 'highlight' | 'note' | 'bookmark' {
    const typeMap: Record<string, 'highlight' | 'note' | 'bookmark'> = {
      'highlight': 'highlight',
      'note': 'note',
      'bookmark': 'bookmark',
      '高亮': 'highlight',
      '笔记': 'note',
      '书签': 'bookmark'
    };
    
    return typeMap[type] || 'highlight';
  }
}