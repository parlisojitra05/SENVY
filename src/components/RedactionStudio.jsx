import React, { useState } from 'react';
import { Columns2, Table2, Code2, KeyRound, Sparkles } from 'lucide-react';
import { CATEGORY_META, REDACTION_MODES } from '../constants/categories.js';
import RedactionModeSelector from './RedactionModeSelector.jsx';
import CategoryFilters from './CategoryFilters.jsx';
import OriginalPreview from './OriginalPreview.jsx';
import SanitizedPreview from './SanitizedPreview.jsx';
import ExportActions from './ExportActions.jsx';

export default function RedactionStudio({
  hasScan,
  rawText,
  redactionResult,
  redactionMode,
  onChangeMode,
  enabledCategories,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  summary,
  isCsv,
  pseudonymEntries,
  onCopySanitized,
  onDownloadTXT,
  onDownloadCSV,
  exportFeedback,
  onLoadSampleText,
  onLoadSampleCSV,
  onGoToScan,
}) {
  const [csvViewMode, setCsvViewMode] = useState('raw'); // 'raw' | 'table'

  if (!hasScan) {
    return (
      <div className="rounded-xl border border-[#E5EAE4] bg-white p-10 text-center shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2EA] border border-[#C7DDCB] mb-4">
          <Columns2 className="h-6 w-6 text-[#668A70]" />
        </div>
        <h2 className="text-lg font-semibold text-[#303A33]">Redaction Studio Ready</h2>
        <p className="mt-2 text-sm text-[#5E675E] max-w-lg mx-auto">
          Scan a document or load sample data first to compare Original vs. Sanitized outputs side
          by side across Full Mask, Partial Mask, and Consistent Pseudonymization modes.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onLoadSampleText}
            className="inline-flex items-center gap-2 rounded-lg bg-[#789B81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#668A70] transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>Load Sample Text & Compare</span>
          </button>
          <button
            type="button"
            onClick={onLoadSampleCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-[#C7DDCB] bg-[#EAF2EA] px-4 py-2 text-xs font-medium text-[#303A33] hover:bg-[#DCE9DE] transition-colors"
          >
            <span>Load Sample CSV</span>
          </button>
          <button
            type="button"
            onClick={onGoToScan}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5EAE4] bg-white px-4 py-2 text-xs font-medium text-[#303A33] hover:bg-[#F8F9F6] transition-colors"
          >
            <span>Go to Scan Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Mode & Category Controls */}
      <RedactionModeSelector mode={redactionMode} onChangeMode={onChangeMode} />

      <CategoryFilters
        enabledCategories={enabledCategories}
        onToggleCategory={onToggleCategory}
        onSelectAll={onSelectAllCategories}
        onDeselectAll={onDeselectAllCategories}
        summary={summary}
        hasScan={hasScan}
      />

      {/* Toolbar for Side-by-Side Comparison */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAE4] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-[#303A33]">Side-by-Side Comparison</span>
          {isCsv && (
            <div className="inline-flex rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-0.5">
              <button
                type="button"
                onClick={() => setCsvViewMode('raw')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  csvViewMode === 'raw'
                    ? 'bg-white text-[#303A33] shadow-2xs border border-[#E5EAE4]'
                    : 'text-[#6B746B] hover:text-[#303A33]'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Raw CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setCsvViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  csvViewMode === 'table'
                    ? 'bg-white text-[#303A33] shadow-2xs border border-[#E5EAE4]'
                    : 'text-[#6B746B] hover:text-[#303A33]'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                <span>Table View</span>
              </button>
            </div>
          )}
        </div>

        <ExportActions
          onCopy={onCopySanitized}
          onDownloadTXT={onDownloadTXT}
          onDownloadCSV={onDownloadCSV}
          isCsv={isCsv}
          disabled={!redactionResult.sanitizedText}
          feedbackMessage={exportFeedback}
        />
      </div>

      {/* Side-by-Side Left (Original) & Right (Sanitized) Panels */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OriginalPreview
          segments={redactionResult.originalSegments}
          rawText={rawText}
          isCsv={isCsv}
          viewMode={csvViewMode}
          tableRows={redactionResult.tableRows}
          enabledCategories={enabledCategories}
        />

        <SanitizedPreview
          segments={redactionResult.sanitizedSegments}
          sanitizedText={redactionResult.sanitizedText}
          redactionMode={redactionMode}
          isCsv={isCsv}
          viewMode={csvViewMode}
          tableRows={redactionResult.tableRows}
          onCopySanitized={onCopySanitized}
          onDownloadTXT={onDownloadTXT}
          onDownloadCSV={onDownloadCSV}
          feedbackMessage={exportFeedback}
          hasOutput={Boolean(redactionResult.sanitizedText)}
        />
      </div>

      {/* Pseudonym Mapping Consistency Reference (never displays raw PII) */}
      {redactionMode === REDACTION_MODES.PSEUDONYM && pseudonymEntries.length > 0 && (
        <section
          aria-label="Consistent Pseudonym Mapping Table"
          className="rounded-xl border border-[#C7DDCB] bg-white p-4 shadow-[0_1px_2px_rgba(48,58,51,0.03)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#668A70]" />
              <h3 className="text-sm font-semibold text-[#303A33]">
                Session Pseudonymization Map (Masked Reference)
              </h3>
            </div>
            <span className="text-xs text-[#6B746B]">
              Identical canonical entities reuse the exact same ID across the entire document.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pseudonymEntries.map((entry) => {
              const meta = CATEGORY_META[entry.type];
              const isEnabled = enabledCategories[entry.type] !== false;
              return (
                <div
                  key={entry.entityKey}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                    isEnabled
                      ? 'border-[#E5EAE4] bg-[#F8F9F6]'
                      : 'border-[#E6DFB5] bg-[#F7F3D9]/70 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${meta?.dotClass}`} />
                    <span className="font-mono text-[#303A33] truncate">{entry.maskedPreview}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[#858D85]">→</span>
                    <span className="rounded bg-[#DCE9DE] border border-[#C7DDCB] px-2 py-0.5 font-mono font-semibold text-[#303A33]">
                      {isEnabled ? entry.pseudonym : 'Excluded'}
                    </span>
                    {entry.occurrences > 1 && (
                      <span className="text-[10px] font-semibold text-[#6B746B]">
                        ×{entry.occurrences}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
