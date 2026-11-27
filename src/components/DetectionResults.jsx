import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  EyeOff,
  RotateCcw,
  Check,
  SearchX,
  ShieldCheck,
} from 'lucide-react';
import { CATEGORY_META } from '../constants/categories.js';

export default function DetectionResults({
  detections,
  enabledCategories,
  dismissedIds,
  onConfirmDetection,
  onToggleDismissDetection,
  hasScan,
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'review' | 'excluded'

  const filteredDetections = useMemo(() => {
    return detections.filter((det) => {
      const isDisabledCategory = enabledCategories[det.type] === false;
      const isDismissed = dismissedIds.has(det.id);
      const isExcluded = isDisabledCategory || isDismissed;
      const isPendingReview = det.needsReview && det.reviewStatus !== 'confirmed' && !isDismissed;

      if (filterTab === 'review') return isPendingReview;
      if (filterTab === 'excluded') return isExcluded;
      return true;
    });
  }, [detections, enabledCategories, dismissedIds, filterTab]);

  const reviewCount = detections.filter(
    (d) => d.needsReview && d.reviewStatus !== 'confirmed' && !dismissedIds.has(d.id)
  ).length;
  const excludedCount = detections.filter(
    (d) => enabledCategories[d.type] === false || dismissedIds.has(d.id)
  ).length;

  return (
    <section
      aria-label="Detection Results Panel"
      className="rounded-xl border border-[#E5EAE4] bg-white p-5 shadow-[0_1px_2px_rgba(48,58,51,0.03)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#303A33]">Detection Results</h3>
            <span className="rounded-full bg-[#EAF2EA] border border-[#C7DDCB] px-2.5 py-0.5 text-xs font-semibold text-[#303A33] tabular-nums">
              {detections.length}
            </span>
          </div>
          <p className="text-xs text-[#6B746B]">
            Values are masked in this list by default to prevent unnecessary PII exposure during
            review.
          </p>
        </div>

        {hasScan && detections.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-1">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'all'
                  ? 'bg-white text-[#303A33] shadow-2xs border border-[#E5EAE4]'
                  : 'text-[#6B746B] hover:text-[#303A33]'
              }`}
            >
              All ({detections.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('review')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'review'
                  ? 'bg-[#F7F3D9] text-[#4E4720] border border-[#E6DFB5]'
                  : 'text-[#6B746B] hover:text-[#303A33]'
              }`}
            >
              Needs Review ({reviewCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('excluded')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterTab === 'excluded'
                  ? 'bg-white text-[#303A33] shadow-2xs border border-[#E5EAE4]'
                  : 'text-[#6B746B] hover:text-[#303A33]'
              }`}
            >
              Excluded ({excludedCount})
            </button>
          </div>
        )}
      </div>

      {/* Empty / No Scan / No Detections States */}
      {!hasScan ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#C7DDCB] bg-[#F8F9F6] py-10 px-4 text-center">
          <ShieldCheck className="h-8 w-8 text-[#858D85] mb-2" />
          <p className="text-sm font-medium text-[#303A33]">No scan results yet</p>
          <p className="mt-1 text-xs text-[#6B746B] max-w-md">
            Load the demo sample or paste/upload a document and click Scan Document to inspect
            detected PII entities.
          </p>
        </div>
      ) : detections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#C7DDCB] bg-[#EAF2EA] py-10 px-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-[#668A70] mb-2" />
          <p className="text-sm font-semibold text-[#303A33]">No PII patterns detected</p>
          <p className="mt-1 text-xs text-[#545E55] max-w-md">
            SENVY found zero matches for Email, Indian Phone, PAN, Aadhaar-like numbers, Luhn-valid
            Cards, or IPv4 addresses. Always perform a manual check before sharing sensitive records.
          </p>
        </div>
      ) : filteredDetections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] py-8 px-4 text-center">
          <SearchX className="h-7 w-7 text-[#858D85] mb-2" />
          <p className="text-xs font-medium text-[#545E55]">
            No detections match this filter view.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5EAE4]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5EAE4] bg-[#F8F9F6] text-[11px] font-semibold uppercase tracking-wider text-[#6B746B]">
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3.5 py-2.5">Masked Value</th>
                <th className="px-3.5 py-2.5">Location</th>
                <th className="px-3.5 py-2.5">Confidence / Review</th>
                <th className="px-3.5 py-2.5">Output Preview</th>
                <th className="px-3.5 py-2.5 text-right">Manual Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAE4] bg-white">
              {filteredDetections.map((det) => {
                const meta = CATEGORY_META[det.type];
                const isCategoryOff = enabledCategories[det.type] === false;
                const isDismissed = dismissedIds.has(det.id);
                const isPendingReview =
                  det.needsReview && det.reviewStatus !== 'confirmed' && !isDismissed;

                return (
                  <tr
                    key={det.id}
                    className={`transition-colors hover:bg-[#F8F9F6] ${
                      isCategoryOff || isDismissed ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Category */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          meta?.badgeClass || 'bg-[#F8F9F6] text-[#303A33] border-[#E5EAE4]'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta?.dotClass}`} />
                        {meta?.label || det.type}
                      </span>
                    </td>

                    {/* Masked Value (never raw PII) */}
                    <td className="px-3.5 py-2.5 font-mono text-[#303A33] whitespace-nowrap">
                      <span>{det.maskedValue}</span>
                      {det.occurrenceCount > 1 && (
                        <span
                          className="ml-2 rounded bg-[#EAF2EA] border border-[#C7DDCB] px-1.5 py-0.5 text-[10px] font-semibold text-[#303A33]"
                          title={`Appears ${det.occurrenceCount} times in this document`}
                        >
                          ×{det.occurrenceCount}
                        </span>
                      )}
                    </td>

                    {/* Line & CSV Location */}
                    <td className="px-3.5 py-2.5 font-mono text-[#6B746B] whitespace-nowrap">
                      <span>Line {det.lineNumber}</span>
                      {det.columnName && (
                        <span className="ml-1.5 rounded bg-[#F8F9F6] border border-[#E5EAE4] px-1.5 py-0.5 text-[10px] text-[#303A33]">
                          {det.columnName}
                        </span>
                      )}
                    </td>

                    {/* Confidence & Review Indicator */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {det.reviewStatus === 'confirmed' ? (
                          <span
                            title="Manually confirmed by reviewer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#EAF2EA] border border-[#C7DDCB] px-2 py-0.5 text-[11px] font-medium text-[#303A33]"
                          >
                            <CheckCircle2 className="h-3 w-3 text-[#668A70]" />
                            Confirmed
                          </span>
                        ) : isPendingReview ? (
                          <span
                            title={det.reviewReason}
                            className="inline-flex items-center gap-1 rounded-full bg-[#F7F3D9] border border-[#E6DFB5] px-2 py-0.5 text-[11px] font-medium text-[#4E4720]"
                          >
                            <AlertCircle className="h-3 w-3 text-[#877B33]" />
                            Needs Review ({det.confidenceScore}%)
                          </span>
                        ) : (
                          <span
                            title={det.reviewReason}
                            className="inline-flex items-center gap-1 rounded-full bg-[#F8F9F6] border border-[#E5EAE4] px-2 py-0.5 text-[11px] font-medium text-[#303A33]"
                          >
                            {det.confidence === 'high' ? 'High' : 'Medium'} ({det.confidenceScore}%)
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1 text-[11px] text-[#858D85] max-w-xs truncate"
                        title={det.reviewReason}
                      >
                        {det.reviewReason}
                      </div>
                    </td>

                    {/* Output / Replacement Preview */}
                    <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
                      {isCategoryOff ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#F7F3D9] border border-[#E6DFB5] px-2 py-0.5 text-[11px] text-[#4E4720]">
                          <EyeOff className="h-3 w-3" />
                          Category Excluded
                        </span>
                      ) : isDismissed ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#F8F9F6] border border-[#E5EAE4] px-2 py-0.5 text-[11px] text-[#6B746B]">
                          Dismissed
                        </span>
                      ) : (
                        <span className="rounded bg-[#DCE9DE] border border-[#C7DDCB] px-2 py-0.5 text-[11px] font-semibold text-[#303A33]">
                          {det.replacementValue}
                        </span>
                      )}
                    </td>

                    {/* Manual Review Actions */}
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {isPendingReview && (
                          <button
                            type="button"
                            onClick={() => onConfirmDetection(det.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#789B81] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#668A70] transition-colors"
                            title="Confirm this match is true PII"
                          >
                            <Check className="h-3 w-3" />
                            <span>Confirm</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleDismissDetection(det.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            isDismissed
                              ? 'border-[#CFE0F2] bg-[#E8F1FA] text-[#303A33] hover:bg-[#DCEAF7]'
                              : 'border-[#E5EAE4] bg-[#F8F9F6] text-[#303A33] hover:bg-[#EAF2EA]'
                          }`}
                          title={
                            isDismissed
                              ? 'Restore this item to sanitization'
                              : 'Mark as false positive and keep visible in output'
                          }
                        >
                          {isDismissed ? (
                            <>
                              <RotateCcw className="h-3 w-3 text-[#4D749D]" />
                              <span>Restore</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 text-[#6B746B]" />
                              <span>Dismiss</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
