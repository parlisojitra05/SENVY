import React from 'react';
import HighlightedDocument from './HighlightedDocument.jsx';
import ExportActions from './ExportActions.jsx';
import { REDACTION_MODE_META } from '../constants/categories.js';

export default function SanitizedPreview({
  segments,
  sanitizedText,
  redactionMode,
  isCsv,
  viewMode,
  tableRows,
  onCopySanitized,
  onDownloadTXT,
  onDownloadCSV,
  feedbackMessage,
  hasOutput,
}) {
  const modeMeta = REDACTION_MODE_META[redactionMode];

  return (
    <div className="flex flex-col rounded-xl border border-[#C7DDCB] bg-white p-4 h-full shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#EAF2EA] border border-[#C7DDCB] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#303A33]">
            Sanitized
          </span>
          <span className="text-xs text-[#6B746B]">
            Live output · <strong className="text-[#303A33]">{modeMeta?.label}</strong>
          </span>
        </div>

        <ExportActions
          onCopy={onCopySanitized}
          onDownloadTXT={onDownloadTXT}
          onDownloadCSV={onDownloadCSV}
          isCsv={isCsv}
          disabled={!hasOutput}
          feedbackMessage={feedbackMessage}
          compact
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-[#DCE9DE] border border-[#C7DDCB] px-1.5 py-0.5 font-semibold text-[#303A33]">
            Sanitized Token
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-dashed border-[#CFC37A] bg-[#F7F3D9] px-1.5 py-0.5 text-[#4E4720]">
            Excluded (Visible)
          </span>
        </div>
        <span className="text-[#858D85]">Generated locally by SENVY masking engine</span>
      </div>

      {isCsv && viewMode === 'table' && tableRows && tableRows.length > 0 ? (
        <div className="max-h-[480px] overflow-auto rounded-lg border border-[#E5EAE4] bg-white">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 z-10 bg-[#EAF2EA] border-b border-[#E5EAE4]">
              <tr>
                <th className="px-2.5 py-2 text-[10px] text-[#6B746B] border-r border-[#E5EAE4]">
                  #
                </th>
                {tableRows[0].map((headerCell, cIdx) => (
                  <th
                    key={cIdx}
                    className="px-3 py-2 text-[11px] font-semibold text-[#303A33] border-r border-[#E5EAE4] last:border-r-0 whitespace-nowrap"
                  >
                    {headerCell.sanitizedValue || `Col ${cIdx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAE4]">
              {tableRows.slice(1).map((rowCells, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F8F9F6]">
                  <td className="px-2.5 py-2 text-[11px] text-[#858D85] border-r border-[#E5EAE4] bg-[#F8F9F6] select-none">
                    {rIdx + 1}
                  </td>
                  {rowCells.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 text-[#303A33] border-r border-[#E5EAE4] last:border-r-0 align-top whitespace-pre-wrap break-words max-w-[260px]"
                    >
                      {cell.sanitizedSegments.map((seg, sIdx) => {
                        if (seg.kind === 'plain') return <span key={sIdx}>{seg.text}</span>;
                        if (seg.isExcluded) {
                          return (
                            <span
                              key={sIdx}
                              className="rounded px-1 py-0.5 border border-dashed border-[#CFC37A] bg-[#F7F3D9] text-[#4E4720]"
                            >
                              {seg.text}
                            </span>
                          );
                        }
                        return (
                          <span
                            key={sIdx}
                            className="rounded bg-[#DCE9DE] border border-[#C7DDCB] px-1.5 py-0.5 font-semibold text-[#303A33]"
                          >
                            {seg.text}
                          </span>
                        );
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <HighlightedDocument
          segments={segments}
          rawFallbackText={sanitizedText}
          variant="sanitized"
        />
      )}
    </div>
  );
}
