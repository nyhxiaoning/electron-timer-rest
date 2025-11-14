import { describe, it, expect, beforeEach } from 'vitest';
import { DuokanParser } from '../main/parsers/DuokanParser';
import { WeChatParser } from '../main/parsers/WeChatParser';
import { DefaultMarkdownFormatter } from '../main/formatters/MarkdownFormatter';
import { NotesManager } from '../main/services/NotesManager';

describe('读书笔记解析器测试', () => {
  describe('DuokanParser', () => {
    let parser: DuokanParser;

    beforeEach(() => {
      parser = new DuokanParser();
    });

    it('应该正确验证多看笔记格式', () => {
      const validContent = '多看读书笔记\n书名：测试书籍\n作者：测试作者';
      const invalidContent = '这是普通的文本内容';

      expect(parser.validate(validContent)).toBe(true);
      expect(parser.validate(invalidContent)).toBe(false);
    });

    it('应该正确解析JSON格式的多看笔记', async () => {
      const jsonContent = JSON.stringify({
        bookTitle: '测试书籍',
        author: '测试作者',
        notes: [
          {
            content: '这是第一条笔记',
            position: 1,
            chapter: '第一章',
            type: 'highlight'
          }
        ]
      });

      const result = await parser.parse(jsonContent);

      expect(result.metadata.title).toBe('测试书籍');
      expect(result.metadata.author).toBe('测试作者');
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].content).toBe('这是第一条笔记');
      expect(result.notes[0].noteType).toBe('highlight');
    });

    it('应该正确解析纯文本格式的多看笔记', async () => {
      const textContent = `书名：测试书籍
作者：测试作者

读书笔记
第一章
这是第一条笔记
第二章
这是第二条笔记`;

      const result = await parser.parse(textContent);

      expect(result.metadata.title).toBe('测试书籍');
      expect(result.metadata.author).toBe('测试作者');
      expect(result.notes.length).toBeGreaterThan(0);
    });
  });

  describe('WeChatParser', () => {
    let parser: WeChatParser;

    beforeEach(() => {
      parser = new WeChatParser();
    });

    it('应该正确验证微信读书笔记格式', () => {
      const validContent = '微信读书\n《测试书籍》\n作者：测试作者';
      const invalidContent = '这是普通的文本内容';

      expect(parser.validate(validContent)).toBe(true);
      expect(parser.validate(invalidContent)).toBe(false);
    });

    it('应该正确解析微信读书格式', async () => {
      const wechatContent = `《测试书籍》
作者：测试作者

章节：第一章
划线：这是高亮的内容
想法：这是想法的内容
书签：这是书签的内容`;

      const result = await parser.parse(wechatContent);

      expect(result.metadata.title).toBe('测试书籍');
      expect(result.metadata.author).toBe('测试作者');
      expect(result.notes.length).toBeGreaterThan(0);
    });

    it('应该正确解析CSV格式的微信笔记', async () => {
      const csvContent = `内容,章节,类型
"这是高亮内容","第一章","highlight"
"这是笔记内容","第二章","note"`;

      const result = await parser.parse(csvContent);

      expect(result.notes).toHaveLength(2);
      expect(result.notes[0].content).toBe('这是高亮内容');
      expect(result.notes[0].noteType).toBe('highlight');
    });
  });

  describe('MarkdownFormatter', () => {
    let formatter: DefaultMarkdownFormatter;

    beforeEach(() => {
      formatter = new DefaultMarkdownFormatter();
    });

    it('应该正确格式化笔记为Markdown', () => {
      const notes = [
        {
          id: '1',
          bookTitle: '测试书籍',
          bookAuthor: '测试作者',
          noteType: 'highlight' as const,
          content: '这是高亮内容',
          createdAt: new Date('2024-01-01'),
          source: 'duokan' as const
        },
        {
          id: '2',
          bookTitle: '测试书籍',
          bookAuthor: '测试作者',
          noteType: 'note' as const,
          content: '这是笔记内容',
          createdAt: new Date('2024-01-02'),
          source: 'duokan' as const
        }
      ];

      const result = formatter.format(notes);

      expect(result).toContain('# 读书笔记');
      expect(result).toContain('这是高亮内容');
      expect(result).toContain('这是笔记内容');
      expect(result).toContain('高亮');
      expect(result).toContain('笔记');
    });

    it('应该正确按章节分组', () => {
      const notes = [
        {
          id: '1',
          bookTitle: '测试书籍',
          bookAuthor: '测试作者',
          noteType: 'highlight' as const,
          content: '第一章内容',
          chapter: '第一章',
          createdAt: new Date(),
          source: 'duokan' as const
        },
        {
          id: '2',
          bookTitle: '测试书籍',
          bookAuthor: '测试作者',
          noteType: 'note' as const,
          content: '第二章内容',
          chapter: '第二章',
          createdAt: new Date(),
          source: 'duokan' as const
        }
      ];

      const result = formatter.format(notes, { groupByChapter: true });

      expect(result).toContain('## 第一章');
      expect(result).toContain('## 第二章');
    });
  });

  describe('NotesManager', () => {
    let manager: NotesManager;

    beforeEach(() => {
      manager = new NotesManager({
        storagePath: './test-data',
        autoSave: false
      });
    });

    it('应该正确存储和检索笔记', () => {
      const testData = {
        metadata: {
          title: '测试书籍',
          author: '测试作者',
          totalNotes: 2,
          lastSyncDate: new Date()
        },
        notes: [
          {
            id: 'test-1',
            bookTitle: '测试书籍',
            bookAuthor: '测试作者',
            noteType: 'highlight' as const,
            content: '测试高亮内容',
            createdAt: new Date(),
            source: 'duokan' as const
          },
          {
            id: 'test-2',
            bookTitle: '测试书籍',
            bookAuthor: '测试作者',
            noteType: 'note' as const,
            content: '测试笔记内容',
            createdAt: new Date(),
            source: 'duokan' as const
          }
        ]
      };

      // 模拟存储数据
      manager['storeParsedData'](testData);

      const books = manager.getAllBooks();
      expect(books).toHaveLength(1);
      expect(books[0].metadata.title).toBe('测试书籍');

      const notes = manager.getNotesByBook('测试书籍');
      expect(notes).toHaveLength(2);

      const statistics = manager.getStatistics();
      expect(statistics.totalBooks).toBe(1);
      expect(statistics.totalNotes).toBe(2);
    });

    it('应该正确搜索笔记', () => {
      const testData = {
        metadata: {
          title: '测试书籍',
          author: '测试作者',
          totalNotes: 2,
          lastSyncDate: new Date()
        },
        notes: [
          {
            id: 'test-1',
            bookTitle: '测试书籍',
            bookAuthor: '测试作者',
            noteType: 'highlight' as const,
            content: 'JavaScript编程技巧',
            createdAt: new Date(),
            source: 'duokan' as const
          },
          {
            id: 'test-2',
            bookTitle: '测试书籍',
            bookAuthor: '测试作者',
            noteType: 'note' as const,
            content: 'Python数据分析',
            createdAt: new Date(),
            source: 'duokan' as const
          }
        ]
      };

      manager['storeParsedData'](testData);

      const jsResults = manager.searchNotes('JavaScript');
      expect(jsResults).toHaveLength(1);
      expect(jsResults[0].content).toContain('JavaScript');

      const pythonResults = manager.searchNotes('Python');
      expect(pythonResults).toHaveLength(1);
      expect(pythonResults[0].content).toContain('Python');
    });

    it('应该正确更新和删除笔记', () => {
      const testData = {
        metadata: {
          title: '测试书籍',
          author: '测试作者',
          totalNotes: 1,
          lastSyncDate: new Date()
        },
        notes: [
          {
            id: 'test-1',
            bookTitle: '测试书籍',
            bookAuthor: '测试作者',
            noteType: 'highlight' as const,
            content: '原始内容',
            createdAt: new Date(),
            source: 'duokan' as const
          }
        ]
      };

      manager['storeParsedData'](testData);

      // 更新笔记
      const updateResult = manager.updateNote('test-1', { content: '更新后的内容' });
      expect(updateResult).toBe(true);

      const updatedNote = manager.getNoteById('test-1');
      expect(updatedNote?.content).toBe('更新后的内容');

      // 删除笔记
      const deleteResult = manager.deleteNote('test-1');
      expect(deleteResult).toBe(true);

      const deletedNote = manager.getNoteById('test-1');
      expect(deletedNote).toBeUndefined();
    });
  });
});

