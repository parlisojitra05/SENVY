import { PII_TYPES } from '../constants/categories.js';
import {
  detectCardBrandHint,
  isValidIPv4,
  normalizeEntityValue,
  passesLuhn,
  passesVerhoeff,
  validatePanStructure,
} from './validators.js';
import { createPartialMask } from './maskingEngine.js';

const TYPE_PRIORITY = {
  [PII_TYPES.EMAIL]: 6,
  [PII_TYPES.CARD]: 5,
  [PII_TYPES.PAN]: 4,
  [PII_TYPES.IPV4]: 3,
  [PII_TYPES.AADHAAR]: 2,
  [PII_TYPES.PHONE]: 1,
};

const AADHAAR_POSITIVE_CONTEXT_RE = /\b(aadhaar|aadhar|uidai|uid|vid|ekyc|kyc|aadhaar_id|aadhaar_no|aadhaar_number)\b/i;
const AADHAAR_NEGATIVE_CONTEXT_RE = /\b(order|ord|invoice|inv|receipt|txn|transaction|txid|tracking|awb|sku|barcode|ean|upc|timestamp|epoch|serial|ref|reference|ticket|parcel|shipment|batch|lot|voucher|meter|account|acct|policy|gstin|ifsc|micr|build|port)\b/i;

const PHONE_POSITIVE_CONTEXT_RE = /\b(phone|mobile|mob|tel|telephone|cell|contact|whatsapp|call|callback|helpline)\b/i;
const PHONE_NEGATIVE_CONTEXT_RE = /\b(order|ord|invoice|inv|tracking|awb|sku|timestamp|epoch|serial|account|acct|port|voucher|batch)\b/i;

const PAN_POSITIVE_CONTEXT_RE = /\b(pan|permanent\s+account|tax\s*id|income\s+tax|kyc)\b/i;
const CARD_POSITIVE_CONTEXT_RE = /\b(card|visa|mastercard|rupay|amex|credit|debit|payment|billing|cc)\b/i;

/**
 * Computes line numbers (1-based) for fast offset -> lineNumber lookup.
 */
function buildLineIndex(text) {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
}

function getLineNumberAt(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineStarts[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return high + 1;
}

function getLineContextWindow(text, start, end, radius = 64) {
  const lineStartIdx = Math.max(0, text.lastIndexOf('\n', start - 1) + 1);
  const nextNewline = text.indexOf('\n', end);
  const lineEndIdx = nextNewline === -1 ? text.length : nextNewline;

  const before = text.slice(Math.max(lineStartIdx, start - radius), start);
  const after = text.slice(end, Math.min(lineEndIdx, end + radius));
  return `${before} ${after}`;
}

function detectEmails(text) {
  const candidates = [];
  const regex =
    /(?<![A-Za-z0-9._%+-])([A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24})(?![A-Za-z0-9_%+-]|\.[A-Za-z0-9_%+-])/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    const [localPart, domainPart] = value.split('@');
    if (!localPart || !domainPart || localPart.includes('..') || domainPart.includes('..')) {
      continue;
    }

    candidates.push({
      type: PII_TYPES.EMAIL,
      originalValue: value,
      startIndex: match.index,
      endIndex: match.index + value.length,
      confidence: 'high',
      confidenceScore: 96,
      needsReview: false,
      reviewReason: 'Valid local@domain.tld structure',
    });
  }
  return candidates;
}

function detectCards(text, extraContext = '') {
  const candidates = [];
  const regex =
    /(?<![\dA-Za-z_-]|\d\.)((?:\d{4}(?:[ -]\d{4}){2,3}(?:[ -]\d{1,3})?|\d{4}[ -]\d{6}[ -]\d{4,5}|\d{13,19}))(?![\dA-Za-z_-]|\.\d)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;
    const digits = value.replace(/[\s-]/g, '');

    if (!passesLuhn(digits)) {
      continue;
    }

    const context = `${extraContext} ${getLineContextWindow(text, startIndex, endIndex)}`;
    const hasCardContext = CARD_POSITIVE_CONTEXT_RE.test(context);
    const brandHint = detectCardBrandHint(digits);

    const isHighConfidence = Boolean(brandHint || hasCardContext);
    candidates.push({
      type: PII_TYPES.CARD,
      originalValue: value,
      startIndex,
      endIndex,
      confidence: isHighConfidence ? 'high' : 'medium',
      confidenceScore: isHighConfidence ? 92 : 76,
      needsReview: !isHighConfidence,
      reviewReason: isHighConfidence
        ? `Passes Luhn checksum (${brandHint || 'card context'}) — format check only, not active card verification`
        : 'Passes Luhn checksum without card label or standard BIN prefix — review recommended',
    });
  }
  return candidates;
}

