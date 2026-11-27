import React from 'react';
import {
  LayoutDashboard,
  ScanSearch,
  Columns2,
  ClipboardCheck,
  ShieldCheck,
  X,
  Lock,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview & Quick Scan',
  },
  {
    id: 'scan',
    label: 'Scan Data',
    icon: ScanSearch,
    description: 'Input & Detections',
  },
  {
    id: 'studio',
    label: 'Redaction Studio',
    icon: Columns2,
    description: 'Side-by-Side Diff',
  },
  {
    id: 'audit',
    label: 'Audit Report',
    icon: ClipboardCheck,
    description: 'Risk & Event Log',
  },
  {
    id: 'settings',
    label: 'Privacy & Info',
    icon: ShieldCheck,
    description: 'Local Verification',
  },
];

export default function Sidebar({
  activeView,
  onSelectView,
  summary,
  hasScan,
  mobileOpen,
  onCloseMobile,
}) {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#FFFFFF] border-r border-[#E5EAE4] w-64 select-none">
      <div>
        {/* Brand Logo / Wordmark */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAE4]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2EA] border border-[#C7DDCB]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                className="h-5.5 w-5.5"
                aria-hidden="true"
              >
                <path
                  d="M16 3.5L5.5 8.2v7.2c0 6.7 4.4 12.6 10.5 14.1 6.1-1.5 10.5-7.4 10.5-14.1V8.2L16 3.5z"
                  fill="#DCE9DE"
                  stroke="#789B81"
                  strokeWidth="2"
                />
                <path
                  d="M11.8 16.3l2.8 2.8 5.8-6"
                  fill="none"
                  stroke="#303A33"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-[#303A33]">SENVY</span>
                <span className="rounded bg-[#EAF2EA] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#303A33] border border-[#C7DDCB]">
                  Local
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#6B746B] leading-tight">
                Sensitive Data Protection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden rounded-lg p-1.5 text-[#858D85] hover:bg-[#EAF2EA] hover:text-[#303A33]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const showBadge =
              (item.id === 'scan' || item.id === 'studio') && hasScan && summary.totalDetected > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile?.();
                }}
                className={`group w-full flex items-center justify-between rounded-lg px-3.5 py-2.5 text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EAF2EA] text-[#303A33] border border-[#C7DDCB]'
                    : 'text-[#5E675E] border border-transparent hover:bg-[#F8F9F6] hover:text-[#303A33]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                      isActive ? 'text-[#668A70]' : 'text-[#858D85] group-hover:text-[#303A33]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-[11px] text-[#858D85] truncate">{item.description}</div>
                  </div>
                </div>
                {showBadge && (
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      isActive
                        ? 'bg-[#DCE9DE] text-[#303A33]'
                        : 'bg-[#F8F9F6] text-[#5E675E] border border-[#E5EAE4]'
                    }`}
                  >
                    {summary.totalDetected}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Privacy & Tagline Card */}
      <div className="p-4 space-y-3 border-t border-[#E5EAE4]">
        <div className="rounded-lg bg-[#EAF2EA] border border-[#C7DDCB] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#303A33]">
            <span className="h-2 w-2 rounded-full bg-[#789B81] animate-status-dot" />
            <span>Client-Side Only</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#545E55]">
            Zero external APIs. Documents stay strictly in browser memory and are never transmitted.
          </p>
        </div>

        <div className="flex items-center gap-2 px-1 text-[11px] text-[#6B746B]">
          <Lock className="h-3.5 w-3.5 text-[#789B81] shrink-0" />
          <span className="italic">Detect it. Protect it. Share it safely.</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block shrink-0">{navContent}</aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#303A33]/25 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}
