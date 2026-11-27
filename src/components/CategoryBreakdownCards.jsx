import React from 'react';
import { CATEGORY_META, PII_CATEGORY_ORDER } from '../constants/categories.js';

export default function CategoryBreakdownCards({ summary, enabledCategories, hasScan }) {
  return (
    <div className="rounded-xl border border-[#E5EAE4] bg-white p-4 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B746B]">
          Detection Summary by Category
        </h2>
        <span className="text-xs text-[#6B746B]">
          Total PII Detected:{' '}
          <strong className="text-[#303A33] tabular-nums">
            {hasScan ? summary.totalDetected : 0}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {PII_CATEGORY_ORDER.map((type) => {
          const meta = CATEGORY_META[type];
          const count = hasScan ? summary.byCategory[type] || 0 : 0;
          const unique = hasScan ? summary.uniqueCountsByCategory[type] || 0 : 0;
          const isEnabled = enabledCategories[type] !== false;

          return (
            <div
              key={type}
              className={`rounded-lg border px-3 py-2.5 transition-colors ${
                !isEnabled
                  ? 'border-[#E5EAE4] bg-[#F8F9F6] opacity-65'
                  : count > 0
                  ? `${meta.badgeClass}`
                  : 'border-[#E5EAE4] bg-[#F8F9F6]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dotClass}`} />
                  <span className="text-xs font-medium text-[#303A33] truncate">
                    {meta.shortLabel}
                  </span>
                </div>
                {!isEnabled && (
                  <span className="rounded bg-white border border-[#E5EAE4] px-1 py-0.5 text-[9px] font-semibold uppercase text-[#6B746B]">
                    Off
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl font-semibold text-[#303A33] tabular-nums">{count}</span>
                {hasScan && count > 0 && (
                  <span className="text-[11px] text-[#6B746B] tabular-nums">{unique} uniq</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
