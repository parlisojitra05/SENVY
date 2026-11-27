import React from 'react';
import { Menu, ShieldCheck, Cpu, RotateCcw, Sparkles } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: {
    title: 'Security & Sanitization Dashboard',
    subtitle: 'Detect it. Protect it. Share it safely. — Client-side PII sanitization workspace.',
  },
  scan: {
    title: 'Scan Data & Detections',
    subtitle: 'Paste text or load .txt / .csv files for instant local classification and review.',
  },
  studio: {
    title: 'Redaction Studio',
    subtitle: 'Live side-by-side Original vs. Sanitized comparison with real-time masking modes.',
  },
  audit: {
    title: 'Privacy & Risk Audit Report',
    subtitle: 'Transparent exposure heuristics, category metrics, and PII-free session event log.',
  },
  settings: {
    title: 'Local Privacy Verification & Engine Guide',
    subtitle: 'Architecture verification, masking rules, validation limits, and privacy guarantees.',
  },
};

export default function Header({
  activeView,
  onOpenMobileMenu,
  onLoadSampleText,
  onRequestReset,
  onOpenPrivacyView,
  hasData,
  scanStatus,
}) {
  const pageMeta = PAGE_TITLES[activeView] || PAGE_TITLES.dashboard;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5EAE4] bg-[#FFFFFF]/92 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden rounded-lg border border-[#E5EAE4] bg-white p-2 text-[#303A33] hover:bg-[#EAF2EA]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#303A33] truncate">
              {pageMeta.title}
            </h1>
            <p className="text-xs text-[#6B746B] truncate">{pageMeta.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Local Processing Status */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E5EAE4] bg-[#F8F9F6] px-3 py-1.5 text-xs font-medium text-[#303A33]"
            title="All detection and masking runs in local JavaScript memory"
          >
            <Cpu className="h-3.5 w-3.5 text-[#789B81]" />
            <span>Local Processing: Active</span>
            {scanStatus === 'scanning' && (
              <span className="ml-1 text-[#668A70] font-semibold">· Scanning…</span>
            )}
          </div>

          {/* Privacy Status Badge */}
          <button
            type="button"
            onClick={onOpenPrivacyView}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#C7DDCB] bg-[#EAF2EA] px-3 py-1.5 text-xs font-semibold text-[#303A33] hover:bg-[#DCE9DE] transition-colors"
            title="Click to inspect SENVY Local Privacy Verification"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#668A70]" />
            <span>0 Server Uploads</span>
          </button>

          {/* Quick Demo Loader */}
          <button
            type="button"
            onClick={onLoadSampleText}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#789B81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#668A70] transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Load Sample</span>
          </button>

          {/* Reset / New Scan */}
          <button
            type="button"
            onClick={onRequestReset}
            disabled={!hasData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAE4] bg-white px-3 py-1.5 text-xs font-medium text-[#303A33] hover:bg-[#F8F9F6] disabled:opacity-45 disabled:pointer-events-none transition-colors"
            title="Reset workspace, mappings, and session audit log"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#6B746B]" />
            <span>New Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
}
