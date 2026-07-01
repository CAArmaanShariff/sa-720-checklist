import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js (use specific version for stability)
if (typeof window !== 'undefined') {
  // Use the legacy build for better compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
}

interface AIDocumentUploadProps {
  onAnalyze: (fsText: string, oiText: string) => void;
  isLoading: boolean;
}

export function AIDocumentUpload({ onAnalyze, isLoading }: AIDocumentUploadProps) {
  const [fsFile, setFsFile] = useState<File | null>(null);
  const [oiFile, setOiFile] = useState<File | null>(null);
  const [fsText, setFsText] = useState<string>('');
  const [oiText, setOiText] = useState<string>('');
  const [extracting, setExtracting] = useState<'none' | 'fs' | 'oi'>('none');
  const [error, setError] = useState<string | null>(null);

  // Extract text from PDF using pdfjs-dist (client-side)
  const extractPDFText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF file size:', arrayBuffer.byteLength, 'bytes');
      
      // Use getDocument with proper settings
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        useSystemFonts: true,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\\n--- Page ${i} ---\\n${pageText}\\n`;
      }
      
      console.log('Extracted text length:', fullText.length, 'chars');
      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw error;
    }
  };

  const handleFSDrop = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    
    setFsFile(file);
    setExtracting('fs');
    setError(null);
    
    try {
      const text = await extractPDFText(file);
      setFsText(text);
    } catch (err) {
      setError('Failed to extract text from Financial Statements PDF');
      console.error(err);
    } finally {
      setExtracting('none');
    }
  }, []);

  const handleOIDrop = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    
    setOiFile(file);
    setExtracting('oi');
    setError(null);
    
    try {
      const text = await extractPDFText(file);
      setOiText(text);
    } catch (err) {
      setError('Failed to extract text from Annual Report PDF');
      console.error(err);
    } finally {
      setExtracting('none');
    }
  }, []);

  const handleAnalyze = () => {
    if (!fsText || !oiText) {
      setError('Please upload both PDF files before analyzing');
      return;
    }
    onAnalyze(fsText, oiText);
  };

  return (
    <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-md bg-indigo-600 p-1.5">
          <Upload className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI Auto-Fill & Document Upload</h2>
          <p className="text-xs text-slate-500">Upload PDFs to automatically extract text and cross-check using AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Financial Statements Upload */}
        <div className="relative">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Upload Audited Financial Statements (PDF)
          </label>
          <div
            className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              fsFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFSDrop(file);
            }}
          >
            {extracting === 'fs' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-600">Extracting text...</span>
              </div>
            ) : fsFile ? (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <FileText className="h-6 w-6 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">{fsFile.name}</span>
                <span className="text-xs text-emerald-600">{(fsFile.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="text-xs text-slate-500">Drag & drop or click to upload</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFSDrop(file);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Annual Report Upload */}
        <div className="relative">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Upload Annual Report / Other Information (PDF)
          </label>
          <div
            className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              oiFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleOIDrop(file);
            }}
          >
            {extracting === 'oi' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-600">Extracting text...</span>
              </div>
            ) : oiFile ? (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <FileText className="h-6 w-6 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">{oiFile.name}</span>
                <span className="text-xs text-emerald-600">{(oiFile.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="text-xs text-slate-500">Drag & drop or click to upload</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleOIDrop(file);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={isLoading || !fsText || !oiText}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing documents with AI...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Analyze & Cross-Check
          </>
        )}
      </button>

      <p className="mt-2 text-center text-xs text-slate-500">
        PDF parsing happens in your browser. No data is sent until you click analyze.
      </p>
    </div>
  );
}
