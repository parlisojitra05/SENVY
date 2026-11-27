export const PII_TYPES = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  PAN: 'PAN',
  AADHAAR: 'AADHAAR',
  CARD: 'CARD',
  IPV4: 'IPV4',
};

export const PII_CATEGORY_ORDER = [
  PII_TYPES.EMAIL,
  PII_TYPES.PHONE,
  PII_TYPES.PAN,
  PII_TYPES.AADHAAR,
  PII_TYPES.CARD,
  PII_TYPES.IPV4,
];

export const CATEGORY_META = {
  [PII_TYPES.EMAIL]: {
    id: PII_TYPES.EMAIL,
    label: 'Email Address',
    shortLabel: 'Emails',
    pseudonymPrefix: 'EMAIL',
    description: 'Standard email identifiers (local@domain.tld)',
    riskBase: 10,
    riskStep: 2,
    riskCap: 18,
    badgeClass: 'bg-[#F0EAF8] text-[#303A33] border-[#DDD1EE]',
    highlightClass: 'bg-[#F0EAF8] text-[#303A33] border-b-2 border-[#B9A4D8]',
    dotClass: 'bg-[#8E77B5]',
    cardAccent: 'text-[#6A558F]',
  },
  [PII_TYPES.PHONE]: {
    id: PII_TYPES.PHONE,
    label: 'Indian Phone',
    shortLabel: 'Phones',
    pseudonymPrefix: 'PHONE',
    description: '10-digit Indian mobile numbers (+91 / 91 / spaced / hyphenated)',
    riskBase: 12,
    riskStep: 3,
    riskCap: 20,
    badgeClass: 'bg-[#E8F1FA] text-[#303A33] border-[#CFE0F2]',
    highlightClass: 'bg-[#E8F1FA] text-[#303A33] border-b-2 border-[#9AC0E3]',
    dotClass: 'bg-[#638EBA]',
    cardAccent: 'text-[#4D749D]',
  },
  [PII_TYPES.PAN]: {
    id: PII_TYPES.PAN,
    label: 'Indian PAN',
    shortLabel: 'PAN',
    pseudonymPrefix: 'PAN',
    description: 'Permanent Account Number (5 letters + 4 digits + 1 letter)',
    riskBase: 20,
    riskStep: 4,
    riskCap: 30,
    badgeClass: 'bg-[#FAEFE4] text-[#303A33] border-[#EDD8C3]',
    highlightClass: 'bg-[#FAEFE4] text-[#303A33] border-b-2 border-[#DDB892]',
    dotClass: 'bg-[#B98756]',
    cardAccent: 'text-[#96693E]',
  },
  [PII_TYPES.AADHAAR]: {
    id: PII_TYPES.AADHAAR,
    label: 'Aadhaar-like ID',
    shortLabel: 'Aadhaar',
    pseudonymPrefix: 'AADHAAR',
    description: '12-digit Aadhaar-like numbers with contextual verification',
    riskBase: 25,
    riskStep: 5,
    riskCap: 35,
    badgeClass: 'bg-[#F7F3D9] text-[#303A33] border-[#E6DFB5]',
    highlightClass: 'bg-[#F7F3D9] text-[#303A33] border-b-2 border-[#CFC37A]',
    dotClass: 'bg-[#A89A48]',
    cardAccent: 'text-[#877B33]',
  },
  [PII_TYPES.CARD]: {
    id: PII_TYPES.CARD,
    label: 'Payment Card',
    shortLabel: 'Cards',
    pseudonymPrefix: 'CARD',
    description: '13-19 digit card sequences passing Luhn checksum validation',
    riskBase: 25,
    riskStep: 5,
    riskCap: 35,
    badgeClass: 'bg-[#F8E7E9] text-[#303A33] border-[#EBD0D3]',
    highlightClass: 'bg-[#F8E7E9] text-[#303A33] border-b-2 border-[#D9A7AE]',
    dotClass: 'bg-[#BA6E77]',
    cardAccent: 'text-[#9A525B]',
  },
  [PII_TYPES.IPV4]: {
    id: PII_TYPES.IPV4,
    label: 'IPv4 Address',
    shortLabel: 'IP Addresses',
    pseudonymPrefix: 'IP',
    description: 'Dotted-quad IPv4 addresses with strict 0-255 octet bounds',
    riskBase: 8,
    riskStep: 2,
    riskCap: 15,
    badgeClass: 'bg-[#E6F1ED] text-[#303A33] border-[#CBE0D9]',
    highlightClass: 'bg-[#E6F1ED] text-[#303A33] border-b-2 border-[#9AC4B6]',
    dotClass: 'bg-[#5F9381]',
    cardAccent: 'text-[#4B7A6A]',
  },
};

export const REDACTION_MODES = {
  FULL: 'full',
  PARTIAL: 'partial',
  PSEUDONYM: 'pseudonym',
};

export const REDACTION_MODE_META = {
  [REDACTION_MODES.FULL]: {
    id: REDACTION_MODES.FULL,
    label: 'Full Mask',
    shortLabel: 'Full Mask',
    example: '[REDACTED]',
    tooltip:
      'Replaces every enabled sensitive match with the uniform [REDACTED] token for maximum minimization.',
    description: 'Maximum redaction: removes all characters and structural hints.',
  },
  [REDACTION_MODES.PARTIAL]: {
    id: REDACTION_MODES.PARTIAL,
    label: 'Partial Mask',
    shortLabel: 'Partial Mask',
    example: 'r***@g***.com · ******3210',
    tooltip:
      'Masks sensitive portions with * or X while leaving limited trailing/leading hints for human verification.',
    description: 'Balanced verification: hides sensitive digits while retaining minimal suffixes.',
  },
  [REDACTION_MODES.PSEUDONYM]: {
    id: REDACTION_MODES.PSEUDONYM,
    label: 'Consistent Pseudonymization',
    shortLabel: 'Pseudonymize',
    example: 'EMAIL_01 · PHONE_01',
    tooltip:
      'Maps each unique entity deterministically to a stable synthetic token (e.g., EMAIL_01) across the entire document.',
    description: 'Entity consistency: repeated occurrences keep identical synthetic IDs.',
  },
};

export const DEFAULT_ENABLED_CATEGORIES = {
  [PII_TYPES.EMAIL]: true,
  [PII_TYPES.PHONE]: true,
  [PII_TYPES.PAN]: true,
  [PII_TYPES.AADHAAR]: true,
  [PII_TYPES.CARD]: true,
  [PII_TYPES.IPV4]: true,
};
