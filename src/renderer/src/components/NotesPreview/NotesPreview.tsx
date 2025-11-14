import React, { useState } from 'react';
import { BookNote, ParsedBookData } from '../../../../shared/types/notes';
import { 
  BookOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  TagOutlined,
  PushpinOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Button, Input, Select, Tag, message, Modal } from 'antd';

interface NotesPreviewProps {
  data: ParsedBookData;
  onExport?: (format: string) => void;
  onNoteUpdate?: (noteId: string, updates: Partial<BookNote>) => void;
  onNoteDelete?: (noteId: string) => void;
  className?: string;
}

const { TextArea } = Input;
const { Option } = Select;

export const NotesPreview: React.FC<NotesPreviewProps> = ({
  data,
  onExport,
  onNoteUpdate,
  onNoteDelete,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState<'position' | 'date' | 'chapter'>('position');

  const { metadata, notes } = data;

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' || 
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.chapter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || note.noteType === filterType;
    const matchesSource = filterSource === 'all' || note.source === filterSource;

    return matchesSearch && matchesType && matchesSource;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === 'position') {
      return (a.position || 0) - (b.position || 0);
    } else if (sortBy === 'date') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'chapter') {
      return (a.chapter || '').localeCompare(b.chapter || '');
    }
    return 0;
  });

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'highlight':
        return <span className="text-yellow-500">📝</span>;
      case 'note':
        return <span className="text-blue-500">💭</span>;
      case 'bookmark':
        return <span className="text-red-500">🔖</span>;
      default:
        return <PushpinOutlined className="text-gray-500" />;
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'highlight':
        return '高亮';
      case 'note':
        return '笔记';
      case 'bookmark':
        return '书签';
      default:
        return '未知';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'duokan':
        return '多看阅读';
      case 'wechat':
        return '微信读书';
      case 'manual':
        return '手动添加';
      case 'ocr':
        return 'OCR识别';
      default:
        return source;
    }
  };

  const handleEditNote = (note: BookNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (editingNote && onNoteUpdate) {
      try {
        await onNoteUpdate(editingNote, { content: editContent });
        setEditingNote(null);
        setEditContent('');
        message.success('笔记已更新');
      } catch (error) {
        message.error('更新失败: ' + (error as Error).message);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条笔记吗？此操作不可撤销。',
      onOk: async () => {
        if (onNoteDelete) {
          try {
            await onNoteDelete(noteId);
            message.success('笔记已删除');
          } catch (error) {
            message.error('删除失败: ' + (error as Error).message);
          }
        }
      }
    });
  };

  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* 头部信息 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {metadata.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {metadata.author && (
                <div className="flex items-center gap-1">
                  <UserOutlined />
                  <span>{metadata.author}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <BookOutlined />
                <span>{metadata.totalNotes} 条笔记</span>
              </div>
              {metadata.lastSyncDate && (
                <div className="flex items-center gap-1">
                  <CalendarOutlined />
                  <span>最后同步: {new Date(metadata.lastSyncDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<ExportOutlined />}
              onClick={() => handleExport('markdown')}
              type="primary"
            >
              导出
            </Button>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="搜索笔记内容、章节或标签..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>
          
          <Select
            placeholder="笔记类型"
            value={filterType}
            onChange={setFilterType}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="all">全部类型</Option>
            <Option value="highlight">高亮</Option>
            <Option value="note">笔记</Option>
            <Option value="bookmark">书签</Option>
          </Select>

          <Select
            placeholder="来源"
            value={filterSource}
            onChange={setFilterSource}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="all">全部来源</Option>
            <Option value="duokan">多看阅读</Option>
            <Option value="wechat">微信读书</Option>
            <Option value="manual">手动添加</Option>
            <Option value="ocr">OCR识别</Option>
          </Select>

          <Select
            placeholder="排序方式"
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 120 }}
          >
            <Option value="position">按位置</Option>
            <Option value="date">按时间</Option>
            <Option value="chapter">按章节</Option>
          </Select>
        </div>
      </div>

      {/* 笔记列表 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOutlined className="text-4xl mb-4" />
            <p>没有找到匹配的笔记</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedNotes.map((note, index) => (
              <div
                key={note.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getNoteTypeIcon(note.noteType)}
                    <span className="font-medium text-gray-900">
                      {getNoteTypeLabel(note.noteType)} #{index + 1}
                    </span>
                    <Tag color="blue">{getSourceLabel(note.source)}</Tag>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditNote(note)}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteNote(note.id)}
                    />
                  </div>
                </div>

                {/* 笔记内容 */}
                {editingNote === note.id ? (
                  <div className="mb-3">
                    <TextArea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="small" type="primary" onClick={handleSaveEdit}>
                        保存
                      </Button>
                      <Button size="small" onClick={handleCancelEdit}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    {note.noteType === 'highlight' ? (
                      <blockquote className="border-l-4 border-yellow-400 pl-4 py-2 bg-yellow-50">
                        {note.content}
                      </blockquote>
                    ) : (
                      <p className="text-gray-800">{note.content}</p>
                    )}
                  </div>
                )}

                {/* 元信息 */}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {note.chapter && (
                    <div className="flex items-center gap-1">
                      <BookOutlined />
                      <span>{note.chapter}</span>
                    </div>
                  )}
                  
                  {note.location && (
                    <div className="flex items-center gap-1">
                      <PushpinOutlined />
                      <span>{note.location}</span>
                    </div>
                  )}

                  {note.position && (
                    <div className="flex items-center gap-1">
                      <span>位置: {note.position}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <CalendarOutlined />
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                  </div>

                  {note.color && (
                    <div className="flex items-center gap-1">
                      <span 
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: note.color }}
                      />
                      <span>{note.color}</span>
                    </div>
                  )}
                </div>

                {/* 标签 */}
                {note.tags && note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.map((tag, tagIndex) => (
                      <Tag key={tagIndex} icon={<TagOutlined />}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            显示 {sortedNotes.length} / {notes.length} 条笔记
          </span>
          <div className="flex gap-4">
            <span>高亮: {filteredNotes.filter(n => n.noteType === 'highlight').length}</span>
            <span>笔记: {filteredNotes.filter(n => n.noteType === 'note').length}</span>
            <span>书签: {filteredNotes.filter(n => n.noteType === 'bookmark').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPreview;