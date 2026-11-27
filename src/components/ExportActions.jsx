import React from 'react';
import { Copy, Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';

export default function ExportActions({
  onCopy,
  onDownloadTXT,
  onDownloadCSV,
  isCsv = false,
  disabled = false,
  feedbackMessage = '',
  compact = false,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-white px-3 py-1.5 text-xs font-medium text-[#303A33] hover:bg-[#EAF2EA] disabled:opacity-45 disabled:pointer-events-none transition-colors"
      >
        <Copy className="h-3.5 w-3.5 text-[#668A70]" />
        <span>Copy</span>
      </button>

      <button
        type="button"
        onClick={onDownloadTXT}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-45 disabled:pointer-events-none transition-colors ${
          !isCsv
            ? 'bg-[#789B81] text-white hover:bg-[#668A70]'
            : 'border border-[#E5EAE4] bg-white text-[#303A33] hover:bg-[#EAF2EA]'
        }`}
        title="Download sanitized plain text (.txt)"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>{compact ? '.TXT' : 'Download .TXT'}</span>
      </button>

      <button
        type="button"
        onClick={onDownloadCSV}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-45 disabled:pointer-events-none transition-colors ${
          isCsv
            ? 'bg-[#789B81] text-white hover:bg-[#668A70]'
            : 'border border-[#E5EAE4] bg-white text-[#303A33] hover:bg-[#EAF2EA]'
        }`}
        title={
          isCsv
            ? 'Download valid RFC-4180 sanitized CSV preserving rows, columns, and quoting'
            : 'Download line-indexed valid RFC-4180 CSV export'
        }
      >
        {compact ? <Download className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
        <span>{compact ? '.CSV' : 'Download .CSV'}</span>
      </button>

      {feedbackMessage && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF2EA] border border-[#C7DDCB] px-2.5 py-1 text-[11px] font-medium text-[#303A33]">
          <CheckCircle2 className="h-3 w-3 text-[#668A70] shrink-0" />
          <span>{feedbackMessage}</span>
        </span>
      )}
    </div>
  );
}
