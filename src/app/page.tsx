'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PDFUploader } from '@/components/PDFUploader';
import { PDFPage } from '@/lib/types';
import { FileText, Loader2, Download, RotateCw, RotateCcw, Trash2 } from 'lucide-react';
import { mergeAndSavePDF } from '@/lib/pdf-utils';

// Dynamically import PDFGrid with SSR disabled
const PDFGrid = dynamic(() => import('@/components/PDFGrid').then(mod => mod.PDFGrid), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
});

export default function Home() {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportFilename, setExportFilename] = useState('merged-document');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    setIsProcessing(true);
    // Use simple random string for client-side ID
    const generateId = () => Math.random().toString(36).substr(2, 9);
    const newPages: PDFPage[] = [];

    try {
      // Check if any PDFs need processing
      const hasPDFs = files.some(file => file.type === 'application/pdf');
      let pdfjs: any = null;

      // Only import react-pdf if we have PDFs to process
      if (hasPDFs) {
        const reactPdf = await import('react-pdf');
        pdfjs = reactPdf.pdfjs;
        await import('@/lib/setup-pdf');
      }

      for (const file of files) {
        // Check if file is an image
        if (file.type === 'image/jpeg' || file.type === 'image/png') {
          const previewUrl = URL.createObjectURL(file);
          newPages.push({
            id: generateId(),
            file: file,
            previewUrl: previewUrl,
            pageIndex: 0, // Images are single-page
            rotation: 0
          });
        } else if (file.type === 'application/pdf') {
          if (!pdfjs) {
            console.error('PDF.js not loaded');
            alert('Failed to load PDF processor');
            continue;
          }

          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument(arrayBuffer).promise;

            const previewUrl = URL.createObjectURL(file); // Create stable URL for rendering

            for (let i = 0; i < pdf.numPages; i++) {
              newPages.push({
                id: generateId(),
                file: file,
                previewUrl: previewUrl,
                pageIndex: i,
                rotation: 0
              });
            }
          } catch (pdfError) {
            console.error(`Error processing PDF file ${file.name}:`, pdfError);
            alert(`Failed to process PDF file: ${file.name}`);
          }
        }
      }

      setPages(prev => [...prev, ...newPages]);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Failed to process file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelection = (id: string, isMulti: boolean, isRange: boolean) => {
    if (isRange && lastSelectedId) {
      const lastIndex = pages.findIndex(p => p.id === lastSelectedId);
      const currentIndex = pages.findIndex(p => p.id === id);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = pages.slice(start, end + 1).map(p => p.id);

      setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else if (isMulti) {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
      setLastSelectedId(id);
    } else {
      setSelectedIds([id]);
      setLastSelectedId(id);
    }
  };

  const handleRotate = (id: string, direction: 'cw' | 'ccw' = 'cw') => {
    setPages(prev => prev.map(page => {
      if (page.id === id) {
        const rotationDelta = direction === 'cw' ? 90 : -90;
        let newRotation = (page.rotation + rotationDelta) % 360;
        if (newRotation < 0) newRotation += 360;
        return { ...page, rotation: newRotation };
      }
      return page;
    }));
  };

  const handleRotateSelected = (direction: 'cw' | 'ccw' = 'cw') => {
    if (selectedIds.length === 0) return;
    setPages(prev => prev.map(page => {
      if (selectedIds.includes(page.id)) {
        const rotationDelta = direction === 'cw' ? 90 : -90;
        let newRotation = (page.rotation + rotationDelta) % 360;
        if (newRotation < 0) newRotation += 360;
        return { ...page, rotation: newRotation };
      }
      return page;
    }));
  };

  const handleRotateAll = (direction: 'cw' | 'ccw' = 'cw') => {
    setPages(prev => prev.map(page => {
      const rotationDelta = direction === 'cw' ? 90 : -90;
      let newRotation = (page.rotation + rotationDelta) % 360;
      if (newRotation < 0) newRotation += 360;
      return { ...page, rotation: newRotation };
    }));
  };

  const handleDelete = (id: string) => {
    setPages(prev => prev.filter(page => page.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected pages?`)) {
      setPages(prev => prev.filter(page => !selectedIds.includes(page.id)));
      setSelectedIds([]);
      setLastSelectedId(null);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all pages?')) {
      setPages([]);
      setSelectedIds([]);
      setLastSelectedId(null);
    }
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    try {
      await mergeAndSavePDF(pages, exportFilename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              PDF Flow
            </h1>
          </div>
          {pages.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg px-3 py-1 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all">
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  placeholder="Filename"
                  className="bg-transparent border-none text-sm font-medium focus:outline-none w-32"
                />
                <span className="text-gray-400 text-xs">.pdf</span>
              </div>
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isProcessing ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {pages.length === 0 && !isProcessing ? (
          <div className="max-w-2xl mx-auto text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
              Manage your PDFs simply
            </h2>
            <p className="text-lg text-gray-500 mb-10 max-w-lg mx-auto">
              Combine, rotate, and rearrange pages in seconds.
              Everything happens in your browser.
            </p>
            <PDFUploader onUpload={handleUpload} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {isProcessing && pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-gray-500 font-medium">Processing files...</p>
                <p className="text-sm text-gray-400">Please wait while we prepare your pages.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    {pages.length} Page{pages.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mr-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                          {selectedIds.length} Selected
                        </div>
                        <button
                          onClick={() => handleRotateSelected('ccw')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Rotate Selected Counter-Clockwise"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRotateSelected('cw')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Rotate Selected Clockwise"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Selected"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                      </>
                    )}
                    <button
                      onClick={() => handleRotateAll('ccw')}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                      title="Rotate All Counter-Clockwise"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">Rotate All</span>
                    </button>
                    <button
                      onClick={() => handleRotateAll('cw')}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Rotate All Clockwise"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                      onClick={handleClear}
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <PDFGrid
                  pages={pages}
                  selectedIds={selectedIds}
                  onToggleSelection={handleToggleSelection}
                  onRotate={handleRotate}
                  onDelete={handleDelete}
                  onReorder={(newPages) => {
                    setPages(newPages);
                  }}
                />

                <div className="mt-12 flex justify-center border-t border-gray-200 pt-8 pb-12">
                  <div className="w-full max-w-md">
                    <p className="text-center text-gray-500 mb-4 text-sm font-medium">Add more files to combine</p>
                    <PDFUploader onUpload={handleUpload} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
