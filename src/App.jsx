import React, { useMemo, useState } from 'react';
import {
  DEFAULT_ENABLED_CATEGORIES,
  PII_CATEGORY_ORDER,
  REDACTION_MODES,
  REDACTION_MODE_META,
} from './constants/categories.js';
import { SAMPLE_CSV_DOCUMENT, SAMPLE_TEXT_DOCUMENT } from './constants/sampleData.js';
import { detectPIIInText, summarizeDetections } from './engine/detectionEngine.js';
import { applyRedactionToText, buildPseudonymSessionMap } from './engine/maskingEngine.js';
import { analyzeCSVDocument, redactParsedCSV, serializeCSV } from './engine/csvProcessor.js';
import {
  buildAuditSummaryText,
  calculateHeuristicRisk,
  createAuditEvent,
} from './utils/auditLogger.js';
import {
  buildSafeExportFilename,
  copyToClipboard,
  downloadBlobFile,
} from './utils/exportUtils.js';
import { validateTextContent, validateUploadedFile } from './utils/fileValidation.js';

import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import DashboardCards from './components/DashboardCards.jsx';
import CategoryBreakdownCards from './components/CategoryBreakdownCards.jsx';
import InputWorkspace from './components/InputWorkspace.jsx';
import CategoryFilters from './components/CategoryFilters.jsx';
import OriginalPreview from './components/OriginalPreview.jsx';
import DetectionResults from './components/DetectionResults.jsx';
import RedactionStudio from './components/RedactionStudio.jsx';
import AuditPanel from './components/AuditPanel.jsx';
import PrivacyPanel from './components/PrivacyPanel.jsx';
import AboutSettingsPanel from './components/AboutSettingsPanel.jsx';
import { ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';

const INITIAL_INPUT_META = {
  fileName: null,
  fileSize: null,
  format: 'text',
  inputTypeLabel: 'Pasted Text',
};

const INITIAL_SCAN_STATE = {
  hasScan: false,
  status: 'idle', // 'idle' | 'scanning' | 'completed' | 'error'
  durationMs: null,
  detections: [],
  parsedCsv: null,
  cellDetectionsMap: null,
  pseudonymMap: new Map(),
  pseudonymEntries: [],
  csvWarnings: [],
};

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Volatile in-memory document state (never persisted to storage)
  const [rawText, setRawText] = useState('');
  const [inputMeta, setInputMeta] = useState(INITIAL_INPUT_META);
  const [isSampleData, setIsSampleData] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [scanState, setScanState] = useState(INITIAL_SCAN_STATE);
  const [isDirtySinceScan, setIsDirtySinceScan] = useState(false);

  const [redactionMode, setRedactionMode] = useState(REDACTION_MODES.FULL);
  const [enabledCategories, setEnabledCategories] = useState({ ...DEFAULT_ENABLED_CATEGORIES });
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  const [auditEvents, setAuditEvents] = useState([]);
  const [exportStatus, setExportStatus] = useState('');
  const [exportFeedback, setExportFeedback] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const appendAuditEvent = (eventPayload) => {
    setAuditEvents((prev) => [createAuditEvent(eventPayload), ...prev]);
  };

  const showTimedFeedback = (msg) => {
    setExportFeedback(msg);
    setTimeout(() => {
      setExportFeedback((curr) => (curr === msg ? '' : curr));
    }, 3000);
  };

  // Core local scan runner
  const runLocalScan = (textToScan, metaToUse, activeMode = redactionMode) => {
    const contentCheck = validateTextContent(textToScan, metaToUse.fileName || 'Pasted text');
    if (!contentCheck.valid) {
      setErrorMessage(contentCheck.error);
      setScanState((prev) => ({ ...prev, status: 'error' }));
      return false;
    }

    setErrorMessage('');
    setScanState((prev) => ({ ...prev, status: 'scanning' }));

    const t0 = performance.now();
    let detections = [];
    let parsedCsv = null;
    let cellDetectionsMap = null;
    let pseudonymMap = new Map();
    let pseudonymEntries = [];
    let csvWarnings = [];

    if (metaToUse.format === 'csv') {
      const result = analyzeCSVDocument(textToScan);
      parsedCsv = result.parsedCsv;
      detections = result.detections;
      cellDetectionsMap = result.cellDetectionsMap;
      pseudonymMap = result.pseudonymMap;
      pseudonymEntries = result.pseudonymEntries;
      csvWarnings = result.parsedCsv.warnings || [];
    } else {
      detections = detectPIIInText(textToScan);
      const pseudo = buildPseudonymSessionMap(detections);
      pseudonymMap = pseudo.entityMap;
      pseudonymEntries = pseudo.entries;
    }

    const durationMs = Math.max(0.05, performance.now() - t0);

    setDismissedIds(new Set());
    setIsDirtySinceScan(false);
    setScanState({
      hasScan: true,
      status: 'completed',
      durationMs,
      detections,
      parsedCsv,
      cellDetectionsMap,
      pseudonymMap,
      pseudonymEntries,
      csvWarnings,
    });

    const detectedCategoryList = PII_CATEGORY_ORDER.filter((cat) =>
      detections.some((d) => d.type === cat)
    );
    const activeCount = detections.filter((d) => enabledCategories[d.type] !== false).length;

    appendAuditEvent({
      eventType: 'SCAN_COMPLETED',
      title: 'Scan completed',
      inputType: metaToUse.inputTypeLabel,
      fileName: metaToUse.fileName,
      categoriesDetected: detectedCategoryList,
      totalDetected: detections.length,
      sanitizedCount: activeCount,
      redactionMode: activeMode,
      detail: `${detections.length} match(es) detected in ${durationMs.toFixed(2)} ms across ${detectedCategoryList.length} categor${detectedCategoryList.length === 1 ? 'y' : 'ies'}.`,
    });

    appendAuditEvent({
      eventType: 'RESULTS_GENERATED',
      title: 'Detection results generated',
      inputType: metaToUse.inputTypeLabel,
      fileName: metaToUse.fileName,
      categoriesDetected: detectedCategoryList,
      totalDetected: detections.length,
      sanitizedCount: activeCount,
      redactionMode: activeMode,
      detail: `${pseudonymEntries.length} unique entity signature(s) indexed in browser memory.`,
    });

    return true;
  };

  // Compute live redaction result whenever mode, category filters, or dismissed items change
  const redactionResult = useMemo(() => {
    if (!scanState.hasScan) {
      return {
        sanitizedText: '',
        originalSegments: [],
        sanitizedSegments: [],
        enrichedDetections: [],
        tableRows: [],
      };
    }

    if (inputMeta.format === 'csv' && scanState.parsedCsv && scanState.cellDetectionsMap) {
      return redactParsedCSV(scanState.parsedCsv, scanState.cellDetectionsMap, {
        mode: redactionMode,
        enabledCategories,
        dismissedIds,
        pseudonymMap: scanState.pseudonymMap,
      });
    }

    return applyRedactionToText(rawText, scanState.detections, {
      mode: redactionMode,
      enabledCategories,
      dismissedIds,
      pseudonymMap: scanState.pseudonymMap,
    });
  }, [
    scanState,
    inputMeta.format,
    rawText,
    redactionMode,
    enabledCategories,
    dismissedIds,
  ]);

  const summary = useMemo(
    () => summarizeDetections(scanState.detections, enabledCategories, dismissedIds),
    [scanState.detections, enabledCategories, dismissedIds]
  );

  const risk = useMemo(
    () => calculateHeuristicRisk(scanState.detections, enabledCategories, dismissedIds),
    [scanState.detections, enabledCategories, dismissedIds]
  );

  // Handlers
  const handleTextChange = (nextText) => {
    setRawText(nextText);
    setErrorMessage('');
    if (isSampleData) {
      setIsSampleData(false);
    }
    if (!inputMeta.fileName) {
      setInputMeta({
        fileName: null,
        fileSize: null,
        format: 'text',
        inputTypeLabel: 'Pasted Text',
      });
    }
    if (scanState.hasScan) {
      setIsDirtySinceScan(true);
    }
  };

  const handleFileUpload = async (file) => {
    const fileValidation = validateUploadedFile(file);
    if (!fileValidation.valid) {
      setErrorMessage(fileValidation.error);
      setScanState((prev) => ({ ...prev, status: 'error' }));
      return;
    }

    try {
      const content = await file.text();
      const textValidation = validateTextContent(content, file.name);
      if (!textValidation.valid) {
        setErrorMessage(textValidation.error);
        setScanState((prev) => ({ ...prev, status: 'error' }));
        return;
      }

      const nextMeta = {
        fileName: file.name,
        fileSize: file.size,
        format: fileValidation.ext === 'csv' ? 'csv' : 'text',
        inputTypeLabel: fileValidation.ext === 'csv' ? 'CSV File (.csv)' : 'Text File (.txt)',
      };

      setRawText(content);
      setInputMeta(nextMeta);
      setIsSampleData(false);
      setErrorMessage('');
      setExportStatus('');

      appendAuditEvent({
        eventType: 'FILE_LOADED',
        title: 'File loaded',
        inputType: nextMeta.inputTypeLabel,
        fileName: nextMeta.fileName,
        redactionMode,
        detail: `Loaded ${nextMeta.fileName} (${file.size} bytes) locally via Browser File API.`,
      });

      runLocalScan(content, nextMeta);
    } catch {
      setErrorMessage(`Unable to read "${file.name}". Ensure it is a valid UTF-8 text or CSV file.`);
      setScanState((prev) => ({ ...prev, status: 'error' }));
    }
  };

  const handleLoadSampleText = () => {
    const nextMeta = {
      fileName: 'demo_incident_sample.txt',
      fileSize: new Blob([SAMPLE_TEXT_DOCUMENT]).size,
      format: 'text',
      inputTypeLabel: 'Sample Text (.txt)',
    };
    setRawText(SAMPLE_TEXT_DOCUMENT);
    setInputMeta(nextMeta);
    setIsSampleData(true);
    setErrorMessage('');
    setExportStatus('');

    appendAuditEvent({
      eventType: 'SAMPLE_LOADED',
      title: 'File loaded',
      inputType: nextMeta.inputTypeLabel,
      fileName: nextMeta.fileName,
      redactionMode,
      detail: 'Loaded fictional demo text dataset (DEMO DATA — NOT REAL PERSONAL INFORMATION).',
    });

    runLocalScan(SAMPLE_TEXT_DOCUMENT, nextMeta);
  };

  const handleLoadSampleCSV = () => {
    const nextMeta = {
      fileName: 'demo_customers_sample.csv',
      fileSize: new Blob([SAMPLE_CSV_DOCUMENT]).size,
      format: 'csv',
      inputTypeLabel: 'Sample CSV (.csv)',
    };
    setRawText(SAMPLE_CSV_DOCUMENT);
    setInputMeta(nextMeta);
    setIsSampleData(true);
    setErrorMessage('');
    setExportStatus('');

    appendAuditEvent({
      eventType: 'SAMPLE_LOADED',
      title: 'File loaded',
      inputType: nextMeta.inputTypeLabel,
      fileName: nextMeta.fileName,
      redactionMode,
      detail: 'Loaded fictional demo CSV dataset with quoted commas & escaped quotes.',
    });

    runLocalScan(SAMPLE_CSV_DOCUMENT, nextMeta);
  };

  const handleManualScan = () => {
    if (!rawText || rawText.trim().length === 0) {
      setErrorMessage(
        'Input is empty. Paste text, upload a .txt/.csv file, or click "Load Sample Text" first.'
      );
      setScanState((prev) => ({ ...prev, status: 'error' }));
      return;
    }
    runLocalScan(rawText, inputMeta);
  };

  const handleClearInput = () => {
    const prevType = inputMeta.inputTypeLabel;
    const prevFile = inputMeta.fileName;

    setRawText('');
    setInputMeta(INITIAL_INPUT_META);
    setIsSampleData(false);
    setErrorMessage('');
    setScanState(INITIAL_SCAN_STATE);
    setIsDirtySinceScan(false);
    setDismissedIds(new Set());
    setExportFeedback('');

    appendAuditEvent({
      eventType: 'INPUT_CLEARED',
      title: 'Input cleared',
      inputType: prevType,
      fileName: prevFile,
      redactionMode,
      detail: 'Cleared source document, scan results, sanitized output, and pseudonym map from memory.',
    });
  };

  const handleConfirmResetSession = () => {
    setRawText('');
    setInputMeta(INITIAL_INPUT_META);
    setIsSampleData(false);
    setErrorMessage('');
    setScanState(INITIAL_SCAN_STATE);
    setIsDirtySinceScan(false);
    setRedactionMode(REDACTION_MODES.FULL);
    setEnabledCategories({ ...DEFAULT_ENABLED_CATEGORIES });
    setDismissedIds(new Set());
    setAuditEvents([]);
    setExportStatus('');
    setExportFeedback('');
    setShowResetModal(false);
  };

  const handleChangeMode = (nextMode) => {
    if (nextMode === redactionMode) return;
    setRedactionMode(nextMode);
    if (scanState.hasScan) {
      appendAuditEvent({
        eventType: 'MODE_CHANGED',
        title: 'Redaction mode changed',
        inputType: inputMeta.inputTypeLabel,
        fileName: inputMeta.fileName,
        totalDetected: summary.totalDetected,
        sanitizedCount: summary.sanitizedCount,
        redactionMode: nextMode,
        detail: `Switched masking mode to ${REDACTION_MODE_META[nextMode]?.label || nextMode}.`,
      });
    }
  };

  const handleToggleCategory = (type) => {
    setEnabledCategories((prev) => ({
      ...prev,
      [type]: prev[type] === false,
    }));
  };

  const handleSelectAllCategories = () => {
    setEnabledCategories({ ...DEFAULT_ENABLED_CATEGORIES });
  };

  const handleDeselectAllCategories = () => {
    const noneEnabled = {};
    for (const type of PII_CATEGORY_ORDER) {
      noneEnabled[type] = false;
    }
    setEnabledCategories(noneEnabled);
  };

  const handleConfirmDetection = (detId) => {
    setScanState((prev) => {
      const nextDetections = prev.detections.map((d) =>
        d.id === detId ? { ...d, reviewStatus: 'confirmed' } : d
      );
      let nextCellMap = prev.cellDetectionsMap;
      if (prev.cellDetectionsMap) {
        nextCellMap = new Map();
        for (const [key, list] of prev.cellDetectionsMap.entries()) {
          nextCellMap.set(
            key,
            list.map((d) => (d.id === detId ? { ...d, reviewStatus: 'confirmed' } : d))
          );
        }
      }
      return {
        ...prev,
        detections: nextDetections,
        cellDetectionsMap: nextCellMap,
      };
    });
  };

  const handleChangeFormat = (nextFormat) => {
    if (nextFormat === inputMeta.format) return;
    const nextMeta = {
      ...inputMeta,
      format: nextFormat,
      inputTypeLabel:
        nextFormat === 'csv'
          ? inputMeta.fileName
            ? 'CSV File (.csv)'
            : 'Pasted CSV'
          : inputMeta.fileName
          ? 'Text File (.txt)'
          : 'Pasted Text',
    };
    setInputMeta(nextMeta);
    if (rawText.trim().length > 0 && scanState.hasScan) {
      runLocalScan(rawText, nextMeta);
    }
  };

  const handleToggleDismissDetection = (detId) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      if (next.has(detId)) {
        next.delete(detId);
      } else {
        next.add(detId);
      }
      return next;
    });
  };

  const handleCopySanitized = async () => {
    if (!redactionResult.sanitizedText) return;
    const ok = await copyToClipboard(redactionResult.sanitizedText);
    if (ok) {
      const timeLabel = new Date().toLocaleTimeString([], { hour12: false });
      setExportStatus(`Copied sanitized output at ${timeLabel}`);
      showTimedFeedback('Sanitized output copied');
      appendAuditEvent({
        eventType: 'OUTPUT_COPIED',
        title: 'Sanitized output copied',
        inputType: inputMeta.inputTypeLabel,
        fileName: inputMeta.fileName,
        totalDetected: summary.totalDetected,
        sanitizedCount: summary.sanitizedCount,
        redactionMode,
        detail: `Copied ${redactionResult.sanitizedText.length} characters to clipboard.`,
      });
    }
  };

  const handleDownloadTXT = () => {
    if (!redactionResult.sanitizedText) return;
    const filename = buildSafeExportFilename('txt');
    downloadBlobFile(redactionResult.sanitizedText, filename, 'text/plain;charset=utf-8');
    const timeLabel = new Date().toLocaleTimeString([], { hour12: false });
    setExportStatus(`Exported ${filename} at ${timeLabel}`);
    showTimedFeedback(`Downloaded ${filename}`);
    appendAuditEvent({
      eventType: 'FILE_EXPORTED',
      title: 'Sanitized file exported',
      inputType: inputMeta.inputTypeLabel,
      fileName: filename,
      totalDetected: summary.totalDetected,
      sanitizedCount: summary.sanitizedCount,
      redactionMode,
      detail: `Exported sanitized TXT file (${filename}).`,
    });
  };

  const handleDownloadCSV = () => {
    if (!redactionResult.sanitizedText) return;
    const filename = buildSafeExportFilename('csv');
    let csvOutput = redactionResult.sanitizedText;

    if (inputMeta.format !== 'csv') {
      const lines = redactionResult.sanitizedText.split(/\r\n|\r|\n/);
      const rows = [
        ['line_number', 'sanitized_text'],
        ...lines.map((line, idx) => [String(idx + 1), line]),
      ];
      csvOutput = serializeCSV(rows);
    }

    downloadBlobFile(csvOutput, filename, 'text/csv;charset=utf-8');
    const timeLabel = new Date().toLocaleTimeString([], { hour12: false });
    setExportStatus(`Exported ${filename} at ${timeLabel}`);
    showTimedFeedback(`Downloaded ${filename}`);
    appendAuditEvent({
      eventType: 'FILE_EXPORTED',
      title: 'Sanitized file exported',
      inputType: inputMeta.inputTypeLabel,
      fileName: filename,
      totalDetected: summary.totalDetected,
      sanitizedCount: summary.sanitizedCount,
      redactionMode,
      detail: `Exported valid RFC-4180 CSV (${filename}).`,
    });
  };

  const buildCurrentAuditReportText = () =>
    buildAuditSummaryText({
      summary,
      risk,
      redactionMode,
      inputMeta,
      scanDurationMs: scanState.durationMs,
      exportStatus,
      events: auditEvents,
    });

  const handleCopyAuditSummary = async () => {
    const text = buildCurrentAuditReportText();
    return copyToClipboard(text);
  };

  const handleDownloadAuditSummary = () => {
    const text = buildCurrentAuditReportText();
    const filename = buildSafeExportFilename('txt', 'senvy_audit_report');
    downloadBlobFile(text, filename, 'text/plain;charset=utf-8');
    appendAuditEvent({
      eventType: 'AUDIT_EXPORTED',
      title: 'Audit summary exported',
      inputType: inputMeta.inputTypeLabel,
      fileName: filename,
      totalDetected: summary.totalDetected,
      sanitizedCount: summary.sanitizedCount,
      redactionMode,
      detail: `Downloaded PII-free privacy audit report (${filename}).`,
    });
  };

  const hasAnySessionData =
    Boolean(rawText) || scanState.hasScan || auditEvents.length > 0 || Boolean(errorMessage);

  return (
    <div className="flex min-h-screen bg-[#F8F9F6] text-[#303A33]">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        summary={summary}
        hasScan={scanState.hasScan}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          activeView={activeView}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onLoadSampleText={handleLoadSampleText}
          onRequestReset={() => {
            if (hasAnySessionData) {
              setShowResetModal(true);
            }
          }}
          onOpenPrivacyView={() => setActiveView('settings')}
          hasData={hasAnySessionData}
          scanStatus={scanState.status}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1520px] w-full mx-auto space-y-5">
          {activeView === 'dashboard' && (
            <>
              <DashboardCards
                summary={summary}
                redactionMode={redactionMode}
                hasScan={scanState.hasScan}
              />

              <CategoryBreakdownCards
                summary={summary}
                enabledCategories={enabledCategories}
                hasScan={scanState.hasScan}
              />

              <InputWorkspace
                rawText={rawText}
                onTextChange={handleTextChange}
                onFileUpload={handleFileUpload}
                onLoadSampleText={handleLoadSampleText}
                onLoadSampleCSV={handleLoadSampleCSV}
                onScan={handleManualScan}
                onClear={handleClearInput}
                onChangeFormat={handleChangeFormat}
                inputMeta={inputMeta}
                scanStatus={scanState.status}
                isDirtySinceScan={isDirtySinceScan}
                errorMessage={errorMessage}
                csvWarnings={scanState.csvWarnings}
                isSampleData={isSampleData}
                hasScan={scanState.hasScan}
                detectionCount={summary.totalDetected}
              />

              {scanState.hasScan && (
                <>
                  <RedactionStudio
                    hasScan={scanState.hasScan}
                    rawText={rawText}
                    redactionResult={redactionResult}
                    redactionMode={redactionMode}
                    onChangeMode={handleChangeMode}
                    enabledCategories={enabledCategories}
                    onToggleCategory={handleToggleCategory}
                    onSelectAllCategories={handleSelectAllCategories}
                    onDeselectAllCategories={handleDeselectAllCategories}
                    summary={summary}
                    isCsv={inputMeta.format === 'csv'}
                    pseudonymEntries={scanState.pseudonymEntries}
                    onCopySanitized={handleCopySanitized}
                    onDownloadTXT={handleDownloadTXT}
                    onDownloadCSV={handleDownloadCSV}
                    exportFeedback={exportFeedback}
                    onLoadSampleText={handleLoadSampleText}
                    onLoadSampleCSV={handleLoadSampleCSV}
                    onGoToScan={() => setActiveView('scan')}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAE4] bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
                    <div className="text-xs text-[#545E55]">
                      Review individual masked detections, confirm uncertain matches, or inspect the
                      full audit log.
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveView('scan')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-3 py-1.5 text-xs font-medium text-[#303A33] hover:bg-[#EAF2EA] transition-colors"
                      >
                        <span>Review Detections ({summary.totalDetected})</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#668A70]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('audit')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#789B81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#668A70] transition-colors"
                      >
                        <span>Open Audit Report</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <PrivacyPanel compact={true} hasActiveDocument={Boolean(rawText)} />
            </>
          )}

          {activeView === 'scan' && (
            <>
              <InputWorkspace
                rawText={rawText}
                onTextChange={handleTextChange}
                onFileUpload={handleFileUpload}
                onLoadSampleText={handleLoadSampleText}
                onLoadSampleCSV={handleLoadSampleCSV}
                onScan={handleManualScan}
                onClear={handleClearInput}
                onChangeFormat={handleChangeFormat}
                inputMeta={inputMeta}
                scanStatus={scanState.status}
                isDirtySinceScan={isDirtySinceScan}
                errorMessage={errorMessage}
                csvWarnings={scanState.csvWarnings}
                isSampleData={isSampleData}
                hasScan={scanState.hasScan}
                detectionCount={summary.totalDetected}
              />

              <CategoryBreakdownCards
                summary={summary}
                enabledCategories={enabledCategories}
                hasScan={scanState.hasScan}
              />

              <CategoryFilters
                enabledCategories={enabledCategories}
                onToggleCategory={handleToggleCategory}
                onSelectAll={handleSelectAllCategories}
                onDeselectAll={handleDeselectAllCategories}
                summary={summary}
                hasScan={scanState.hasScan}
              />

              {scanState.hasScan && (
                <OriginalPreview
                  segments={redactionResult.originalSegments}
                  rawText={rawText}
                  isCsv={inputMeta.format === 'csv'}
                  viewMode="raw"
                  tableRows={redactionResult.tableRows}
                  enabledCategories={enabledCategories}
                />
              )}

              <DetectionResults
                detections={redactionResult.enrichedDetections}
                enabledCategories={enabledCategories}
                dismissedIds={dismissedIds}
                onConfirmDetection={handleConfirmDetection}
                onToggleDismissDetection={handleToggleDismissDetection}
                hasScan={scanState.hasScan}
              />
            </>
          )}

          {activeView === 'studio' && (
            <>
              <RedactionStudio
                hasScan={scanState.hasScan}
                rawText={rawText}
                redactionResult={redactionResult}
                redactionMode={redactionMode}
                onChangeMode={handleChangeMode}
                enabledCategories={enabledCategories}
                onToggleCategory={handleToggleCategory}
                onSelectAllCategories={handleSelectAllCategories}
                onDeselectAllCategories={handleDeselectAllCategories}
                summary={summary}
                isCsv={inputMeta.format === 'csv'}
                pseudonymEntries={scanState.pseudonymEntries}
                onCopySanitized={handleCopySanitized}
                onDownloadTXT={handleDownloadTXT}
                onDownloadCSV={handleDownloadCSV}
                exportFeedback={exportFeedback}
                onLoadSampleText={handleLoadSampleText}
                onLoadSampleCSV={handleLoadSampleCSV}
                onGoToScan={() => setActiveView('scan')}
              />

              {scanState.hasScan && (
                <DetectionResults
                  detections={redactionResult.enrichedDetections}
                  enabledCategories={enabledCategories}
                  dismissedIds={dismissedIds}
                  onConfirmDetection={handleConfirmDetection}
                  onToggleDismissDetection={handleToggleDismissDetection}
                  hasScan={scanState.hasScan}
                />
              )}
            </>
          )}

          {activeView === 'audit' && (
            <AuditPanel
              summary={summary}
              risk={risk}
              redactionMode={redactionMode}
              inputMeta={inputMeta}
              scanDurationMs={scanState.durationMs}
              exportStatus={exportStatus}
              events={auditEvents}
              hasScan={scanState.hasScan}
              onCopyAuditSummary={handleCopyAuditSummary}
              onDownloadAuditSummary={handleDownloadAuditSummary}
            />
          )}

          {activeView === 'settings' && (
            <AboutSettingsPanel hasActiveDocument={Boolean(rawText)} />
          )}
        </main>
      </div>

      {/* Session Reset Confirmation Modal */}
      {showResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#303A33]/30 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E5EAE4] bg-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F7F3D9] border border-[#E6DFB5]">
                <AlertTriangle className="h-5 w-5 text-[#877B33]" />
              </div>
              <div>
                <h2 id="reset-dialog-title" className="text-base font-semibold text-[#303A33]">
                  Start New Scan Session?
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5E675E]">
                  This will wipe the current document, detection results, sanitized output,
                  pseudonym mapping, and session audit log from browser memory.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="rounded-lg border border-[#E5EAE4] bg-white px-4 py-2 text-xs font-medium text-[#303A33] hover:bg-[#F8F9F6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetSession}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#789B81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#668A70]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