function detectPANs(text, extraContext = '') {
  const candidates = [];
  const regex = /(?<![A-Za-z0-9])([A-Z]{5}[0-9]{4}[A-Z])(?![A-Za-z0-9])/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;
    const validation = validatePanStructure(value);
    if (!validation.isValidFormat) continue;

    const context = `${extraContext} ${getLineContextWindow(text, startIndex, endIndex)}`;
    const hasPanContext = PAN_POSITIVE_CONTEXT_RE.test(context);
    const highConfidence = validation.hasStandardEntityCode || hasPanContext;

    candidates.push({
      type: PII_TYPES.PAN,
      originalValue: value,
      startIndex,
      endIndex,
      confidence: highConfidence ? 'high' : 'medium',
      confidenceScore: highConfidence ? 94 : 78,
      needsReview: !highConfidence,
      reviewReason: highConfidence
        ? `Matches 10-char PAN structure${validation.hasStandardEntityCode ? ` (entity code '${validation.entityCode}')` : ' with PAN context'}`
        : `Matches 5L-4D-1L pattern; 4th char '${validation.entityCode}' is non-standard without PAN label`,
    });
  }
  return candidates;
}

function detectIPv4s(text) {
  const candidates = [];
  const regex = /(?<![A-Za-z0-9_]|\d\.)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?![\dA-Za-z_]|\.\d)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    if (!isValidIPv4(value)) {
      continue;
    }

    candidates.push({
      type: PII_TYPES.IPV4,
      originalValue: value,
      startIndex: match.index,
      endIndex: match.index + value.length,
      confidence: 'high',
      confidenceScore: 95,
      needsReview: false,
      reviewReason: 'All four octets validated within 0-255 range',
    });
  }
  return candidates;
}

function detectAadhaars(text, extraContext = '') {
  const candidates = [];
  const regex = /(?<![\dA-Za-z_-]|\d\.)(\d{4}[\s-]\d{4}[\s-]\d{4}|\d{12})(?![\dA-Za-z_-]|\.\d)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;

    // Prevent matching 12-digit slices adjacent to space/hyphen-separated digit blocks (e.g. 16-digit cards)
    const beforeSlice = text.slice(Math.max(0, startIndex - 2), startIndex);
    const afterSlice = text.slice(endIndex, Math.min(text.length, endIndex + 2));
    if (/\d[\s-]$/.test(beforeSlice) || /^[\s-]\d/.test(afterSlice)) {
      continue;
    }

    const digits = value.replace(/\D/g, '');
    if (digits.length !== 12) continue;

    // Reject trivial repeated-digit strings like 000000000000 or 999999999999
    if (/^(\d)\1{11}$/.test(digits)) continue;

    const context = `${extraContext} ${getLineContextWindow(text, startIndex, endIndex)}`;
    const hasPositiveContext = AADHAAR_POSITIVE_CONTEXT_RE.test(context);
    const hasNegativeContext = AADHAAR_NEGATIVE_CONTEXT_RE.test(context);

    // Reject uncontextualized 91+10-digit Indian phone format so phone detector handles it cleanly
    if (!hasPositiveContext && /^91[6-9]\d{9}$/.test(digits)) {
      continue;
    }

    // Reject likely order/invoice/tracking/reference 12-digit numbers unless explicit Aadhaar label exists
    if (hasNegativeContext && !hasPositiveContext) {
      continue;
    }

    const isGrouped = /[\s-]/.test(value);

    // Reject unspaced zero-prefixed 12-digit IDs unless explicitly labeled as Aadhaar
    if (!isGrouped && digits.startsWith('0') && !hasPositiveContext) {
      continue;
    }

    const startsUidaiDigit = /^[2-9]/.test(digits);
    const verhoeffValid = startsUidaiDigit && passesVerhoeff(digits);

    let confidence = 'review';
    let confidenceScore = 60;
    let needsReview = true;
    let reviewReason = 'Uncertain 12-digit Aadhaar-like sequence without Aadhaar label — review recommended';

    if (hasPositiveContext && verhoeffValid) {
      confidence = 'high';
      confidenceScore = 97;
      needsReview = false;
      reviewReason = 'Explicit Aadhaar context with valid UIDAI prefix and Verhoeff checksum';
    } else if (hasPositiveContext && startsUidaiDigit) {
      confidence = 'high';
      confidenceScore = 88;
      needsReview = false;
      reviewReason = 'Explicit Aadhaar context and UIDAI starting digit [2-9]';
    } else if (hasPositiveContext) {
      confidence = 'medium';
      confidenceScore = 76;
      needsReview = true;
      reviewReason = 'Aadhaar context detected, but leading digit 0/1 or checksum is non-standard — review recommended';
    } else if (isGrouped && verhoeffValid) {
      confidence = 'medium';
      confidenceScore = 82;
      needsReview = true;
      reviewReason = '4-4-4 format passes Verhoeff checksum without Aadhaar label — verify context';
    } else if (isGrouped) {
      confidence = 'review';
      confidenceScore = 62;
      needsReview = true;
      reviewReason = '4-4-4 Aadhaar-like grouping without explicit Aadhaar keyword — manual review advised';
    } else {
      confidence = 'review';
      confidenceScore = 52;
      needsReview = true;
      reviewReason = 'Unspaced 12-digit number without Aadhaar context — manual review advised';
    }

    candidates.push({
      type: PII_TYPES.AADHAAR,
      originalValue: value,
      startIndex,
      endIndex,
      confidence,
      confidenceScore,
      needsReview,
      reviewReason,
    });
  }
  return candidates;
}

