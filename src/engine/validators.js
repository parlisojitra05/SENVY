import { PII_TYPES } from '../constants/categories.js';

/**
 * Validates a card candidate using the Luhn checksum algorithm (ISO/IEC 7812).
 * Note: Passing Luhn verifies check-digit integrity only and does NOT prove a card is real or active.
 */
export function passesLuhn(rawValue) {
  if (typeof rawValue !== 'string') return false;
  const digitsOnly = rawValue.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digitsOnly)) return false;
  if (/^0+$/.test(digitsOnly)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digitsOnly.length - 1; i >= 0; i -= 1) {
    let digit = digitsOnly.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Identifies common IIN/BIN prefix patterns for confidence hints only.
 */
export function detectCardBrandHint(digitsOnly) {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digitsOnly)) return 'Visa-like';
  if (/^(5[1-5]\d{14}|2(22[1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720)\d{12})$/.test(digitsOnly)) {
    return 'Mastercard-like';
  }
  if (/^3[47]\d{13}$/.test(digitsOnly)) return 'Amex-like';
  if (/^(60|65|81|82|508)\d{11,17}$/.test(digitsOnly)) return 'RuPay-like';
  if (/^6(?:011|5\d{2}|4[4-9]\d)\d{10,15}$/.test(digitsOnly)) return 'Discover-like';
  return null;
}

/**
 * Validates strict IPv4 dotted-quad format with 0-255 octet range and no leading zeros.
 */
export function isValidIPv4(rawValue) {
  if (typeof rawValue !== 'string') return false;
  const parts = rawValue.split('.');
  if (parts.length !== 4) return false;

  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) {
      return false;
    }
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) {
      return false;
    }
  }
  return true;
}

const VALID_PAN_ENTITY_CODES = new Set(['A', 'B', 'C', 'F', 'G', 'H', 'J', 'L', 'P', 'T']);

/**
 * Validates Indian PAN structural pattern: 5 uppercase letters, 4 digits, 1 uppercase letter.
 */
export function validatePanStructure(rawValue) {
  if (typeof rawValue !== 'string') {
    return { isValidFormat: false, hasStandardEntityCode: false, entityCode: '' };
  }
  const trimmed = rawValue.trim();
  const isValidFormat = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(trimmed);
  const entityCode = isValidFormat ? trimmed[3] : '';
  return {
    isValidFormat,
    hasStandardEntityCode: isValidFormat && VALID_PAN_ENTITY_CODES.has(entityCode),
    entityCode,
  };
}

// Verhoeff multiplication, permutation, and inverse tables used by UIDAI checksum
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Checks whether a numeric string satisfies the Verhoeff checksum.
 * Used strictly as a confidence signal since demo/synthetic Aadhaar numbers may not pass Verhoeff.
 */
export function passesVerhoeff(digitsOnly) {
  if (!/^\d{12}$/.test(digitsOnly)) return false;
  let c = 0;
  for (let i = 0; i < digitsOnly.length; i += 1) {
    const digit = digitsOnly.charCodeAt(digitsOnly.length - 1 - i) - 48;
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]];
  }
  return c === 0;
}

/**
 * Normalizes a matched PII value into its canonical form for consistent pseudonymization
 * and unique entity counting.
 */
export function normalizeEntityValue(type, rawValue) {
  if (typeof rawValue !== 'string') return '';
  switch (type) {
    case PII_TYPES.EMAIL:
      return rawValue.trim().toLowerCase();
    case PII_TYPES.PHONE: {
      const digits = rawValue.replace(/\D/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    }
    case PII_TYPES.PAN:
      return rawValue.trim().toUpperCase();
    case PII_TYPES.AADHAAR:
    case PII_TYPES.CARD:
      return rawValue.replace(/\D/g, '');
    case PII_TYPES.IPV4:
      return rawValue.trim();
    default:
      return rawValue.trim();
  }
}