// 集成测试
describe('集成测试', () => {
  it('应该完整处理多看笔记文件', async () => {
    const manager = new NotesManager({ autoSave: false });
    const parser = new DuokanParser();
    const formatter = new DefaultMarkdownFormatter();

    const jsonContent = JSON.stringify({
      bookTitle: '集成测试书籍',
      author: '集成测试作者',
      notes: [
        {
          content: '这是集成测试的高亮内容',
          position: 100,
          chapter: '测试章节',
          type: 'highlight'
        }
      ]
    });

    // 解析文件
    const parsedData = await parser.parse(jsonContent);
    expect(parsedData.metadata.title).toBe('集成测试书籍');
    expect(parsedData.notes).toHaveLength(1);

    // 存储到管理器
    manager['storeParsedData'](parsedData);
    const books = manager.getAllBooks();
    expect(books).toHaveLength(1);

    // 格式化为Markdown
    const markdown = formatter.formatBook(parsedData);
    expect(markdown).toContain('集成测试书籍');
    expect(markdown).toContain('这是集成测试的高亮内容');
  });

  it('应该处理OCR识别的笔记', () => {
    const manager = new NotesManager({ autoSave: false });

    // 模拟OCR结果
    const ocrResult = {
      text: '这是OCR识别的内容',
      confidence: 95,
      coordinates: { x: 10, y: 20, width: 100, height: 30 }
    };

    const mockBookData = {
      metadata: {
        title: 'OCR扫描笔记',
        author: 'OCR识别',
        totalNotes: 1,
        lastSyncDate: new Date()
      },
      notes: [{
        id: 'ocr-test',
        bookTitle: 'OCR扫描笔记',
        bookAuthor: 'OCR识别',
        noteType: 'highlight' as const,
        content: ocrResult.text,
        createdAt: new Date(),
        source: 'ocr' as const
      }],
      rawData: ocrResult
    };

    manager['storeParsedData'](mockBookData);

    const books = manager.getAllBooks();
    expect(books).toHaveLength(1);
    expect(books[0].metadata.title).toBe('OCR扫描笔记');

    const notes = manager.searchNotes('OCR');
    expect(notes).toHaveLength(1);
    expect(notes[0].source).toBe('ocr');
  });

  it('应该处理混合格式的笔记数据', async () => {
    const manager = new NotesManager({ autoSave: false });
    const duokanParser = new DuokanParser();
    const wechatParser = new WeChatParser();

    // 多看格式数据
    const duokanData = JSON.stringify({
      bookTitle: '多看测试书籍',
      author: '多看作者',
      notes: [
        {
          content: '多看笔记内容',
          position: 1,
          type: 'highlight'
        }
      ]
    });

    // 微信读书格式数据
    const wechatData = `《微信测试书籍》
作者：微信作者

章节：第一章
划线：微信高亮内容
想法：微信想法内容`;

    // 解析两种格式
    const duokanResult = await duokanParser.parse(duokanData);
    const wechatResult = await wechatParser.parse(wechatData);

    // 存储到管理器
    manager['storeParsedData'](duokanResult);
    manager['storeParsedData'](wechatResult);

    const books = manager.getAllBooks();
    expect(books).toHaveLength(2);
    expect(books[0].metadata.title).toBe('多看测试书籍');
    expect(books[1].metadata.title).toBe('微信测试书籍');

    const allNotes = manager.getAllNotes();
    // 多看有1个笔记，微信读书有2个笔记（划线和想法）
    expect(allNotes.length).toBeGreaterThanOrEqual(2);

    const statistics = manager.getStatistics();
    expect(statistics.totalBooks).toBe(2);
    expect(statistics.totalNotes).toBeGreaterThanOrEqual(2);
  });
});

// 边界条件测试
describe('边界条件测试', () => {
  it('应该处理空数据', () => {
    const manager = new NotesManager({ autoSave: false });
    const formatter = new DefaultMarkdownFormatter();

    const emptyNotes: any[] = [];
    const result = formatter.format(emptyNotes);
    expect(result).toContain('读书笔记');

    const books = manager.getAllBooks();
    expect(books).toHaveLength(0);

    const statistics = manager.getStatistics();
    expect(statistics.totalBooks).toBe(0);
    expect(statistics.totalNotes).toBe(0);
  });

  it('应该处理特殊字符和Unicode', async () => {
    const parser = new DuokanParser();
    const jsonContent = JSON.stringify({
      bookTitle: '📚 测试书籍 📖',
      author: '作者 👨‍💻',
      notes: [
        {
          content: '特殊字符：@#$%^&*()_+-=[]{}|;:,.<>?/~`',
          position: 1,
          type: 'highlight'
        },
        {
          content: 'Unicode：你好世界 🌍 こんにちは 안녕하세요',
          position: 2,
          type: 'note'
        }
      ]
    });

    const result = await parser.parse(jsonContent);
    expect(result.metadata.title).toBe('📚 测试书籍 📖');
    expect(result.metadata.author).toBe('作者 👨‍💻');
    expect(result.notes[0].content).toBe('特殊字符：@#$%^&*()_+-=[]{}|;:,.<>?/~`');
    expect(result.notes[1].content).toBe('Unicode：你好世界 🌍 こんにちは 안녕하세요');
  });

  it('应该处理长文本内容', async () => {
    const parser = new WeChatParser();
    const longContent = '《长文本测试》\n作者：测试作者\n\n';
    const longText = '这是一个很长的笔记内容。' + '重复文本。'.repeat(50);
    
    const wechatContent = longContent + `章节：第一章
划线：${longText}
想法：${longText}`;

    const result = await parser.parse(wechatContent);
    expect(result.metadata.title).toBe('长文本测试');
    expect(result.notes.length).toBeGreaterThan(0);
    if (result.notes.length > 0) {
      expect(result.notes[0].content.length).toBeGreaterThan(200);
    }
    if (result.notes.length > 1) {
      expect(result.notes[1].content.length).toBeGreaterThan(200);
    }
  });

  it('应该处理格式错误的输入', async () => {
    const parser = new DuokanParser();
    
    // 损坏的JSON - 现在应该优雅处理而不是抛出错误
    const brokenJson = '{"bookTitle": "测试", "author": "作者", "notes": [';
    const brokenResult = await parser.parse(brokenJson);
    expect(brokenResult.metadata.title).toBe('Unknown Book');
    expect(brokenResult.notes).toHaveLength(0);

    // 空对象
    const emptyObject = '{}';
    const result = await parser.parse(emptyObject);
    expect(result.metadata.title).toBe('Unknown Book');
    expect(result.notes).toHaveLength(0);
  });

  it('应该处理重复笔记ID', () => {
    const manager = new NotesManager({ autoSave: false });
    
    const testData = {
      metadata: {
        title: '重复ID测试',
        author: '测试作者',
        totalNotes: 2,
        lastSyncDate: new Date()
      },
      notes: [
        {
          id: 'duplicate-id',
          bookTitle: '重复ID测试',
          bookAuthor: '测试作者',
          noteType: 'highlight' as const,
          content: '第一条笔记',
          createdAt: new Date(),
          source: 'manual' as const
        },
        {
          id: 'duplicate-id',
          bookTitle: '重复ID测试',
          bookAuthor: '测试作者',
          noteType: 'note' as const,
          content: '第二条笔记',
          createdAt: new Date(),
          source: 'manual' as const
        }
      ]
    };

    manager['storeParsedData'](testData);
    const notes = manager.getNotesByBook('重复ID测试');
    expect(notes).toHaveLength(2);
    
    // 验证可以通过ID获取笔记
    const note1 = manager.getNoteById('duplicate-id');
    expect(note1).toBeDefined();
    expect(note1?.content).toBe('第一条笔记');
  });
});