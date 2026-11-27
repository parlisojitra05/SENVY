import { PII_TYPES, REDACTION_MODES } from '../constants/categories.js';
import { detectPIIInText } from './detectionEngine.js';
import { buildPseudonymSessionMap, getReplacementValue } from './maskingEngine.js';

/**
 * Parses an RFC-4180 compliant CSV string into structured rows and cells.
 * Handles commas inside quoted fields, escaped quotes (""), embedded newlines inside quotes,
 * CRLF vs LF line endings, and UTF-8 BOM without corrupting structure.
 */
export function parseCSV(rawInput) {
  if (typeof rawInput !== 'string') {
    return {
      rows: [],
      headers: [],
      lineEnding: '\n',
      hasTrailingNewline: false,
      hasUnclosedQuote: false,
      hasRaggedRows: false,
      warnings: [],
    };
  }

  const text = rawInput.startsWith('\uFEFF') ? rawInput.slice(1) : rawInput;
  if (text.length === 0) {
    return {
      rows: [],
      headers: [],
      lineEnding: '\n',
      hasTrailingNewline: false,
      hasUnclosedQuote: false,
      hasRaggedRows: false,
      warnings: [],
    };
  }

  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  const hasTrailingNewline = text.endsWith('\n') || text.endsWith('\r');

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let fieldWasQuoted = false;
  let fieldStartLine = 1;
  let currentLine = 1;
  let fieldRawStart = 0;

  const pushCell = (rawEnd) => {
    currentRow.push({
      value: currentField,
      wasQuoted: fieldWasQuoted,
      startLine: fieldStartLine,
      rawStart: fieldRawStart,
      rawEnd,
    });
    currentField = '';
    fieldWasQuoted = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\r') {
          if (text[i + 1] === '\n') {
            currentField += '\r\n';
            i += 1;
          } else {
            currentField += '\r';
          }
          currentLine += 1;
        } else {
          if (ch === '\n') {
            currentLine += 1;
          }
          currentField += ch;
        }
      }
      continue;
    }

    // Outside quotes
    if (ch === '"' && currentField.length === 0 && !fieldWasQuoted) {
      inQuotes = true;
      fieldWasQuoted = true;
      fieldStartLine = currentLine;
      fieldRawStart = i;
      continue;
    }

    if (ch === ',') {
      pushCell(i);
      fieldStartLine = currentLine;
      fieldRawStart = i + 1;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      pushCell(i);
      rows.push(currentRow);
      currentRow = [];
      if (ch === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      currentLine += 1;
      fieldStartLine = currentLine;
      fieldRawStart = i + 1;
      continue;
    }

    if (currentField.length === 0 && !fieldWasQuoted) {
      fieldStartLine = currentLine;
      fieldRawStart = i;
    }
    currentField += ch;
  }

  // Handle final cell/row if file didn't end cleanly on a newline
  if (currentField.length > 0 || fieldWasQuoted || currentRow.length > 0) {
    pushCell(text.length);
    rows.push(currentRow);
  }

  const hasUnclosedQuote = inQuotes;
  const headerLength = rows[0]?.length || 0;
  const hasRaggedRows = rows.some((row) => row.length !== headerLength);
  const warnings = [];

  if (hasUnclosedQuote) {
    warnings.push('Unclosed quotation mark detected in CSV input; parsed safely up to end of file.');
  }
  if (hasRaggedRows) {
    warnings.push('Some CSV rows have a different column count than the header row.');
  }

  const headers = (rows[0] || []).map((cell, idx) => cell.value || `Column ${idx + 1}`);

  return {
    rows,
    headers,
    lineEnding,
    hasTrailingNewline,
    hasUnclosedQuote,
    hasRaggedRows,
    warnings,
  };
}

/**
 * Escapes a single string value for RFC-4180 CSV output.
 */
