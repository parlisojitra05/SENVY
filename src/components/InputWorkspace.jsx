import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  ScanSearch,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation.js';

export default function InputWorkspace({
  rawText,
  onTextChange,
  onFileUpload,
  onLoadSampleText,
  onLoadSampleCSV,
  onScan,
  onClear,
  onChangeFormat,
  inputMeta,
  scanStatus,
  isDirtySinceScan,
  errorMessage,
  csvWarnings = [],
  isSampleData,
  hasScan,
  detectionCount,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      onFileUpload(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
    e.target.value = '';
  };

  const lineCount = rawText ? rawText.split(/\r\n|\r|\n/).length : 0;
  const charCount = rawText ? rawText.length : 0;

  let statusPill = {
    label: 'Waiting for input',
    className: 'bg-[#F8F9F6] text-[#6B746B] border-[#E5EAE4]',
  };
  if (scanStatus === 'error') {
    statusPill = {
      label: 'Input Error',
      className: 'bg-[#F8E7E9] text-[#5C2B31] border-[#EBD0D3]',
    };
  } else if (scanStatus === 'scanning') {
    statusPill = {
      label: 'Scanning locally…',
      className: 'bg-[#EAF2EA] text-[#303A33] border-[#C7DDCB]',
    };
  } else if (hasScan && isDirtySinceScan) {
    statusPill = {
      label: 'Modified — Re-scan needed',
      className: 'bg-[#F7F3D9] text-[#4E4720] border-[#E6DFB5]',
    };
  } else if (hasScan) {
    statusPill = {
      label: `Scanned · ${detectionCount} match${detectionCount === 1 ? '' : 'es'}`,
      className: 'bg-[#EAF2EA] text-[#303A33] border-[#C7DDCB]',
    };
  } else if (rawText.trim().length > 0) {
    statusPill = {
      label: 'Ready to scan',
      className: 'bg-[#E8F1FA] text-[#303A33] border-[#CFE0F2]',
    };
  }

  return (
    <section
      aria-label="Document Input Workspace"
      className="rounded-xl border border-[#E5EAE4] bg-white p-5 shadow-[0_1px_3px_rgba(48,58,51,0.04)]"
    >
      {/* Workspace Header & Sample Loaders */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#303A33]">Document Scanning Workspace</h2>
          <p className="text-xs text-[#6B746B]">
            Paste raw text or drop a{' '}
            <code className="rounded bg-[#EAF2EA] px-1 py-0.5 text-[#303A33]">.txt</code> /{' '}
            <code className="rounded bg-[#EAF2EA] px-1 py-0.5 text-[#303A33]">.csv</code> file to
            detect and sanitize PII locally.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLoadSampleText}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7DDCB] bg-[#EAF2EA] px-3 py-1.5 text-xs font-semibold text-[#303A33] hover:bg-[#DCE9DE] transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#668A70]" />
            <span>Load Sample Text</span>
          </button>

          <button
            type="button"
            onClick={onLoadSampleCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-3 py-1.5 text-xs font-medium text-[#303A33] hover:bg-[#EAF2EA] hover:border-[#C7DDCB] transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#668A70]" />
            <span>Load Sample CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-white px-3 py-1.5 text-xs font-medium text-[#303A33] hover:bg-[#F8F9F6] hover:border-[#C7DDCB] transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-[#638EBA]" />
            <span>Upload .TXT / .CSV</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload TXT or CSV file"
          />
        </div>
      </div>

      {/* Demo Data Notice */}
      {isSampleData && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#CFE0F2] bg-[#E8F1FA] px-3.5 py-2 text-xs text-[#303A33]">
          <Info className="h-4 w-4 text-[#4D749D] shrink-0" />
          <span>
            <strong className="font-semibold">DEMO DATA — NOT REAL PERSONAL INFORMATION:</strong>{' '}
            Loaded synthetic sample showcasing all 6 PII categories and repeated entity mapping.
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2.5 rounded-lg border border-[#EBD0D3] bg-[#F8E7E9] px-3.5 py-2.5 text-xs text-[#5C2B31]"
        >
          <AlertTriangle className="h-4 w-4 text-[#9A525B] shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CSV Format Warnings */}
      {csvWarnings.length > 0 && (
        <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-[#E6DFB5] bg-[#F7F3D9] px-3.5 py-2.5 text-xs text-[#4E4720]">
          <AlertTriangle className="h-4 w-4 text-[#877B33] shrink-0 mt-0.5" />
          <div className="space-y-1">
            {csvWarnings.map((warning, i) => (
              <div key={i}>{warning}</div>
            ))}
          </div>
        </div>
      )}

      {/* File Metadata & Status Strip */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3 text-xs">
        <div className="min-w-0">
          <span className="block text-[11px] text-[#858D85]">File Name</span>
          <span className="mt-0.5 flex items-center gap-1.5 font-medium text-[#303A33] truncate">
            {inputMeta.format === 'csv' ? (
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#668A70] shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-[#4D749D] shrink-0" />
            )}
            <span className="truncate">{inputMeta.fileName || 'Pasted Text Buffer'}</span>
          </span>
        </div>

        <div>
          <span className="block text-[11px] text-[#858D85]">Input Type & Parser Mode</span>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-medium text-[#303A33]">{inputMeta.inputTypeLabel}</span>
            {onChangeFormat && (
              <div className="inline-flex rounded-md border border-[#E5EAE4] bg-white p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => onChangeFormat('text')}
                  className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                    inputMeta.format !== 'csv'
                      ? 'bg-[#DCE9DE] text-[#303A33]'
                      : 'text-[#858D85] hover:text-[#303A33]'
                  }`}
                >
                  TXT
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFormat('csv')}
                  className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                    inputMeta.format === 'csv'
                      ? 'bg-[#DCE9DE] text-[#303A33]'
                      : 'text-[#858D85] hover:text-[#303A33]'
                  }`}
                >
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <span className="block text-[11px] text-[#858D85]">Size / Volume</span>
          <span className="mt-0.5 block font-mono text-[#303A33]">
            {inputMeta.fileSize !== null
              ? formatFileSize(inputMeta.fileSize)
              : `${charCount.toLocaleString()} chars · ${lineCount} ln`}
          </span>
        </div>

        <div className="flex flex-col justify-center sm:items-end">
          <span className="block text-[11px] text-[#858D85] sm:text-right">Scan Status</span>
          <span
            className={`mt-0.5 inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill.className}`}
          >
            {hasScan && !isDirtySinceScan && <CheckCircle2 className="h-3 w-3 text-[#668A70]" />}
            {statusPill.label}
          </span>
        </div>
      </div>

      {/* Drag & Drop + Textarea */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg border border-dashed transition-all ${
          isDragging
            ? 'border-[#789B81] bg-[#EAF2EA]'
            : 'border-[#C7DDCB] bg-[#F8F9F6] focus-within:border-[#789B81] focus-within:bg-white'
        }`}
      >
        <textarea
          value={rawText}
          onChange={(e) => onTextChange(e.target.value)}
          rows={9}
          spellCheck={false}
          aria-label="Paste raw text or drop a TXT or CSV file"
          placeholder={`Paste text containing emails, Indian mobile numbers, PAN, Aadhaar, card numbers, or IPv4 addresses — or drag & drop a .txt / .csv file here.\n\nTip: Click "Load Sample Text" or "Load Sample CSV" above for an instant hackathon demonstration.`}
          className="w-full resize-y rounded-lg bg-transparent p-4 font-mono text-xs sm:text-sm leading-relaxed text-[#303A33] placeholder:text-[#858D85] focus:outline-none min-h-[200px]"
        />

        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-[#EAF2EA]/95 backdrop-blur-xs">
            <Upload className="h-8 w-8 text-[#668A70] mb-2" />
            <p className="text-sm font-semibold text-[#303A33]">
              Drop .TXT or .CSV file to load locally
            </p>
            <p className="text-xs text-[#6B746B] mt-1">Processed strictly in browser memory</p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#858D85] font-mono">
          {charCount > 0
            ? `${charCount.toLocaleString()} characters · ${lineCount.toLocaleString()} line${
                lineCount === 1 ? '' : 's'
              }`
            : 'No document loaded'}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onClear}
            disabled={!rawText && !hasScan && !inputMeta.fileName}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-white px-3.5 py-2 text-xs font-medium text-[#303A33] hover:bg-[#F8F9F6] disabled:opacity-45 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-[#858D85]" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={onScan}
            className="inline-flex items-center gap-2 rounded-lg bg-[#789B81] px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#668A70] active:scale-[0.99] transition-all"
          >
            <ScanSearch className="h-4 w-4" />
            <span>{hasScan && !isDirtySinceScan ? 'Re-Scan Document' : 'Scan Document'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
