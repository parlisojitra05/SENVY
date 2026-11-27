import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

import { DEFAULT_ENABLED_CATEGORIES, PII_TYPES, REDACTION_MODES } from '../src/constants/categories.js';
import { SAMPLE_CSV_DOCUMENT, SAMPLE_TEXT_DOCUMENT } from '../src/constants/sampleData.js';
import { isValidIPv4, passesLuhn, validatePanStructure } from '../src/engine/validators.js';
import { detectPIIInText, summarizeDetections } from '../src/engine/detectionEngine.js';
import {
  applyRedactionToText,
  buildPseudonymSessionMap,
  createPartialMask,
} from '../src/engine/maskingEngine.js';
import {
  analyzeCSVDocument,
  parseCSV,
  redactParsedCSV,
  serializeCSV,
} from '../src/engine/csvProcessor.js';
import { buildAuditSummaryText, calculateHeuristicRisk, createAuditEvent } from '../src/utils/auditLogger.js';
import { validateTextContent, validateUploadedFile } from '../src/utils/fileValidation.js';

test('TEST 1: Email detection finds valid emails and skips malformed inputs', () => {
  const input = 'Contact riya.patel@gmail.com or ops+alert@sub.company.co.in. Not an email: test@@bad, @nouser.com.';
  const dets = detectPIIInText(input);
  const emails = dets.filter((d) => d.type === PII_TYPES.EMAIL);
  assert.equal(emails.length, 2);
  assert.equal(emails[0].originalValue, 'riya.patel@gmail.com');
  assert.equal(emails[1].originalValue, 'ops+alert@sub.company.co.in');
  assert.equal(emails[0].lineNumber, 1);
  assert.equal(input.slice(emails[0].startIndex, emails[0].endIndex), 'riya.patel@gmail.com');
});

test('TEST 2: Indian phone detection matches valid formats and rejects arbitrary numbers', () => {
  const input = [
    'Direct: 9876543210',
    'Intl: +91 9876543210',
    'Hyphen: 91-9876543210',
    'Grouped: 98112 23344',
    'Invalid prefix: 1234567890',
    'Too long: 9876543210123',
  ].join('\n');

  const dets = detectPIIInText(input);
  const phones = dets.filter((d) => d.type === PII_TYPES.PHONE);
  assert.equal(phones.length, 4);
  assert.deepEqual(
    phones.map((p) => p.originalValue),
    ['9876543210', '+91 9876543210', '91-9876543210', '98112 23344']
  );
  assert.equal(phones[1].lineNumber, 2);
});

test('TEST 3: PAN detection validates structural format', () => {
  const input = 'Test PAN: ABCDE1234F and individual ABCPM4821K. Bad PAN: ABCD1234F or 12345ABCDE.';
  const dets = detectPIIInText(input);
  const pans = dets.filter((d) => d.type === PII_TYPES.PAN);
  assert.equal(pans.length, 2);
  assert.equal(pans[0].originalValue, 'ABCDE1234F');
  assert.equal(pans[1].originalValue, 'ABCPM4821K');
  assert.equal(validatePanStructure('ABCDE1234F').isValidFormat, true);
  assert.equal(validatePanStructure('ABCPM4821K').hasStandardEntityCode, true);
});

test('TEST 4: Aadhaar detection uses context clues, avoids order IDs, and flags uncertain matches for review', () => {
  const input = [
    'Aadhaar ID: 2468 1357 9024',
    'Unlabeled: 4567 8912 3456',
    'Order ID: 998877665544',
    'Invoice Ref: 4455 6677 8899',
  ].join('\n');

  const dets = detectPIIInText(input);
  const aadhaars = dets.filter((d) => d.type === PII_TYPES.AADHAAR);
  assert.equal(aadhaars.length, 2);
  assert.equal(aadhaars[0].originalValue, '2468 1357 9024');
  assert.equal(aadhaars[0].needsReview, false);
  assert.equal(aadhaars[1].originalValue, '4567 8912 3456');
  assert.equal(aadhaars[1].needsReview, true);
});

test('TEST 5: IPv4 detection validates octets 0-255 and rejects invalid IPv4 strings', () => {
  assert.equal(isValidIPv4('192.168.1.25'), true);
  assert.equal(isValidIPv4('0.0.0.0'), true);
  assert.equal(isValidIPv4('256.10.1.1'), false);
  assert.equal(isValidIPv4('192.168.1.999'), false);
  assert.equal(isValidIPv4('01.02.03.04'), false);

  const input = 'Valid: 192.168.1.25, 10.0.0.1. Invalid: 256.300.1.25, 999.999.999.999, 1.2.3.4.5.';
  const dets = detectPIIInText(input);
  const ips = dets.filter((d) => d.type === PII_TYPES.IPV4);
  assert.deepEqual(
    ips.map((d) => d.originalValue),
    ['192.168.1.25', '10.0.0.1']
  );
});

test('TEST 6 & 7: Credit card detection enforces Luhn algorithm and rejects invalid Luhn candidates', () => {
  assert.equal(passesLuhn('4111 1111 1111 1111'), true);
  assert.equal(passesLuhn('4111-1111-1111-1111'), true);
  assert.equal(passesLuhn('4111 1111 1111 1112'), false);
  assert.equal(passesLuhn('5555 5555 5555 5555'), false);

  const input = 'Valid: 4111 1111 1111 1111. Invalid Luhn: 4111 1111 1111 1112.';
  const dets = detectPIIInText(input);
  const cards = dets.filter((d) => d.type === PII_TYPES.CARD);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].originalValue, '4111 1111 1111 1111');
});

test('TEST 8: Full Mask mode replaces all enabled matches with [REDACTED]', () => {
  const input = 'Email riya.patel@gmail.com phone 9876543210 PAN ABCDE1234F';
  const dets = detectPIIInText(input);
  const { entityMap } = buildPseudonymSessionMap(dets);
  const res = applyRedactionToText(input, dets, {
    mode: REDACTION_MODES.FULL,
    enabledCategories: DEFAULT_ENABLED_CATEGORIES,
    pseudonymMap: entityMap,
  });
  assert.equal(res.sanitizedText, 'Email [REDACTED] phone [REDACTED] PAN [REDACTED]');
});

test('TEST 9: Partial Mask mode matches exact category specifications', () => {
  assert.equal(createPartialMask(PII_TYPES.EMAIL, 'riya.patel@gmail.com'), 'r***@g***.com');
  assert.equal(createPartialMask(PII_TYPES.PHONE, '9876543210'), '******3210');
  assert.equal(createPartialMask(PII_TYPES.PAN, 'ABCDE1234F'), 'XXXXX1234X');
  assert.equal(createPartialMask(PII_TYPES.AADHAAR, '1234 5678 9012'), 'XXXX XXXX 9012');
  assert.equal(createPartialMask(PII_TYPES.CARD, '4111 1111 1111 1111'), 'XXXX XXXX XXXX 1111');
  assert.equal(createPartialMask(PII_TYPES.IPV4, '192.168.1.25'), 'XXX.XXX.X.25');
});

test('TEST 10: Consistent Pseudonymization assigns identical IDs to repeated entities and distinct IDs to different ones', () => {
  const input = [
    'First: riya.patel@gmail.com / 9876543210 / 192.168.1.25',
    'Second: aarav@example.org / +91 9811223344',
    'Repeat: riya.patel@gmail.com / 9876543210 / 192.168.1.25',
  ].join('\n');

  const dets = detectPIIInText(input);
  const { entityMap } = buildPseudonymSessionMap(dets);
  const res = applyRedactionToText(input, dets, {
    mode: REDACTION_MODES.PSEUDONYM,
    enabledCategories: DEFAULT_ENABLED_CATEGORIES,
    pseudonymMap: entityMap,
  });

  assert.equal(
    res.sanitizedText,
    [
      'First: EMAIL_01 / PHONE_01 / IP_01',
      'Second: EMAIL_02 / PHONE_02',
      'Repeat: EMAIL_01 / PHONE_01 / IP_01',
    ].join('\n')
  );
});

test('TEST 11: Category filters keep disabled PII categories visible and unredacted', () => {
  const input = 'Email riya.patel@gmail.com and IP 192.168.1.25';
  const dets = detectPIIInText(input);
  const { entityMap } = buildPseudonymSessionMap(dets);
  const filters = {
    ...DEFAULT_ENABLED_CATEGORIES,
    [PII_TYPES.IPV4]: false,
  };
  const res = applyRedactionToText(input, dets, {
    mode: REDACTION_MODES.FULL,
    enabledCategories: filters,
    pseudonymMap: entityMap,
  });
  assert.equal(res.sanitizedText, 'Email [REDACTED] and IP 192.168.1.25');
  const summary = summarizeDetections(dets, filters);
  assert.equal(summary.sanitizedCount, 1);
  assert.equal(summary.excludedByCategoryCount, 1);
});

test('TEST 14 & 15: RFC-4180 CSV parser and redactor preserve quoted commas, escaped quotes, rows, and columns', () => {
  const csv = [
    'name,email,notes',
    '"Patel, Riya",riya.patel@gmail.com,"Quoted ""VIP"" note, Bengaluru"',
    '"Patel, Riya",riya.patel@gmail.com,"Follow up on 9876543210"',
  ].join('\n');

  const parsed = parseCSV(csv);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[1][0].value, 'Patel, Riya');
  assert.equal(parsed.rows[1][2].value, 'Quoted "VIP" note, Bengaluru');

  const analysis = analyzeCSVDocument(csv);
  const redacted = redactParsedCSV(analysis.parsedCsv, analysis.cellDetectionsMap, {
    mode: REDACTION_MODES.PSEUDONYM,
    enabledCategories: DEFAULT_ENABLED_CATEGORIES,
    pseudonymMap: analysis.pseudonymMap,
  });

  const reparsed = parseCSV(redacted.sanitizedText);
  assert.equal(reparsed.rows.length, 3);
  assert.equal(reparsed.rows[1][0].value, 'Patel, Riya');
  assert.equal(reparsed.rows[1][1].value, 'EMAIL_01');
  assert.equal(reparsed.rows[2][1].value, 'EMAIL_01');
  assert.equal(reparsed.rows[1][2].value, 'Quoted "VIP" note, Bengaluru');
  assert.equal(reparsed.rows[2][2].value, 'Follow up on PHONE_01');

  const roundTrip = serializeCSV(reparsed.rows);
  assert.ok(roundTrip.includes('"Patel, Riya"'));
  assert.ok(roundTrip.includes('"Quoted ""VIP"" note, Bengaluru"'));
});

test('Sample text and sample CSV detect all 6 required categories cleanly', () => {
  const textDets = detectPIIInText(SAMPLE_TEXT_DOCUMENT);
  const textCats = new Set(textDets.map((d) => d.type));
  for (const type of Object.values(PII_TYPES)) {
    assert.ok(textCats.has(type), `Sample text missing category ${type}`);
  }
  assert.equal(
    textDets.some((d) => d.originalValue === '4111 1111 1111 1112'),
    false,
    'Invalid Luhn control string must not be detected'
  );
  assert.equal(
    textDets.some((d) => d.originalValue === '256.300.1.25'),
    false,
    'Invalid IPv4 control string must not be detected'
  );

  const csvAnalysis = analyzeCSVDocument(SAMPLE_CSV_DOCUMENT);
  const csvCats = new Set(csvAnalysis.detections.map((d) => d.type));
  for (const type of Object.values(PII_TYPES)) {
    assert.ok(csvCats.has(type), `Sample CSV missing category ${type}`);
  }
});

test('Audit summary never leaks original PII values and risk drops to 0 when fully sanitized', () => {
  const input = 'Contact riya.patel@gmail.com or 9876543210';
  const dets = detectPIIInText(input);
  const summary = summarizeDetections(dets, DEFAULT_ENABLED_CATEGORIES);
  const risk = calculateHeuristicRisk(dets, DEFAULT_ENABLED_CATEGORIES);
  assert.ok(risk.originalScore > 0);
  assert.equal(risk.residualScore, 0);

  const evt = createAuditEvent({
    eventType: 'SCAN_COMPLETED',
    title: 'Scan completed',
    inputType: 'Pasted Text',
    totalDetected: dets.length,
    sanitizedCount: dets.length,
    redactionMode: REDACTION_MODES.FULL,
  });

  const report = buildAuditSummaryText({
    summary,
    risk,
    redactionMode: REDACTION_MODES.FULL,
    inputMeta: { fileName: null, inputTypeLabel: 'Pasted Text' },
    scanDurationMs: 1.5,
    exportStatus: 'Not exported',
    events: [evt],
  });

  assert.equal(report.includes('riya.patel@gmail.com'), false);
  assert.equal(report.includes('9876543210'), false);
});

test('TEST 19: File and input validation rejects unsupported extensions, empty inputs, and binary files', () => {
  assert.equal(validateUploadedFile({ name: 'report.pdf', size: 1024 }).valid, false);
  assert.equal(validateUploadedFile({ name: 'empty.txt', size: 0 }).valid, false);
  assert.equal(validateUploadedFile({ name: 'data.csv', size: 512 }).valid, true);
  assert.equal(validateTextContent('   \n  ', 'blank.txt').valid, false);
  assert.equal(validateTextContent('abc\u0000def', 'corrupt.txt').valid, false);
});

test('Edge cases: multiline quoted CSV, CRLF preservation, manual dismissal, and sentence periods', () => {
  const csv = 'id,profile,notes\r\n1,"Patel, Riya","Email: riya.patel@gmail.com.\r\nCall 9876543210."\r\n';
  const analysis = analyzeCSVDocument(csv);
  assert.equal(analysis.parsedCsv.lineEnding, '\r\n');
  assert.equal(analysis.parsedCsv.hasTrailingNewline, true);
  assert.equal(analysis.detections.length, 2);

  const dismissed = new Set([analysis.detections[1].id]);
  const res = redactParsedCSV(analysis.parsedCsv, analysis.cellDetectionsMap, {
    mode: REDACTION_MODES.FULL,
    enabledCategories: DEFAULT_ENABLED_CATEGORIES,
    dismissedIds: dismissed,
    pseudonymMap: analysis.pseudonymMap,
  });

  assert.ok(res.sanitizedText.includes('[REDACTED].\r\nCall 9876543210.'));
  assert.ok(res.sanitizedText.endsWith('\r\n'));
});

test('Client-side privacy guarantee: zero network calls or persistent document storage in src/', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });

  const files = walk(srcDir).filter((f) => /\.(js|jsx)$/.test(f));
  assert.ok(files.length > 10);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(/\bfetch\s*\(/.test(content), false, `Unexpected fetch() in ${file}`);
    assert.equal(/\baxios\b/.test(content), false, `Unexpected axios in ${file}`);
    assert.equal(/\bXMLHttpRequest\b/.test(content), false, `Unexpected XHR in ${file}`);
    assert.equal(/localStorage\.(setItem|getItem)/.test(content), false, `Unexpected localStorage in ${file}`);
    assert.equal(/sessionStorage\.(setItem|getItem)/.test(content), false, `Unexpected sessionStorage in ${file}`);
  }
});

test('React components render cleanly without runtime errors (Vite SSR component suite)', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
    logLevel: 'silent',
    cacheDir: path.join(os.tmpdir(), `senvy-vite-ssr-${process.pid}`),
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
    const appHtml = renderToString(React.createElement(App));
    assert.ok(appHtml.includes('SENVY'));
    assert.ok(appHtml.includes('Sensitive Data Protection'));
    assert.ok(appHtml.includes('Security &amp; Sanitization Dashboard'));
    assert.ok(appHtml.includes('Document Scanning Workspace'));
    assert.ok(appHtml.includes('LOCAL PRIVACY STATUS'));
    assert.ok(appHtml.includes('Detect it. Protect it. Share it safely.'));
    assert.equal(appHtml.includes('Sign In'), false);
    assert.equal(appHtml.includes('Create Account'), false);
    assert.equal(appHtml.includes('Sign Out'), false);

    // Render RedactionStudio, DetectionResults, AuditPanel, AboutSettingsPanel with live scan data
    const { default: RedactionStudio } = await vite.ssrLoadModule('/src/components/RedactionStudio.jsx');
    const { default: DetectionResults } = await vite.ssrLoadModule('/src/components/DetectionResults.jsx');
    const { default: AuditPanel } = await vite.ssrLoadModule('/src/components/AuditPanel.jsx');
    const { default: AboutSettingsPanel } = await vite.ssrLoadModule('/src/components/AboutSettingsPanel.jsx');

    const csvAnalysis = analyzeCSVDocument(SAMPLE_CSV_DOCUMENT);
    const redactionResult = redactParsedCSV(csvAnalysis.parsedCsv, csvAnalysis.cellDetectionsMap, {
      mode: REDACTION_MODES.PSEUDONYM,
      enabledCategories: DEFAULT_ENABLED_CATEGORIES,
      pseudonymMap: csvAnalysis.pseudonymMap,
    });
    const summary = summarizeDetections(csvAnalysis.detections, DEFAULT_ENABLED_CATEGORIES);
    const risk = calculateHeuristicRisk(csvAnalysis.detections, DEFAULT_ENABLED_CATEGORIES);

    const studioHtml = renderToString(
      React.createElement(RedactionStudio, {
        hasScan: true,
        rawText: SAMPLE_CSV_DOCUMENT,
        redactionResult,
        redactionMode: REDACTION_MODES.PSEUDONYM,
        onChangeMode: () => {},
        enabledCategories: DEFAULT_ENABLED_CATEGORIES,
        onToggleCategory: () => {},
        onSelectAllCategories: () => {},
        onDeselectAllCategories: () => {},
        summary,
        isCsv: true,
        pseudonymEntries: csvAnalysis.pseudonymEntries,
        onCopySanitized: () => {},
        onDownloadTXT: () => {},
        onDownloadCSV: () => {},
        exportFeedback: '',
        onLoadSampleText: () => {},
        onLoadSampleCSV: () => {},
        onGoToScan: () => {},
      })
    );
    assert.ok(studioHtml.includes('EMAIL_01'));
    assert.ok(studioHtml.includes('PHONE_01'));
    assert.ok(studioHtml.includes('Session Pseudonymization Map'));

    const detHtml = renderToString(
      React.createElement(DetectionResults, {
        detections: redactionResult.enrichedDetections,
        enabledCategories: DEFAULT_ENABLED_CATEGORIES,
        dismissedIds: new Set(),
        onConfirmDetection: () => {},
        onToggleDismissDetection: () => {},
        hasScan: true,
      })
    );
    assert.ok(detHtml.includes('Detection Results'));
    // Must not render raw unmasked email/PAN in the DetectionResults table
    assert.equal(detHtml.includes('aarav.mehta@fictional-corp.in'), false);
    assert.equal(detHtml.includes('ABCPM4821K'), false);

    const auditHtml = renderToString(
      React.createElement(AuditPanel, {
        summary,
        risk,
        redactionMode: REDACTION_MODES.PSEUDONYM,
        inputMeta: { fileName: 'demo.csv', inputTypeLabel: 'Sample CSV (.csv)' },
        scanDurationMs: 2.1,
        exportStatus: '',
        events: [
          createAuditEvent({
            eventType: 'SCAN_COMPLETED',
            title: 'Scan completed',
            inputType: 'Sample CSV (.csv)',
            totalDetected: summary.totalDetected,
            sanitizedCount: summary.sanitizedCount,
            redactionMode: REDACTION_MODES.PSEUDONYM,
          }),
        ],
        hasScan: true,
        onCopyAuditSummary: async () => true,
        onDownloadAuditSummary: () => {},
      })
    );
    assert.ok(auditHtml.includes('Heuristic Exposure Summary'));

    const settingsHtml = renderToString(
      React.createElement(AboutSettingsPanel, { hasActiveDocument: true })
    );
    assert.ok(settingsHtml.includes('LOCAL PRIVACY STATUS'));
  } finally {
    await vite.close();
  }
});

test('Account-free guarantee: no authentication modules or login/signup UI exist in src/', () => {
  assert.equal(fs.existsSync(path.resolve(process.cwd(), 'src', 'auth')), false);
  assert.equal(fs.existsSync(path.resolve(process.cwd(), 'src', 'components', 'auth')), false);
});
