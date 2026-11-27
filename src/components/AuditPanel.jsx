import React, { useState } from 'react';
import {
  ClipboardCheck,
  Copy,
  Download,
  Clock,
  Info,
  CheckCircle2,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { CATEGORY_META, PII_CATEGORY_ORDER, REDACTION_MODE_META } from '../constants/categories.js';
import { APP_PROMPT_SUMMARY } from '../utils/auditLogger.js';

export default function AuditPanel({
  summary,
  risk,
  redactionMode,
  inputMeta,
  scanDurationMs,
  exportStatus,
  events,
  hasScan,
  onCopyAuditSummary,
  onDownloadAuditSummary,
}) {
  const [auditFeedback, setAuditFeedback] = useState('');

  const handleCopy = async () => {
    const ok = await onCopyAuditSummary();
    if (ok) {
      setAuditFeedback('Audit summary copied');
      setTimeout(() => setAuditFeedback(''), 2500);
    }
  };

  const handleDownload = () => {
    onDownloadAuditSummary();
    setAuditFeedback('Audit report downloaded');
    setTimeout(() => setAuditFeedback(''), 2500);
  };

  const modeLabel = REDACTION_MODE_META[redactionMode]?.label || redactionMode;
  const excludedLabels = summary.excludedCategories.map((c) => CATEGORY_META[c]?.label || c);

  const levelBadgeColor = (level) => {
    switch (level) {
      case 'Critical':
        return 'bg-[#F8E7E9] text-[#5C2B31] border-[#EBD0D3]';
      case 'High':
        return 'bg-[#FAEFE4] text-[#5C4124] border-[#EDD8C3]';
      case 'Moderate':
        return 'bg-[#E8F1FA] text-[#303A33] border-[#CFE0F2]';
      case 'Low':
        return 'bg-[#EAF2EA] text-[#303A33] border-[#C7DDCB]';
      default:
        return 'bg-[#F8F9F6] text-[#6B746B] border-[#E5EAE4]';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAE4] bg-white p-5 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF2EA] border border-[#C7DDCB]">
            <ClipboardCheck className="h-5 w-5 text-[#668A70]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#303A33]">Privacy & Risk Audit Report</h2>
            <p className="text-xs text-[#6B746B]">
              In-memory session metrics and audit trail — zero original PII values are ever logged.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-3.5 py-2 text-xs font-medium text-[#303A33] hover:bg-[#EAF2EA] transition-colors"
          >
            <Copy className="h-3.5 w-3.5 text-[#668A70]" />
            <span>Copy Audit Summary</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#789B81] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#668A70] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Audit (.TXT)</span>
          </button>

          {auditFeedback && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF2EA] border border-[#C7DDCB] px-2.5 py-1 text-xs text-[#303A33]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#668A70]" />
              <span>{auditFeedback}</span>
            </span>
          )}
        </div>
      </div>

      {/* Audit Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#E5EAE4] bg-white p-5 lg:col-span-2 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
          <h3 className="text-sm font-semibold text-[#303A33] mb-3">Scan & Redaction Telemetry</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Total PII Occurrences</span>
              <div className="mt-1 text-xl font-semibold text-[#303A33] tabular-nums">
                {hasScan ? summary.totalDetected : 0}
              </div>
            </div>
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Unique Sensitive Entities</span>
              <div className="mt-1 text-xl font-semibold text-[#303A33] tabular-nums">
                {hasScan ? summary.uniqueEntities : 0}
              </div>
            </div>
            <div className="rounded-lg border border-[#C7DDCB] bg-[#EAF2EA] p-3">
              <span className="text-[#545E55]">Sanitized Entity Count</span>
              <div className="mt-1 text-xl font-semibold text-[#303A33] tabular-nums">
                {hasScan ? summary.sanitizedCount : 0}
              </div>
            </div>
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Selected Redaction Mode</span>
              <div className="mt-1 font-semibold text-[#303A33]">{modeLabel}</div>
            </div>
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Input File Type</span>
              <div className="mt-1 font-semibold text-[#303A33]">{inputMeta.inputTypeLabel}</div>
            </div>
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Scan Processing Time</span>
              <div className="mt-1 font-mono font-semibold text-[#303A33]">
                {scanDurationMs !== null ? `${scanDurationMs.toFixed(2)} ms` : 'Not scanned'}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Excluded Categories</span>
              <div className="mt-1 font-medium text-[#303A33]">
                {excludedLabels.length > 0 ? excludedLabels.join(', ') : 'None (all 6 active)'}
              </div>
            </div>
            <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3">
              <span className="text-[#6B746B]">Export Status</span>
              <div className="mt-1 font-medium text-[#303A33]">
                {exportStatus || 'Not exported yet in this session'}
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#E5EAE4]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAE4] bg-[#F8F9F6] text-[11px] text-[#6B746B] uppercase">
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Occurrences</th>
                  <th className="px-3 py-2">Unique Entities</th>
                  <th className="px-3 py-2">Filter Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAE4] bg-white">
                {PII_CATEGORY_ORDER.map((type) => {
                  const meta = CATEGORY_META[type];
                  const isExcluded = summary.excludedCategories.includes(type);
                  return (
                    <tr key={type}>
                      <td className="px-3 py-2 font-medium text-[#303A33]">
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-[#303A33]">
                        {hasScan ? summary.byCategory[type] || 0 : 0}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-[#303A33]">
                        {hasScan ? summary.uniqueCountsByCategory[type] || 0 : 0}
                      </td>
                      <td className="px-3 py-2">
                        {isExcluded ? (
                          <span className="rounded bg-[#F7F3D9] border border-[#E6DFB5] px-2 py-0.5 text-[11px] font-medium text-[#4E4720]">
                            Excluded
                          </span>
                        ) : (
                          <span className="rounded bg-[#EAF2EA] border border-[#C7DDCB] px-2 py-0.5 text-[11px] font-medium text-[#303A33]">
                            Sanitized
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transparent Heuristic Risk Summary */}
        <div className="rounded-xl border border-[#E5EAE4] bg-white p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4.5 w-4.5 text-[#96693E]" />
              <h3 className="text-sm font-semibold text-[#303A33]">Heuristic Exposure Summary</h3>
            </div>
            <p className="text-xs text-[#6B746B] leading-relaxed mb-4">
              Deterministic triage indicator calculated strictly from detected categories and unique
              entity counts.
            </p>

            <div className="space-y-3">
              <div className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3.5">
                <div className="flex items-center justify-between text-xs text-[#6B746B]">
                  <span>Pre-Sanitization Exposure</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelBadgeColor(
                      risk.originalLevel
                    )}`}
                  >
                    {risk.originalLevel}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-[#303A33] tabular-nums">
                    {hasScan ? risk.originalScore : 0}
                  </span>
                  <span className="text-xs text-[#858D85]">/ 100</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#C7DDCB] bg-[#EAF2EA] p-3.5">
                <div className="flex items-center justify-between text-xs text-[#545E55]">
                  <span>Post-Sanitization Residual</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelBadgeColor(
                      risk.residualLevel
                    )}`}
                  >
                    {risk.residualLevel}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold text-[#303A33] tabular-nums">
                    {hasScan ? risk.residualScore : 0}
                  </span>
                  <span className="text-xs text-[#6B746B]">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Documented Formula Disclosure */}
          <div className="mt-4 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3 text-[11px] text-[#5E675E] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#303A33]">
              <Info className="h-3.5 w-3.5 text-[#4D749D]" />
              <span>Formula & Disclaimer</span>
            </div>
            <p className="leading-relaxed">
              Weights per category (base + repeat up to cap): Card (25+5, max 35), Aadhaar (25+5, max
              35), PAN (20+4, max 30), Phone (12+3, max 20), Email (10+2, max 18), IPv4 (8+2, max
              15), summed and capped at 100.
            </p>
            <p className="text-[#877B33] font-medium">
              Heuristic indicator only — NOT a legal privacy audit or security certification.
            </p>
          </div>
        </div>
      </div>

      {/* Audit Timeline & Prompt Log / Audit Log */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Session Event Timeline */}
        <section className="rounded-xl border border-[#E5EAE4] bg-white p-5 lg:col-span-2 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#668A70]" />
              <h3 className="text-sm font-semibold text-[#303A33]">Session Audit Timeline</h3>
            </div>
            <span className="text-[11px] text-[#6B746B]">
              {events.length} event{events.length === 1 ? '' : 's'} (RAM only · zero PII stored)
            </span>
          </div>

          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#C7DDCB] bg-[#F8F9F6] py-8 text-center text-xs text-[#858D85]">
              Audit events will appear here as you load files, scan, switch modes, export, or clear.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-3.5 py-2.5 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#668A70]">
                        {ev.displayTime}
                      </span>
                      <span className="font-semibold text-[#303A33]">{ev.title}</span>
                      <span className="rounded bg-white border border-[#E5EAE4] px-1.5 py-0.5 text-[10px] font-mono text-[#6B746B]">
                        {ev.eventType}
                      </span>
                    </div>
                    {ev.detail && <p className="text-[11px] text-[#5E675E]">{ev.detail}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[#5E675E] shrink-0">
                    {ev.inputType && ev.inputType !== 'none' && (
                      <span className="rounded border border-[#E5EAE4] bg-white px-1.5 py-0.5">
                        {ev.inputType}
                      </span>
                    )}
                    {ev.redactionMode && (
                      <span className="rounded border border-[#E5EAE4] bg-white px-1.5 py-0.5">
                        {ev.redactionMode}
                      </span>
                    )}
                    {ev.totalDetected > 0 && (
                      <span className="rounded border border-[#C7DDCB] bg-[#EAF2EA] px-1.5 py-0.5 text-[#303A33] font-semibold">
                        {ev.sanitizedCount}/{ev.totalDetected} sanitized
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Application Prompt & Architecture Log */}
        <section className="rounded-xl border border-[#E5EAE4] bg-white p-5 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-[#4D749D]" />
            <h3 className="text-sm font-semibold text-[#303A33]">Prompt & Policy Spec Log</h3>
          </div>
          <p className="text-xs leading-relaxed text-[#303A33] rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] p-3.5">
            {APP_PROMPT_SUMMARY}
          </p>
          <ul className="mt-3 space-y-1.5 text-[11px] text-[#6B746B]">
            <li>• Audit history omits raw sensitive strings and source documents.</li>
            <li>• Logs reside solely in React state and reset on New Scan.</li>
            <li>• Detection results require human review for uncertain matches.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
