import { CATEGORY_META, PII_CATEGORY_ORDER, REDACTION_MODE_META } from '../constants/categories.js';

export const APP_PROMPT_SUMMARY =
  'SENVY is a 100% client-side Sensitive Data Protection application built in React, Vite, and Tailwind CSS. It parses plain text and RFC-4180 CSV documents locally in browser memory, detects Email, Indian Phone, IPv4, Indian PAN, Aadhaar-like numbers, and Luhn-validated payment card candidates, and applies Full Mask, Partial Mask, or deterministic Consistent Pseudonymization without server uploads, external AI, or persistent storage.';

/**
 * Deterministic heuristic exposure indicator based on detected categories and unique counts.
 * Documented transparently as a triage heuristic, NOT a security or compliance certification.
 */
export function calculateHeuristicRisk(detections, enabledCategories, dismissedIds = new Set()) {
  const uniqueAllByCategory = new Map();
  const uniqueUnredactedByCategory = new Map();

  for (const type of PII_CATEGORY_ORDER) {
    uniqueAllByCategory.set(type, new Set());
    uniqueUnredactedByCategory.set(type, new Set());
  }

  for (const det of detections) {
    uniqueAllByCategory.get(det.type)?.add(det.entityKey);

    const isCategoryEnabled = enabledCategories[det.type] !== false;
    const isDismissed = dismissedIds.has(det.id);
    if (!isCategoryEnabled || isDismissed) {
      uniqueUnredactedByCategory.get(det.type)?.add(det.entityKey);
    }
  }

  const computeBreakdown = (uniqueMap) => {
    let rawTotal = 0;
    const breakdown = [];

    for (const type of PII_CATEGORY_ORDER) {
      const count = uniqueMap.get(type)?.size || 0;
      const meta = CATEGORY_META[type];
      if (!meta || count === 0) {
        breakdown.push({ type, label: meta?.label || type, uniqueCount: 0, points: 0 });
        continue;
      }

      const points = Math.min(meta.riskCap, meta.riskBase + Math.max(0, count - 1) * meta.riskStep);
      rawTotal += points;
      breakdown.push({
        type,
        label: meta.label,
        uniqueCount: count,
        points,
      });
    }

    const score = Math.min(100, rawTotal);
    let level = 'None';
    if (score >= 80) level = 'Critical';
    else if (score >= 55) level = 'High';
    else if (score >= 25) level = 'Moderate';
    else if (score > 0) level = 'Low';

    return { score, level, breakdown };
  };

  const originalRisk = computeBreakdown(uniqueAllByCategory);
  const residualRisk = computeBreakdown(uniqueUnredactedByCategory);

  return {
    originalScore: originalRisk.score,
    originalLevel: originalRisk.level,
    originalBreakdown: originalRisk.breakdown,
    residualScore: residualRisk.score,
    residualLevel: residualRisk.level,
    residualBreakdown: residualRisk.breakdown,
  };
}

/**
 * Creates a sanitized in-memory audit event entry.
 * NEVER records original sensitive text, raw PII values, or document contents.
 */
export function createAuditEvent({
  eventType,
  title,
  inputType = 'none',
  fileName = null,
  categoriesDetected = [],
  totalDetected = 0,
  sanitizedCount = 0,
  redactionMode = null,
  detail = '',
}) {
  const now = new Date();
  return {
    id: `evt_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now.toISOString(),
    displayTime: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    eventType,
    title,
    inputType,
    fileName,
    categoriesDetected: [...categoriesDetected],
    totalDetected,
    sanitizedCount,
    redactionMode,
    detail,
  };
}

/**
 * Formats a clean, PII-free text report suitable for copying or exporting as an audit artifact.
 */
export function buildAuditSummaryText({
  summary,
  risk,
  redactionMode,
  inputMeta,
  scanDurationMs,
  exportStatus,
  events,
}) {
  const modeLabel = REDACTION_MODE_META[redactionMode]?.label || redactionMode;
  const generatedAt = new Date().toISOString();

  const categoryLines = PII_CATEGORY_ORDER.map((type) => {
    const label = CATEGORY_META[type].label;
    const total = summary.byCategory[type] || 0;
    const unique = summary.uniqueCountsByCategory[type] || 0;
    const enabled = !summary.excludedCategories.includes(type);
    return `  - ${label}: ${total} occurrence(s), ${unique} unique [${enabled ? 'SANITIZED' : 'EXCLUDED'}]`;
  }).join('\n');

  const excludedText =
    summary.excludedCategories.length > 0
      ? summary.excludedCategories.map((c) => CATEGORY_META[c]?.label || c).join(', ')
      : 'None';

  const eventLines =
    events.length > 0
      ? events
          .map(
            (ev) =>
              `  [${ev.displayTime}] ${ev.title} (${ev.eventType}) — Mode: ${
                ev.redactionMode || 'n/a'
              }${ev.detail ? ` | ${ev.detail}` : ''}`
          )
          .join('\n')
      : '  No events recorded yet.';

  return `SENVY — PRIVACY & SANITIZATION AUDIT SUMMARY
Generated: ${generatedAt}
Processing: 100% Client-Side (Browser Memory Only — Zero Network Upload)
Disclaimer: Heuristic indicators are for triage guidance only, not a security certification.

[DOCUMENT METADATA]
- Input Source: ${inputMeta.fileName || 'Pasted Text'}
- Input Type: ${inputMeta.inputTypeLabel}
- Scan Duration: ${scanDurationMs !== null ? `${scanDurationMs.toFixed(2)} ms` : 'Not scanned'}
- Redaction Mode: ${modeLabel}
- Export Status: ${exportStatus || 'Not exported yet'}

[DETECTION & SANITIZATION METRICS]
- Total PII Occurrences: ${summary.totalDetected}
- Unique Sensitive Entities: ${summary.uniqueEntities}
- Entities Sanitized: ${summary.sanitizedCount}
- Manually Dismissed: ${summary.dismissedCount}
- Excluded Categories: ${excludedText}
- Items Flagged for Review: ${summary.needsReviewCount}

[CATEGORY BREAKDOWN]
${categoryLines}

[HEURISTIC EXPOSURE INDICATOR]
- Pre-Sanitization Heuristic Score: ${risk.originalScore}/100 (${risk.originalLevel})
- Post-Sanitization Residual Score: ${risk.residualScore}/100 (${risk.residualLevel})

[SESSION AUDIT LOG (NO RAW PII RECORDED)]
${eventLines}
`;
}