function detectPhones(text, extraContext = '') {
  const candidates = [];
  const regex =
    /(?<![\dA-Za-z_-]|\d\.)((?:\(\+91\)\s*|\+91[\s-]?|91[\s-]|0(?=[6-9]\d{9}))?(?:[6-9]\d{9}|[6-9]\d{4}[\s-]\d{5}|[6-9]\d{2}[\s-]\d{3}[\s-]\d{4}))(?![\dA-Za-z_-]|\.\d)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + value.length;

    const beforeSlice = text.slice(Math.max(0, startIndex - 2), startIndex);
    const afterSlice = text.slice(endIndex, Math.min(text.length, endIndex + 2));
    if (/\d[\s-]$/.test(beforeSlice) || /^[\s-]\d/.test(afterSlice)) {
      continue;
    }

    const context = `${extraContext} ${getLineContextWindow(text, startIndex, endIndex)}`;
    const hasCountryPrefix = /^(?:\(\+91\)|\+?91[\s-]?|0[6-9])/.test(value);
    const hasPhoneContext = PHONE_POSITIVE_CONTEXT_RE.test(context);
    const hasNegativeContext = PHONE_NEGATIVE_CONTEXT_RE.test(context);

    if (!hasCountryPrefix && !hasPhoneContext && hasNegativeContext) {
      continue;
    }

    const isHigh = hasCountryPrefix || hasPhoneContext;
    candidates.push({
      type: PII_TYPES.PHONE,
      originalValue: value,
      startIndex,
      endIndex,
      confidence: isHigh ? 'high' : 'medium',
      confidenceScore: isHigh ? 94 : 83,
      needsReview: false,
      reviewReason: isHigh
        ? 'Valid Indian mobile pattern with prefix or phone context'
        : 'Matches 10-digit Indian mobile range [6-9]xxxxxxxxx',
    });
  }
  return candidates;
}

/**
 * Resolves overlapping candidates deterministically using category specificity,
 * span length, and start position.
 */
