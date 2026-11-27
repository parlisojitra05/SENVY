const MAX_RECOMMENDED_BYTES = 5 * 1024 * 1024; // 5 MB client memory safety threshold
export const LARGE_HIGHLIGHT_THRESHOLD_CHARS = 80000;

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFileExtension(fileName = '') {
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return '';
  return fileName.slice(idx + 1).toLowerCase();
}

export function validateUploadedFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const ext = getFileExtension(file.name);
  if (ext !== 'txt' && ext !== 'csv') {
    return {
      valid: false,
      error: `Unsupported file type ".${ext || 'unknown'}". SENVY supports .txt and .csv files locally.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `The file "${file.name}" is empty (0 bytes). Please provide a file with readable text content.`,
    };
  }

  if (file.size > MAX_RECOMMENDED_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" (${formatFileSize(file.size)}) exceeds the 5 MB in-browser safety limit.`,
    };
  }

  return { valid: true, ext };
}

/**
 * Checks whether decoded text contains binary/null-byte corruption.
 */
export function validateTextContent(text, fileName = 'document') {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: `Input "${fileName}" contains only whitespace or is empty.`,
    };
  }

  // Detect null bytes or excessive control characters indicative of binary files renamed to .txt/.csv
  if (text.includes('\u0000')) {
    return {
      valid: false,
      error: `File "${fileName}" appears to contain binary data (null bytes) rather than valid UTF-8 text.`,
    };
  }

  return { valid: true };
}
