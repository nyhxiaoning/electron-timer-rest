import { MarkdownFormatter, BookNote, ParsedBookData, FormatOptions } from '../../shared/types/notes';

export class DefaultMarkdownFormatter implements MarkdownFormatter {
  format(notes: BookNote[], options: FormatOptions = {}): string {
    const {
      includeMetadata = true,
      includeLocation = true,
      includeTags = true,
      groupByChapter = false,
      sortBy = 'position'
    } = options;

    if (notes.length === 0) {
      return '# 读书笔记\n\n暂无笔记';
    }

    let sortedNotes = [...notes];
    if (sortBy === 'position') {
      sortedNotes.sort((a, b) => (a.position || 0) - (b.position || 0));
    } else if (sortBy === 'date') {
      sortedNotes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    let markdown = '# 读书笔记\n\n';

    if (includeMetadata && notes.length > 0) {
      const bookTitle = notes[0].bookTitle;
      const author = notes[0].bookAuthor;
      markdown += `## 图书信息\n`;
      markdown += `- **书名**: ${bookTitle}\n`;
      if (author) {
        markdown += `- **作者**: ${author}\n`;
      }
      markdown += `- **笔记数量**: ${notes.length}\n`;
      markdown += `- **导出时间**: ${new Date().toLocaleString()}\n\n`;
    }

    if (groupByChapter) {
      const chapters = this.groupNotesByChapter(sortedNotes);
      for (const [chapter, chapterNotes] of chapters) {
        markdown += `## ${chapter || '未分类'}\n\n`;
        markdown += this.formatNotes(chapterNotes, { includeLocation, includeTags });
        markdown += '\n';
      }
    } else {
      markdown += this.formatNotes(sortedNotes, { includeLocation, includeTags });
    }

    return markdown;
  }

  formatBook(data: ParsedBookData, options: FormatOptions = {}): string {
    const { metadata, notes } = data;
    const {
      includeMetadata = true,
      includeLocation = true,
      includeTags = true,
      groupByChapter = false,
      sortBy = 'position'
    } = options;

    let markdown = '# 读书笔记\n\n';

    if (includeMetadata) {
      markdown += `## 图书信息\n`;
      markdown += `- **书名**: ${metadata.title}\n`;
      if (metadata.author) {
        markdown += `- **作者**: ${metadata.author}\n`;
      }
      markdown += `- **笔记数量**: ${metadata.totalNotes}\n`;
      if (metadata.lastSyncDate) {
        markdown += `- **最后同步**: ${metadata.lastSyncDate.toLocaleString()}\n`;
      }
      markdown += `- **导出时间**: ${new Date().toLocaleString()}\n\n`;
    }

    if (notes.length === 0) {
      markdown += '暂无笔记';
      return markdown;
    }

    let sortedNotes = [...notes];
    if (sortBy === 'position') {
      sortedNotes.sort((a, b) => (a.position || 0) - (b.position || 0));
    } else if (sortBy === 'date') {
      sortedNotes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    if (groupByChapter) {
      const chapters = this.groupNotesByChapter(sortedNotes);
      for (const [chapter, chapterNotes] of chapters) {
        markdown += `## ${chapter || '未分类'}\n\n`;
        markdown += this.formatNotes(chapterNotes, { includeLocation, includeTags });
        markdown += '\n';
      }
    } else {
      markdown += this.formatNotes(sortedNotes, { includeLocation, includeTags });
    }

    return markdown;
  }

  private formatNotes(notes: BookNote[], options: { includeLocation: boolean; includeTags: boolean }): string {
    let markdown = '';
    
    notes.forEach((note, index) => {
      const noteNumber = index + 1;
      
      if (note.noteType === 'highlight') {
        markdown += `### 划线 ${noteNumber}\n`;
        markdown += `> ${note.content}\n\n`;
      } else if (note.noteType === 'note') {
        markdown += `### 笔记 ${noteNumber}\n`;
        markdown += `${note.content}\n\n`;
      } else if (note.noteType === 'bookmark') {
        markdown += `### 书签 ${noteNumber}\n`;
        markdown += `${note.content}\n\n`;
      }

      if (options.includeLocation) {
        const locationInfo: string[] = [];
        if (note.chapter) {
          locationInfo.push(`章节: ${note.chapter}`);
        }
        if (note.location) {
          locationInfo.push(`位置: ${note.location}`);
        }
        if (note.position) {
          locationInfo.push(`位置: ${note.position}`);
        }
        
        if (locationInfo.length > 0) {
          markdown += `**${locationInfo.join(' | ')}**\n\n`;
        }
      }

      if (options.includeTags && note.tags && note.tags.length > 0) {
        markdown += `**标签**: ${note.tags.join(', ')}\n\n`;
      }

      markdown += `**创建时间**: ${note.createdAt.toLocaleString()}\n\n`;
      
      if (note.color) {
        markdown += `**颜色**: ${note.color}\n\n`;
      }

      markdown += '---\n\n';
    });

    return markdown;
  }

  private groupNotesByChapter(notes: BookNote[]): Map<string, BookNote[]> {
    const chapters = new Map<string, BookNote[]>();
    
    notes.forEach(note => {
      const chapter = note.chapter || '未分类';
      if (!chapters.has(chapter)) {
        chapters.set(chapter, []);
      }
      chapters.get(chapter)!.push(note);
    });

    return chapters;
  }
}

export class SimpleMarkdownFormatter implements MarkdownFormatter {
  format(notes: BookNote[]): string {
    if (notes.length === 0) return '';

    let markdown = '';
    notes.forEach(note => {
      if (note.noteType === 'highlight') {
        markdown += `> ${note.content}\n\n`;
      } else {
        markdown += `${note.content}\n\n`;
      }
    });

    return markdown;
  }

  formatBook(data: ParsedBookData): string {
    return this.format(data.notes);
  }
}