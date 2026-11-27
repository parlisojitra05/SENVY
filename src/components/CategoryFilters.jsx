import React from 'react';
import { CheckSquare, Square, Filter } from 'lucide-react';
import { CATEGORY_META, PII_CATEGORY_ORDER } from '../constants/categories.js';

export default function CategoryFilters({
  enabledCategories,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
  summary,
  hasScan,
}) {
  const selectedCount = PII_CATEGORY_ORDER.filter(
    (type) => enabledCategories[type] !== false
  ).length;

  return (
    <section
      aria-label="Category Sanitization Filters"
      className="rounded-xl border border-[#E5EAE4] bg-white p-4 shadow-[0_1px_2px_rgba(48,58,51,0.03)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#668A70]" />
          <h3 className="text-sm font-semibold text-[#303A33]">PII Category Filters</h3>
          <span className="rounded-full bg-[#EAF2EA] border border-[#C7DDCB] px-2.5 py-0.5 text-[11px] font-semibold text-[#303A33] tabular-nums">
            {selectedCount} / {PII_CATEGORY_ORDER.length} active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-2.5 py-1 text-[11px] font-medium text-[#303A33] hover:bg-[#EAF2EA] transition-colors"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="rounded-lg border border-[#E5EAE4] bg-[#F8F9F6] px-2.5 py-1 text-[11px] font-medium text-[#303A33] hover:bg-[#EAF2EA] transition-colors"
          >
            Deselect all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PII_CATEGORY_ORDER.map((type) => {
          const meta = CATEGORY_META[type];
          const isEnabled = enabledCategories[type] !== false;
          const count = hasScan ? summary.byCategory[type] || 0 : 0;

          return (
            <label
              key={type}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-all select-none ${
                isEnabled
                  ? 'border-[#C7DDCB] bg-[#EAF2EA]/65 text-[#303A33]'
                  : 'border-[#E6DFB5] bg-[#F7F3D9]/75 text-[#6B746B]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggleCategory(type)}
                  className="sr-only"
                />
                {isEnabled ? (
                  <CheckSquare className="h-4 w-4 text-[#668A70] shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-[#858D85] shrink-0" />
                )}

                <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dotClass}`} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#303A33] truncate">{meta.label}</div>
                  {!isEnabled && (
                    <div className="text-[10px] font-medium text-[#877B33]">
                      Excluded · visible in output
                    </div>
                  )}
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  count > 0
                    ? isEnabled
                      ? `${meta.badgeClass}`
                      : 'bg-[#F7F3D9] border-[#E6DFB5] text-[#4E4720]'
                    : 'bg-white border-[#E5EAE4] text-[#858D85]'
                }`}
              >
                {count}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
