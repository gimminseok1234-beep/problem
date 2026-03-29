import React, { useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  files: File[];
  onFilesChanged: (files: File[]) => void;
  accept?: string;
  description?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ label, files, onFilesChanged, accept = ".txt,.md,.json,.pdf,.csv,image/*", description }) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onFilesChanged([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChanged(newFiles);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</label>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</p>}
      
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative group text-center cursor-pointer">
        <input 
          type="file" 
          multiple 
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
            <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-300 font-medium">클릭하거나 파일을 드래그하여 업로드하세요</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">텍스트 및 이미지 지원</p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 shadow-sm text-sm">
              <div className="flex items-center truncate">
                <FileText className="w-4 h-4 text-blue-500 mr-2" />
                <span className="truncate max-w-xs text-gray-700 dark:text-gray-200">{file.name}</span>
              </div>
              <button 
                onClick={() => removeFile(idx)} 
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
