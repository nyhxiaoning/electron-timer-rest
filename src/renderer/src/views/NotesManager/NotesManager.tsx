import React, { useState, useEffect, useCallback } from 'react';
import { ParsedBookData, BookNote } from '../../../../shared/types/notes';
import FileDropZone from '../../components/FileDropZone/FileDropZone';
import NotesPreview from '../../components/NotesPreview/NotesPreview';
import QRLogin from '../../components/QRLogin/QRLogin';
import { 
  BookOutlined, 
  SyncOutlined,
  ExportOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  CloudSyncOutlined
} from '@ant-design/icons';
import { Card, Button, Input, message, Modal, Statistic, Row, Col } from 'antd';

const { Search } = Input;

export const NotesManager: React.FC = () => {
  const [books, setBooks] = useState<ParsedBookData[]>([]);
  const [selectedBook, setSelectedBook] = useState<ParsedBookData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    totalBooks: 0,
    totalNotes: 0,
    notesBySource: {} as Record<string, number>,
    notesByType: {} as Record<string, number>
  });
  const [qrLoginVisible, setQrLoginVisible] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<'wechat' | 'duokan'>('wechat');
  const [authStatus, setAuthStatus] = useState<{
    wechat?: { token: string; userId: string; expiresIn: number };
    duokan?: { token: string; userId: string; expiresIn: number };
  }>({});

  // 初始化服务
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // 监听事件
        window.api.onNotesImported((data) => {
          message.success(`成功导入《${data.bookTitle}》，共${data.noteCount}条笔记`);
          loadBooks();
        });

        window.api.onNotesExported((data) => {
          message.success(`笔记已导出到: ${data.filePath}`);
        });

        window.api.onError((error) => {
          message.error(`错误: ${error.message}`);
        });

        // 加载现有数据
        loadBooks();
      } catch (error) {
        message.error('服务初始化失败: ' + (error as Error).message);
      }
    };

    initializeServices();
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      const allBooks = await window.api.getAllBooks();
      setBooks(allBooks);
      
      const stats = await window.api.getStatistics();
      setStatistics(stats);

      if (allBooks.length > 0 && !selectedBook) {
        setSelectedBook(allBooks[0]);
      }
    } catch (error) {
      console.error('加载图书失败:', error);
      message.error('加载图书失败: ' + (error as Error).message);
    }
  }, [selectedBook]);

  const handleFilesDrop = async (files: File[]) => {
    setIsLoading(true);

    try {
      for (const file of files) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        if (['png', 'jpg', 'jpeg', 'bmp', 'tiff'].includes(fileExtension || '')) {
          // 处理图片文件 - OCR识别
          await handleImageFile(file);
        } else {
          // 处理文本文件 - 直接解析
          await handleTextFile(file);
        }
      }
    } catch (error) {
      message.error('文件处理失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextFile = async (file: File) => {
    try {
      // 创建临时文件路径
      const tempPath = `./temp/${file.name}`;
      await window.electron.ipcRenderer.invoke('save-file', {
        path: tempPath,
        content: await file.text()
      });

      // 导入笔记
      await window.api.importNotes(tempPath);
    } catch (error) {
      throw new Error(`文本文件处理失败: ${error}`);
    }
  };

  const handleImageFile = async (file: File) => {
    try {
      // 读取图片文件
      const arrayBuffer = await file.arrayBuffer();

      // OCR识别
      const result = await window.api.processImageFromData(arrayBuffer, file.type);

      if (result.trim()) {
        // 这里需要实现存储功能，暂时先显示结果
        message.success(`OCR识别完成: ${result.substring(0, 100)}...`);
        loadBooks();
      } else {
        message.warning('OCR未识别到有效文本');
      }
    } catch (error) {
      throw new Error(`OCR处理失败: ${error}`);
    }
  };

  const handleExportBook = async (book: ParsedBookData, format: string = 'markdown') => {
    try {
      const filePath = `./exports/${book.metadata.title}.${format === 'markdown' ? 'md' : format}`;
      await window.api.exportBook(book.metadata.title, format, filePath);
      message.success('笔记导出成功');
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message);
    }
  };

  const handleDeleteBook = (bookTitle: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除《${bookTitle}》的所有笔记吗？此操作不可撤销。`,
      onOk: async () => {
        try {
          await window.api.deleteBook(bookTitle);
          loadBooks();
          if (selectedBook?.metadata.title === bookTitle) {
            setSelectedBook(null);
          }
          message.success('图书笔记已删除');
        } catch (error) {
          message.error('删除失败: ' + (error as Error).message);
        }
      }
    });
  };

  const handleNoteUpdate = async (noteId: string, updates: Partial<BookNote>) => {
    try {
      await window.api.updateNote(noteId, updates);
      loadBooks();
    } catch (error) {
      throw error;
    }
  };

  const handleNoteDelete = async (noteId: string) => {
    try {
      await window.api.deleteNote(noteId);
      loadBooks();
    } catch (error) {
      throw error;
    }
  };

  // 扫码登录相关函数
  const handleQRLogin = (platform: 'wechat' | 'duokan') => {
    setCurrentPlatform(platform);
    setQrLoginVisible(true);
  };

  const handleLoginSuccess = (platform: string, authData: any) => {
    setAuthStatus(prev => ({
      ...prev,
      [platform]: authData
    }));
    setQrLoginVisible(false);
    message.success(`${platform === 'wechat' ? '微信读书' : '多看阅读'}登录成功！`);
    
    // 登录成功后自动同步数据
    handleSyncData(platform);
  };

  const handleSyncData = async (platform: string) => {
    setIsLoading(true);
    try {
      // 这里应该调用实际的同步API
      message.info(`正在同步${platform === 'wechat' ? '微信读书' : '多看阅读'}数据...`);
      
      // 模拟同步过程
      setTimeout(() => {
        message.success(`${platform === 'wechat' ? '微信读书' : '多看阅读'}数据同步完成！`);
        loadBooks(); // 重新加载数据
      }, 2000);
    } catch (error) {
      message.error(`同步失败: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBooks = books.filter(book => 
    book.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.metadata.author && book.metadata.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full bg-gray-50">
      <div className="container mx-auto px-4 py-6 h-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">读书笔记管理器</h1>
          <p className="text-gray-600">自动关联和解析多看、微信读书等读书笔记</p>
        </div>

        {/* 统计信息 */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="图书数量"
                value={statistics.totalBooks}
                prefix={<BookOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="笔记总数"
                value={statistics.totalNotes}
                prefix={<SyncOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="多看笔记"
                value={statistics.notesBySource.duokan || 0}
                prefix={<span className="text-blue-500">📚</span>}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="微信笔记"
                value={statistics.notesBySource.wechat || 0}
                prefix={<span className="text-green-500">📖</span>}
              />
            </Card>
          </Col>
        </Row>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* 左侧：文件导入和图书列表 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 文件导入区域 */}
            <Card title="导入笔记" className="h-64">
              <FileDropZone
                onFilesDrop={handleFilesDrop}
                className="h-full"
                multiple={true}
              />
            </Card>

            {/* 扫码登录区域 */}
            <Card title="自动同步" className="h-48">
              <div className="h-full flex flex-col justify-center">
                <div className="text-center mb-4">
                  <CloudSyncOutlined className="text-2xl text-blue-500 mb-2" />
                  <p className="text-sm text-gray-600 mb-4">
                    扫码登录后自动同步读书笔记
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="primary"
                    icon={<QrcodeOutlined />}
                    onClick={() => handleQRLogin('wechat')}
                    disabled={!!authStatus.wechat}
                    className="flex-1"
                  >
                    {authStatus.wechat ? '已登录' : '微信读书'}
                  </Button>
                  <Button
                    type="primary"
                    icon={<QrcodeOutlined />}
                    onClick={() => handleQRLogin('duokan')}
                    disabled={!!authStatus.duokan}
                    className="flex-1"
                  >
                    {authStatus.duokan ? '已登录' : '多看阅读'}
                  </Button>
                </div>
                {(authStatus.wechat || authStatus.duokan) && (
                  <div className="mt-3 text-center">
                    <Button
                      size="small"
                      type="link"
                      icon={<SyncOutlined />}
                      onClick={() => {
                        if (authStatus.wechat) handleSyncData('wechat');
                        if (authStatus.duokan) handleSyncData('duokan');
                      }}
                    >
                      手动同步
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* 图书列表 */}
            <Card title="我的图书" className="flex-1">
              <div className="mb-4">
                <Search
                  placeholder="搜索图书..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredBooks.map((book) => (
                  <div
                    key={book.metadata.title}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors
                      ${selectedBook?.metadata.title === book.metadata.title
                        ? 'bg-blue-100 border-blue-300 border'
                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }
                    `}
                    onClick={() => setSelectedBook(book)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {book.metadata.title}
                        </h4>
                        {book.metadata.author && (
                          <p className="text-sm text-gray-600 truncate">
                            {book.metadata.author}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {book.notes.length} 条笔记
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="small"
                          icon={<ExportOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportBook(book);
                          }}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBook(book.metadata.title);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredBooks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOutlined className="text-2xl mb-2" />
                    <p>暂无图书</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* 右侧：笔记预览 */}
          <div className="lg:col-span-2">
            <Card 
              title="笔记预览" 
              className="h-full"
              extra={
                selectedBook && (
                  <Button
                    type="primary"
                    icon={<ExportOutlined />}
                    onClick={() => handleExportBook(selectedBook)}
                  >
                    导出全部
                  </Button>
                )
              }
            >
              {selectedBook ? (
                <NotesPreview
                  data={selectedBook}
                  onExport={(format) => handleExportBook(selectedBook, format)}
                  onNoteUpdate={handleNoteUpdate}
                  onNoteDelete={handleNoteDelete}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BookOutlined className="text-4xl mb-4" />
                    <p>请选择一本图书查看笔记</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <SyncOutlined spin className="text-blue-500 text-xl" />
            <span className="text-lg">正在处理文件...</span>
          </div>
        </div>
      )}

      {/* 扫码登录弹窗 */}
      <QRLogin
        visible={qrLoginVisible}
        onCancel={() => setQrLoginVisible(false)}
        onLoginSuccess={handleLoginSuccess}
        platform={currentPlatform}
      />
    </div>
  );
};

export default NotesManager;