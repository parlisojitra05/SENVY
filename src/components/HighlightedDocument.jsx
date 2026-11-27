import React, { useMemo } from 'react';
import { CATEGORY_META } from '../constants/categories.js';
import { LARGE_HIGHLIGHT_THRESHOLD_CHARS } from '../utils/fileValidation.js';

/**
 * Splits a flat array of text segments into lines while preserving segment highlighting spans
 * even when a segment contains internal newline characters (e.g., multiline CSV cells).
 */
function splitSegmentsIntoLines(segments) {
  const lines = [[]];

  for (const seg of segments) {
    if (!seg || !seg.text) continue;
    const parts = seg.text.split(/\r\n|\r|\n/);

    for (let i = 0; i < parts.length; i += 1) {
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({
          ...seg,
          text: parts[i],
        });
      }
      if (i < parts.length - 1) {
        lines.push([]);
      }
    }
  }

  return lines;
}

export default function HighlightedDocument({
  segments,
  rawFallbackText = '',
  variant = 'original', // 'original' | 'sanitized'
}) {
  const { visibleLines, isTruncated } = useMemo(() => {
    if (!segments || segments.length === 0) {
      if (!rawFallbackText) return { visibleLines: [], isTruncated: false };
      const sliced = rawFallbackText.slice(0, LARGE_HIGHLIGHT_THRESHOLD_CHARS);
      return {
        visibleLines: splitSegmentsIntoLines([{ text: sliced, kind: 'plain' }]),
        isTruncated: rawFallbackText.length > LARGE_HIGHLIGHT_THRESHOLD_CHARS,
      };
    }

    let accumulated = 0;
    const boundedSegments = [];
    let truncated = false;

    for (const seg of segments) {
      if (accumulated >= LARGE_HIGHLIGHT_THRESHOLD_CHARS) {
        truncated = true;
        break;
      }
      const remaining = LARGE_HIGHLIGHT_THRESHOLD_CHARS - accumulated;
      if (seg.text.length > remaining) {
        boundedSegments.push({ ...seg, text: seg.text.slice(0, remaining) });
        truncated = true;
        break;
      }
      boundedSegments.push(seg);
      accumulated += seg.text.length;
    }

    return {
      visibleLines: splitSegmentsIntoLines(boundedSegments),
      isTruncated: truncated,
    };
  }, [segments, rawFallbackText]);

  if (visibleLines.length === 0) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-6 text-xs text-[#858D85]">
        No document content to preview.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E5EAE4] bg-white overflow-hidden">
      {isTruncated && (
        <div className="border-b border-[#E6DFB5] bg-[#F7F3D9] px-3 py-1.5 text-[11px] text-[#4E4720]">
          Preview truncated at {LARGE_HIGHLIGHT_THRESHOLD_CHARS.toLocaleString()} characters for
          smooth rendering. Full document scanning and export remain 100% complete.
        </div>
      )}

      <div className="max-h-[480px] overflow-auto font-mono text-xs leading-6">
        <table className="w-full border-collapse">
          <tbody>
            {visibleLines.map((lineSegs, idx) => (
              <tr key={idx} className="hover:bg-[#F8F9F6]">
                <td
                  className="w-11 select-none border-r border-[#E5EAE4] bg-[#F8F9F6] px-2.5 py-0.5 text-right text-[11px] text-[#858D85] align-top tabular-nums"
                  aria-hidden="true"
                >
                  {idx + 1}
                </td>
                <td className="px-3.5 py-0.5 whitespace-pre-wrap break-words text-[#303A33] align-top">
                  {lineSegs.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    lineSegs.map((seg, segIdx) => {
                      if (seg.kind === 'plain') {
                        return <span key={segIdx}>{seg.text}</span>;
                      }

                      const catMeta = CATEGORY_META[seg.type];
                      if (seg.kind === 'excluded' || seg.isExcluded) {
                        const reasonText =
                          seg.exclusionReason === 'category_disabled'
                            ? `${catMeta?.label || seg.type} (excluded by category filter — kept visible)`
                            : `${catMeta?.label || seg.type} (manually dismissed — kept visible)`;
                        return (
                          <span
                            key={segIdx}
                            title={reasonText}
                            className="rounded px-1 py-0.5 border border-dashed border-[#CFC37A] bg-[#F7F3D9] text-[#4E4720]"
                          >
                            {seg.text}
                          </span>
                        );
                      }

                      if (variant === 'original') {
                        return (
                          <mark
                            key={segIdx}
                            title={`${catMeta?.label || seg.type}${
                              seg.needsReview ? ' (Needs manual review)' : ''
                            }`}
                            className={`rounded px-1 py-0.5 ${
                              catMeta?.highlightClass || 'bg-[#EAF2EA] text-[#303A33]'
                            } ${seg.needsReview ? 'ring-1 ring-[#CFC37A]' : ''}`}
                          >
                            {seg.text}
                          </mark>
                        );
                      }

                      // Sanitized highlight
                      return (
                        <span
                          key={segIdx}
                          title={`Sanitized ${catMeta?.label || seg.type}`}
                          className="rounded bg-[#DCE9DE] border border-[#C7DDCB] px-1.5 py-0.5 font-semibold text-[#303A33]"
                        >
                          {seg.text}
                        </span>
                      );
                    })
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