export function escapeCSVValue(value, forceQuotes = false) {
  const str = value == null ? '' : String(value);
  const needsQuoting =
    forceQuotes ||
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    /^\s|\s$/.test(str);

  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

/**
 * Serializes a 2D array of string rows or cell objects into a valid RFC-4180 CSV string.
 */
export function serializeCSV(rows, options = {}) {
  const { lineEnding = '\n', preserveOriginalQuoting = true, hasTrailingNewline = false } = options;

  const lines = rows.map((row) =>
    row
      .map((cell) => {
        if (cell && typeof cell === 'object' && 'value' in cell) {
          return escapeCSVValue(cell.value, preserveOriginalQuoting && Boolean(cell.wasQuoted));
        }
        return escapeCSVValue(cell, false);
      })
      .join(',')
  );

  const output = lines.join(lineEnding);
  return hasTrailingNewline && output.length > 0 ? `${output}${lineEnding}` : output;
}

/**
 * Scans parsed CSV rows cell-by-cell so delimiter commas never cause cross-column matches.
 * Uses header names as contextual hints while keeping detections mapped to exact cell coordinates
 * and file line numbers.
 */
export function scanParsedCSV(parsedCsv) {
  const { rows, headers } = parsedCsv;
  const detections = [];
  const cellDetectionsMap = new Map();
  let detIndex = 0;

  // First pass: collect detections per cell using column header as context
  const entityCounts = new Map();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      const columnName = headers[colIndex] || `Column ${colIndex + 1}`;
      // Skip passing header label on header row itself so header names don't bias themselves
      const extraContext = rowIndex === 0 ? '' : columnName;

      const cellDetections = detectPIIInText(cell.value, {
        extraContext,
        idPrefix: `csv_${rowIndex}_${colIndex}`,
      });

      if (cellDetections.length > 0) {
        const mapped = cellDetections.map((det) => {
          const item = {
            ...det,
            id: `det_${detIndex}`,
            rowIndex,
            colIndex,
            columnName,
            cellStartIndex: det.startIndex,
            cellEndIndex: det.endIndex,
            lineNumber: cell.startLine + (cell.value.slice(0, det.startIndex).match(/\n/g)?.length || 0),
          };
          detIndex += 1;
          entityCounts.set(item.entityKey, (entityCounts.get(item.entityKey) || 0) + 1);
          return item;
        });

        cellDetectionsMap.set(`${rowIndex}:${colIndex}`, mapped);
        detections.push(...mapped);
      }
    }
  }

  // Update document-wide occurrenceCount across all CSV cells
  const finalizedDetections = detections.map((det) => ({
    ...det,
    occurrenceCount: entityCounts.get(det.entityKey) || 1,
  }));

  const finalizedCellMap = new Map();
  for (const det of finalizedDetections) {
    const key = `${det.rowIndex}:${det.colIndex}`;
    if (!finalizedCellMap.has(key)) {
      finalizedCellMap.set(key, []);
    }
    finalizedCellMap.get(key).push(det);
  }

  return {
    detections: finalizedDetections,
    cellDetectionsMap: finalizedCellMap,
  };
}

/**
 * Builds original & sanitized CSV outputs, both as exact RFC-4180 CSV strings
 * and as highlighted segment lists + structured table rows for side-by-side comparison.
 */
