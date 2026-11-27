/**
 * Generates a safe dated filename such as senvy_sanitized_20261127.csv
 */
export function buildSafeExportFilename(extension = 'txt', prefix = 'senvy_sanitized') {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const cleanExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'txt';
  return `${prefix}_${year}${month}${day}.${cleanExt}`;
}

/**
 * Triggers an immediate client-side Blob download without touching any server.
 */
export function downloadBlobFile(content, filename, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1500);
}

/**
 * Copies text to clipboard using Navigator Clipboard API with safe textarea fallback.
 */
export async function copyToClipboard(text) {
  if (typeof text !== 'string') return false;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below if clipboard permission requires execCommand
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
