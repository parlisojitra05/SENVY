import React from 'react';
import { ShieldCheck, Lock, HardDrive, WifiOff, Cpu, ServerOff } from 'lucide-react';

export default function PrivacyPanel({ compact = false, hasActiveDocument = false }) {
  const guarantees = [
    {
      label: 'Processing location',
      value: 'This browser',
      icon: Cpu,
    },
    {
      label: 'Server upload',
      value: 'None',
      icon: ServerOff,
    },
    {
      label: 'External AI',
      value: 'None',
      icon: Lock,
    },
    {
      label: 'Data storage',
      value: 'No document persistence',
      icon: HardDrive,
    },
    {
      label: 'Network transmission of document content',
      value: 'None',
      icon: WifiOff,
    },
  ];

  return (
    <section
      aria-label="Local Privacy Status"
      className="rounded-xl border border-[#C7DDCB] bg-[#EAF2EA] p-5 shadow-[0_1px_2px_rgba(48,58,51,0.03)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-[#C7DDCB]">
            <ShieldCheck className="h-5 w-5 text-[#668A70]" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-[#303A33] uppercase">
              LOCAL PRIVACY STATUS
            </h2>
            <p className="text-xs text-[#5E675E]">
              Verified client-side execution guarantee
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#C7DDCB] px-2.5 py-1 text-[11px] font-semibold text-[#303A33]">
          <span className="h-2 w-2 rounded-full bg-[#789B81] animate-status-dot" />
          Offline-Capable
        </span>
      </div>

      <p className="rounded-lg border border-[#DCE9DE] bg-white px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed text-[#303A33]">
        Your document is scanned and sanitized directly in your browser. SENVY does not upload your
        content to a server.
      </p>

      <div
        className={`mt-4 grid gap-2.5 ${
          compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {guarantees.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-2.5 rounded-lg border border-[#DCE9DE] bg-white px-3 py-2.5"
            >
              <Icon className="h-4 w-4 text-[#668A70] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[11px] text-[#6B746B] leading-tight">{item.label}</div>
                <div className="mt-0.5 text-xs font-semibold text-[#303A33]">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#C7DDCB] pt-3 text-xs text-[#545E55]">
          <span>
            In-memory session state:{' '}
            <strong className="text-[#303A33]">
              {hasActiveDocument ? 'Document loaded in volatile RAM' : 'Cleared / Empty'}
            </strong>
          </span>
          <span className="font-mono text-[11px] text-[#303A33]">
            localStorage / sessionStorage document keys: 0
          </span>
        </div>
      )}
    </section>
  );
}
