import { CATEGORY_META, PII_TYPES, REDACTION_MODES } from '../constants/categories.js';
import { normalizeEntityValue } from './validators.js';

/**
 * Full Mask replacement token.
 */
export const FULL_MASK_TOKEN = '[REDACTED]';

/**
 * Produces a category-aware partial mask that hides sensitive information while
 * retaining minimal verification hints.
 */
export function createPartialMask(type, rawValue) {
  if (typeof rawValue !== 'string' || rawValue.length === 0) return FULL_MASK_TOKEN;

  switch (type) {
    case PII_TYPES.EMAIL: {
      const atIndex = rawValue.indexOf('@');
      if (atIndex === -1) return '***';
      const local = rawValue.slice(0, atIndex);
      const domain = rawValue.slice(atIndex + 1);
      const maskedLocal = local.length > 1 ? `${local[0]}***` : '*';

      const lastDot = domain.lastIndexOf('.');
      if (lastDot <= 0) {
        return `${maskedLocal}@${domain[0] || '*'}***`;
      }
      const domainName = domain.slice(0, lastDot);
      const tld = domain.slice(lastDot + 1);
      const maskedDomain = `${domainName[0] || '*'}***`;
      return `${maskedLocal}@${maskedDomain}.${tld}`;
    }

    case PII_TYPES.PHONE: {
      const digits = rawValue.replace(/\D/g, '');
      if (digits.length <= 4) return '*'.repeat(digits.length);
      let seenDigits = 0;
      const maskUpTo = digits.length - 4;
      let result = '';
      for (let i = 0; i < rawValue.length; i += 1) {
        const ch = rawValue[i];
        if (/\d/.test(ch)) {
          result += seenDigits < maskUpTo ? '*' : ch;
          seenDigits += 1;
        } else {
          result += ch;
        }
      }
      return result;
    }

    case PII_TYPES.PAN: {
      const clean = rawValue.trim();
      if (clean.length !== 10) return 'XXXXXXXXXX';
      return `XXXXX${clean.slice(5, 9)}X`;
    }

    case PII_TYPES.AADHAAR:
    case PII_TYPES.CARD: {
      const digits = rawValue.replace(/\D/g, '');
      if (digits.length <= 4) return 'X'.repeat(digits.length);
      let seenDigits = 0;
      const maskUpTo = digits.length - 4;
      let result = '';
      for (let i = 0; i < rawValue.length; i += 1) {
        const ch = rawValue[i];
        if (/\d/.test(ch)) {
          result += seenDigits < maskUpTo ? 'X' : ch;
          seenDigits += 1;
        } else {
          result += ch;
        }
      }
      return result;
    }

    case PII_TYPES.IPV4: {
      const parts = rawValue.split('.');
      if (parts.length !== 4) return 'XXX.XXX.XXX.XXX';
      return `${'X'.repeat(parts[0].length)}.${'X'.repeat(parts[1].length)}.${'X'.repeat(parts[2].length)}.${parts[3]}`;
    }

    default:
      return FULL_MASK_TOKEN;
  }
}

/**
 * Builds deterministic pseudonym mappings for all detections in order of first appearance.
 * Repeated canonical entities across the document always map to the same synthetic ID.
 */
export function buildPseudonymSessionMap(detections) {
  const counters = {};
  const entityMap = new Map();
  const entries = [];

  for (const det of detections) {
    const normalized = det.normalizedValue || normalizeEntityValue(det.type, det.originalValue);
    const key = det.entityKey || `${det.type}::${normalized}`;

    if (!entityMap.has(key)) {
      const prefix = CATEGORY_META[det.type]?.pseudonymPrefix || det.type;
      counters[det.type] = (counters[det.type] || 0) + 1;
      const padded = String(counters[det.type]).padStart(2, '0');
      const pseudonym = `${prefix}_${padded}`;
      entityMap.set(key, pseudonym);
      entries.push({
        entityKey: key,
        type: det.type,
        pseudonym,
        maskedPreview: det.maskedValue || createPartialMask(det.type, det.originalValue),
        occurrences: det.occurrenceCount || 1,
      });
    }
  }

  return { entityMap, entries };
}

/**
 * Computes the replacement string for a single detection under the selected redaction mode.
 */
export function getReplacementValue(detection, mode, pseudonymMap) {
  switch (mode) {
    case REDACTION_MODES.FULL:
      return FULL_MASK_TOKEN;
    case REDACTION_MODES.PARTIAL:
      return createPartialMask(detection.type, detection.originalValue);
    case REDACTION_MODES.PSEUDONYM: {
      const key =
        detection.entityKey ||
        `${detection.type}::${normalizeEntityValue(detection.type, detection.originalValue)}`;
      return pseudonymMap?.get(key) || `${CATEGORY_META[detection.type]?.pseudonymPrefix || detection.type}_01`;
    }
    default:
      return FULL_MASK_TOKEN;
  }
}

/**
 * Applies redaction rules to plain text given sorted non-overlapping detections,
 * enabled categories, dismissed IDs, active redaction mode, and session pseudonym map.
 * Returns both exact plain output string and rich diff segments for highlighting.
 */
export function applyRedactionToText(
  text,
  detections,
  {
    mode = REDACTION_MODES.FULL,
    enabledCategories = {},
    dismissedIds = new Set(),
    pseudonymMap = new Map(),
  } = {}
) {
  if (typeof text !== 'string') {
    return { sanitizedText: '', originalSegments: [], sanitizedSegments: [], enrichedDetections: [] };
  }

  const sorted = [...detections].sort((a, b) => a.startIndex - b.startIndex);
  const originalSegments = [];
  const sanitizedSegments = [];
  const enrichedDetections = [];
  let cursor = 0;

  for (const det of sorted) {
    if (det.startIndex > cursor) {
      const plain = text.slice(cursor, det.startIndex);
      originalSegments.push({ text: plain, kind: 'plain' });
      sanitizedSegments.push({ text: plain, kind: 'plain' });
    }

    const isCategoryEnabled = enabledCategories[det.type] !== false;
    const isDismissed = dismissedIds.has(det.id);
    const isActive = isCategoryEnabled && !isDismissed;
    const replacementValue = isActive
      ? getReplacementValue(det, mode, pseudonymMap)
      : det.originalValue;

    originalSegments.push({
      text: det.originalValue,
      kind: isActive ? 'pii' : 'excluded',
      type: det.type,
      detectionId: det.id,
      needsReview: det.needsReview && det.reviewStatus !== 'confirmed',
      isExcluded: !isActive,
      exclusionReason: !isCategoryEnabled ? 'category_disabled' : isDismissed ? 'dismissed' : null,
    });

    sanitizedSegments.push({
      text: replacementValue,
      kind: isActive ? 'redacted' : 'excluded',
      type: det.type,
      detectionId: det.id,
      mode,
      isExcluded: !isActive,
      exclusionReason: !isCategoryEnabled ? 'category_disabled' : isDismissed ? 'dismissed' : null,
    });

    enrichedDetections.push({
      ...det,
      isActive,
      isCategoryEnabled,
      isDismissed,
      replacementValue,
    });

    cursor = det.endIndex;
  }

  if (cursor < text.length) {
    const trailing = text.slice(cursor);
    originalSegments.push({ text: trailing, kind: 'plain' });
    sanitizedSegments.push({ text: trailing, kind: 'plain' });
  }

  const sanitizedText = sanitizedSegments.map((seg) => seg.text).join('');

  return {
    sanitizedText,
    originalSegments,
    sanitizedSegments,
    enrichedDetections,
  };
}
