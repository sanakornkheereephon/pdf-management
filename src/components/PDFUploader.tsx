'use client';

import { useState, useCallback } from 'react';
import { Upload, FileUp } from 'lucide-react';
import clsx from 'clsx';

interface PDFUploaderProps {
  onUpload: (files: File[]) => void;
}

export function PDFUploader({ onUpload }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      onUpload(files);
    }
  }, [onUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (file) => file.type === 'application/pdf'
      );
      if (files.length > 0) {
        onUpload(files);
      }
    }
  }, [onUpload]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "relative flex flex-col items-center justify-center w-full max-w-2xl p-12 mx-auto mt-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer group",
        isDragging
          ? "border-blue-500 bg-blue-50/50 scale-[1.02]"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 bg-white"
      )}
    >
      <input
        type="file"
        accept="application/pdf"
        multiple
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={clsx(
          "p-4 rounded-full transition-colors",
          isDragging ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400 group-hover:text-gray-600"
        )}>
          {isDragging ? <FileUp className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isDragging ? "Drop PDFs here" : "Upload PDF files"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Drag & drop or click to select files
          </p>
        </div>
      </div>
    </div>
  );
}
