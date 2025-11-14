import React, { useCallback, useState } from 'react';
import { InboxOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
import { message } from 'antd';

interface FileDropZoneProps {
  onFilesDrop: (files: File[]) => void;
  acceptedFormats?: string[];
  maxFileSize?: number;
  className?: string;
  multiple?: boolean;
}

const DEFAULT_ACCEPTED_FORMATS = [
  '.txt',
  '.json',
  '.xml',
  '.csv',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.bmp',
  '.tiff'
];

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesDrop,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  className = '',
  multiple = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > maxFileSize) {
      message.error(`文件 "${file.name}" 超过最大限制 ${maxFileSize / (1024 * 1024)}MB`);
      return false;
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.some(format => 
      format.toLowerCase() === fileExtension || 
      file.type.includes(format.replace('.', ''))
    )) {
      message.error(`文件 "${file.name}" 格式不支持`);
      return false;
    }

    return true;
  }, [acceptedFormats, maxFileSize]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(validateFile);

    if (validFiles.length === 0) {
      message.warning('没有有效的文件被拖入');
      return;
    }

    if (!multiple && validFiles.length > 1) {
      message.warning('只能处理单个文件');
      return;
    }

    setIsProcessing(true);
    try {
      await onFilesDrop(multiple ? validFiles : [validFiles[0]]);
      message.success(`成功处理 ${validFiles.length} 个文件`);
    } catch (error) {
      message.error('文件处理失败: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [onFilesDrop, validateFile, multiple]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);

    if (validFiles.length === 0) {
      message.warning('没有有效的文件被选择');
      return;
    }

    setIsProcessing(true);
    try {
      await onFilesDrop(multiple ? validFiles : [validFiles[0]]);
      message.success(`成功处理 ${validFiles.length} 个文件`);
    } catch (error) {
      message.error('文件处理失败: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [onFilesDrop, validateFile, multiple]);

  const getIconForFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['png', 'jpg', 'jpeg', 'bmp', 'tiff'].includes(extension || '')) {
      return <PictureOutlined className="text-blue-500 text-2xl" />;
    }
    
    if (['txt', 'json', 'xml', 'csv', 'md'].includes(extension || '')) {
      return <FileTextOutlined className="text-green-500 text-2xl" />;
    }
    
    return <InboxOutlined className="text-gray-400 text-2xl" />;
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {isDragging ? (
            <div className="text-blue-500">
              <InboxOutlined className="text-4xl" />
            </div>
          ) : (
            getIconForFileType('sample.txt')
          )}
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? '释放文件以导入' : '拖拽文件到此处'}
            </p>
            <p className="text-sm text-gray-500">
              支持 {acceptedFormats.join(', ')} 格式
            </p>
            <p className="text-xs text-gray-400">
              单个文件最大 {maxFileSize / (1024 * 1024)}MB
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="file"
              multiple={multiple}
              accept={acceptedFormats.join(',')}
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
              disabled={isProcessing}
            />
            <label
              htmlFor="file-input"
              className={`
                inline-flex items-center px-4 py-2 border border-gray-300 
                rounded-md shadow-sm text-sm font-medium text-gray-700 
                bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-blue-500 cursor-pointer
                ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              选择文件
            </label>
          </div>

          {isProcessing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">正在处理文件...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileDropZone;