import React from 'react';
import { ShieldAlert, Layers, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { REDACTION_MODE_META } from '../constants/categories.js';

export default function DashboardCards({ summary, redactionMode, hasScan }) {
  const modeMeta = REDACTION_MODE_META[redactionMode] || REDACTION_MODE_META.full;

  const cards = [
    {
      label: 'Total Entities Detected',
      value: hasScan ? summary.totalDetected : '—',
      subtext: hasScan
        ? `${summary.uniqueEntities} unique entity value${summary.uniqueEntities === 1 ? '' : 's'}`
        : 'Awaiting local scan',
      icon: ShieldAlert,
      accent: summary.totalDetected > 0 ? 'text-[#96693E]' : 'text-[#858D85]',
      iconBg:
        summary.totalDetected > 0
          ? 'bg-[#FAEFE4] border-[#EDD8C3]'
          : 'bg-[#F8F9F6] border-[#E5EAE4]',
    },
    {
      label: 'PII Categories Found',
      value: hasScan ? `${summary.categoriesDetectedCount} / 6` : '—',
      subtext: hasScan
        ? summary.needsReviewCount > 0
          ? `${summary.needsReviewCount} flagged for manual review`
          : 'All detections categorized'
        : 'Email, Phone, PAN, Aadhaar, Card, IP',
      icon: Layers,
      accent: 'text-[#4D749D]',
      iconBg: 'bg-[#E8F1FA] border-[#CFE0F2]',
    },
    {
      label: 'Entities Sanitized',
      value: hasScan ? summary.sanitizedCount : '—',
      subtext: hasScan
        ? summary.excludedByCategoryCount + summary.dismissedCount > 0
          ? `${summary.excludedByCategoryCount + summary.dismissedCount} excluded from masking`
          : '100% of detected items masked'
        : 'Ready to redact locally',
      icon: ShieldCheck,
      accent: 'text-[#668A70]',
      iconBg: 'bg-[#EAF2EA] border-[#C7DDCB]',
    },
    {
      label: 'Current Redaction Mode',
      value: modeMeta.shortLabel,
      subtext: modeMeta.example,
      icon: SlidersHorizontal,
      accent: 'text-[#4B7A6A]',
      iconBg: 'bg-[#E6F1ED] border-[#CBE0D9]',
      isTextValue: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-[#E5EAE4] bg-white p-4 shadow-[0_1px_2px_rgba(48,58,51,0.03)] transition-colors hover:border-[#C7DDCB]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#6B746B]">{card.label}</p>
                <div
                  className={`mt-1.5 font-semibold tracking-tight text-[#303A33] tabular-nums ${
                    card.isTextValue ? 'text-lg truncate' : 'text-2xl'
                  }`}
                >
                  {card.value}
                </div>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${card.iconBg}`}
              >
                <Icon className={`h-4.5 w-4.5 ${card.accent}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-[#858D85] truncate font-mono">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