export function redactParsedCSV(
  parsedCsv,
  cellDetectionsMap,
  {
    mode = REDACTION_MODES.FULL,
    enabledCategories = {},
    dismissedIds = new Set(),
    pseudonymMap = new Map(),
  } = {}
) {
  const { rows, lineEnding, hasTrailingNewline } = parsedCsv;
  const originalSegments = [];
  const sanitizedSegments = [];
  const enrichedDetections = [];
  const tableRows = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const tableRowCells = [];

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      const cellDets = cellDetectionsMap.get(`${rowIndex}:${colIndex}`) || [];
      const sortedDets = [...cellDets].sort((a, b) => a.cellStartIndex - b.cellStartIndex);

      // Build unescaped cell segments for both table rendering and serialized CSV output
      const origCellSubSegments = [];
      const sanCellSubSegments = [];
      let cursor = 0;

      for (const det of sortedDets) {
        if (det.cellStartIndex > cursor) {
          const plainPart = cell.value.slice(cursor, det.cellStartIndex);
          origCellSubSegments.push({ text: plainPart, kind: 'plain' });
          sanCellSubSegments.push({ text: plainPart, kind: 'plain' });
        }

        const isCategoryEnabled = enabledCategories[det.type] !== false;
        const isDismissed = dismissedIds.has(det.id);
        const isActive = isCategoryEnabled && !isDismissed;
        const replacementValue = isActive
          ? getReplacementValue(det, mode, pseudonymMap)
          : det.originalValue;

        const meta = {
          type: det.type,
          detectionId: det.id,
          needsReview: det.needsReview && det.reviewStatus !== 'confirmed',
          isExcluded: !isActive,
          exclusionReason: !isCategoryEnabled ? 'category_disabled' : isDismissed ? 'dismissed' : null,
          mode,
        };

        origCellSubSegments.push({
          text: det.originalValue,
          kind: isActive ? 'pii' : 'excluded',
          ...meta,
        });
        sanCellSubSegments.push({
          text: replacementValue,
          kind: isActive ? 'redacted' : 'excluded',
          ...meta,
        });

        enrichedDetections.push({
          ...det,
          isActive,
          isCategoryEnabled,
          isDismissed,
          replacementValue,
        });

        cursor = det.cellEndIndex;
      }

      if (cursor < cell.value.length) {
        const trailing = cell.value.slice(cursor);
        origCellSubSegments.push({ text: trailing, kind: 'plain' });
        sanCellSubSegments.push({ text: trailing, kind: 'plain' });
      }

      if (origCellSubSegments.length === 0) {
        origCellSubSegments.push({ text: '', kind: 'plain' });
        sanCellSubSegments.push({ text: '', kind: 'plain' });
      }

      const sanitizedCellPlain = sanCellSubSegments.map((s) => s.text).join('');

      const shouldQuoteOriginal =
        Boolean(cell.wasQuoted) ||
        cell.value.includes(',') ||
        cell.value.includes('"') ||
        cell.value.includes('\n') ||
        cell.value.includes('\r') ||
        /^\s|\s$/.test(cell.value);

      const shouldQuoteSanitized =
        Boolean(cell.wasQuoted) ||
        sanitizedCellPlain.includes(',') ||
        sanitizedCellPlain.includes('"') ||
        sanitizedCellPlain.includes('\n') ||
        sanitizedCellPlain.includes('\r') ||
        /^\s|\s$/.test(sanitizedCellPlain);

      const emitSerializedSegments = (subSegments, shouldQuote, targetArray) => {
        if (shouldQuote) {
          targetArray.push({ text: '"', kind: 'plain' });
        }
        for (const seg of subSegments) {
          if (seg.text.length === 0) continue;
          targetArray.push({
            ...seg,
            text: seg.text.replace(/"/g, '""'),
          });
        }
        if (shouldQuote) {
          targetArray.push({ text: '"', kind: 'plain' });
        }
      };

      emitSerializedSegments(origCellSubSegments, shouldQuoteOriginal, originalSegments);
      emitSerializedSegments(sanCellSubSegments, shouldQuoteSanitized, sanitizedSegments);

      if (colIndex < row.length - 1) {
        originalSegments.push({ text: ',', kind: 'plain' });
        sanitizedSegments.push({ text: ',', kind: 'plain' });
      }

      tableRowCells.push({
        originalValue: cell.value,
        sanitizedValue: sanitizedCellPlain,
        originalSegments: origCellSubSegments,
        sanitizedSegments: sanCellSubSegments,
        hasPII: sortedDets.length > 0,
      });
    }

    tableRows.push(tableRowCells);

    if (rowIndex < rows.length - 1) {
      originalSegments.push({ text: lineEnding, kind: 'plain' });
      sanitizedSegments.push({ text: lineEnding, kind: 'plain' });
    }
  }

  if (hasTrailingNewline && rows.length > 0) {
    originalSegments.push({ text: lineEnding, kind: 'plain' });
    sanitizedSegments.push({ text: lineEnding, kind: 'plain' });
  }

  return {
    originalTextSerialized: originalSegments.map((s) => s.text).join(''),
    sanitizedText: sanitizedSegments.map((s) => s.text).join(''),
    originalSegments,
    sanitizedSegments,
    tableRows,
    enrichedDetections,
  };
}

/**
 * Convenience helper to run complete CSV parse + scan + pseudonym map in one call.
 */
export function analyzeCSVDocument(rawCsv) {
  const parsedCsv = parseCSV(rawCsv);
  const { detections, cellDetectionsMap } = scanParsedCSV(parsedCsv);
  const { entityMap, entries } = buildPseudonymSessionMap(detections);
  return {
    parsedCsv,
    detections,
    cellDetectionsMap,
    pseudonymMap: entityMap,
    pseudonymEntries: entries,
  };
}

export { PII_TYPES };