function resolveOverlaps(candidates) {
  const sorted = [...candidates].sort((a, b) => {
    const priorityDiff = (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    const lenDiff = (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
    if (lenDiff !== 0) return lenDiff;
    return a.startIndex - b.startIndex;
  });

  const accepted = [];
  for (const candidate of sorted) {
    const overlaps = accepted.some(
      (existing) => candidate.startIndex < existing.endIndex && existing.startIndex < candidate.endIndex
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Scans raw plain text for all supported PII categories and returns structured detections.
 * Pure client-side logic with no UI or external dependencies.
 */
export function detectPIIInText(text, options = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }

  const { extraContext = '', idPrefix = 'det' } = options;
  const lineStarts = buildLineIndex(text);

  const rawCandidates = [
    ...detectEmails(text),
    ...detectCards(text, extraContext),
    ...detectPANs(text, extraContext),
    ...detectIPv4s(text),
    ...detectAadhaars(text, extraContext),
    ...detectPhones(text, extraContext),
  ];

  const resolved = resolveOverlaps(rawCandidates);

  // Count occurrences per canonical normalized entity across the document
  const occurrenceTotals = new Map();
  for (const item of resolved) {
    const norm = normalizeEntityValue(item.type, item.originalValue);
    const key = `${item.type}::${norm}`;
    occurrenceTotals.set(key, (occurrenceTotals.get(key) || 0) + 1);
  }

  return resolved.map((item, idx) => {
    const normalizedValue = normalizeEntityValue(item.type, item.originalValue);
    const entityKey = `${item.type}::${normalizedValue}`;

    return {
      id: `${idPrefix}_${idx}`,
      type: item.type,
      originalValue: item.originalValue,
      normalizedValue,
      entityKey,
      startIndex: item.startIndex,
      endIndex: item.endIndex,
      lineNumber: getLineNumberAt(lineStarts, item.startIndex),
      confidence: item.confidence,
      confidenceScore: item.confidenceScore,
      needsReview: item.needsReview,
      reviewReason: item.reviewReason,
      reviewStatus: item.needsReview ? 'pending' : 'auto',
      maskedValue: createPartialMask(item.type, item.originalValue),
      occurrenceCount: occurrenceTotals.get(entityKey) || 1,
    };
  });
}

/**
 * Computes summary statistics across a list of detections and active filters.
 */
export function summarizeDetections(detections, enabledCategories, dismissedIds = new Set()) {
  const byCategory = {
    [PII_TYPES.EMAIL]: 0,
    [PII_TYPES.PHONE]: 0,
    [PII_TYPES.PAN]: 0,
    [PII_TYPES.AADHAAR]: 0,
    [PII_TYPES.CARD]: 0,
    [PII_TYPES.IPV4]: 0,
  };

  const uniqueKeys = new Set();
  const uniqueByCategory = {
    [PII_TYPES.EMAIL]: new Set(),
    [PII_TYPES.PHONE]: new Set(),
    [PII_TYPES.PAN]: new Set(),
    [PII_TYPES.AADHAAR]: new Set(),
    [PII_TYPES.CARD]: new Set(),
    [PII_TYPES.IPV4]: new Set(),
  };

  let sanitizedCount = 0;
  let excludedByCategoryCount = 0;
  let dismissedCount = 0;
  let needsReviewCount = 0;

  for (const det of detections) {
    byCategory[det.type] = (byCategory[det.type] || 0) + 1;
    uniqueKeys.add(det.entityKey);
    uniqueByCategory[det.type]?.add(det.entityKey);

    if (det.needsReview && det.reviewStatus !== 'confirmed' && !dismissedIds.has(det.id)) {
      needsReviewCount += 1;
    }

    const isCategoryEnabled = enabledCategories[det.type] !== false;
    const isDismissed = dismissedIds.has(det.id);

    if (!isCategoryEnabled) {
      excludedByCategoryCount += 1;
    } else if (isDismissed) {
      dismissedCount += 1;
    } else {
      sanitizedCount += 1;
    }
  }

  const activeCategoryCount = Object.values(byCategory).filter((count) => count > 0).length;
  const excludedCategories = Object.keys(enabledCategories).filter(
    (type) => enabledCategories[type] === false
  );

  const uniqueCountsByCategory = {};
  for (const type of Object.keys(uniqueByCategory)) {
    uniqueCountsByCategory[type] = uniqueByCategory[type].size;
  }

  return {
    totalDetected: detections.length,
    uniqueEntities: uniqueKeys.size,
    categoriesDetectedCount: activeCategoryCount,
    sanitizedCount,
    excludedByCategoryCount,
    dismissedCount,
    needsReviewCount,
    excludedCategories,
    byCategory,
    uniqueCountsByCategory,
  };
}
