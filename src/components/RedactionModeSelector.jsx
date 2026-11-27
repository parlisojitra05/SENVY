import React from 'react';
import { HelpCircle, Shield, EyeOff, KeyRound } from 'lucide-react';
import { REDACTION_MODES, REDACTION_MODE_META } from '../constants/categories.js';

const MODE_ICONS = {
  [REDACTION_MODES.FULL]: Shield,
  [REDACTION_MODES.PARTIAL]: EyeOff,
  [REDACTION_MODES.PSEUDONYM]: KeyRound,
};

export default function RedactionModeSelector({ mode, onChangeMode }) {
  const modes = [
    REDACTION_MODE_META[REDACTION_MODES.FULL],
    REDACTION_MODE_META[REDACTION_MODES.PARTIAL],
    REDACTION_MODE_META[REDACTION_MODES.PSEUDONYM],
  ];

  return (
    <section
      aria-label="Redaction Mode Selector"
      className="rounded-xl border border-[#E5EAE4] bg-white p-4 shadow-[0_1px_2px_rgba(48,58,51,0.03)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#303A33]">Redaction Mode</h3>
          <p className="text-xs text-[#6B746B]">
            Switch masking strategy instantly — original text remains untouched in memory.
          </p>
        </div>

        <span
          className="inline-flex items-center gap-1 text-[11px] text-[#6B746B]"
          title="Pseudonymization assigns deterministic IDs per unique canonical value so repeated occurrences stay consistent (e.g. EMAIL_01)."
        >
          <HelpCircle className="h-3.5 w-3.5 text-[#668A70]" />
          <span>Repeated values stay consistent in Pseudonym mode</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {modes.map((item) => {
          const Icon = MODE_ICONS[item.id] || Shield;
          const isSelected = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeMode(item.id)}
              title={item.tooltip}
              aria-pressed={isSelected}
              className={`group text-left rounded-lg border p-3.5 transition-all ${
                isSelected
                  ? 'border-[#789B81] bg-[#EAF2EA]'
                  : 'border-[#E5EAE4] bg-[#F8F9F6] hover:border-[#C7DDCB] hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      isSelected ? 'text-[#668A70]' : 'text-[#858D85] group-hover:text-[#303A33]'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-semibold text-[#303A33]">
                    {item.label}
                  </span>
                </div>

                <span
                  className={`h-2.5 w-2.5 rounded-full border ${
                    isSelected
                      ? 'border-[#668A70] bg-[#789B81]'
                      : 'border-[#C7DDCB] bg-white'
                  }`}
                />
              </div>

              <div className="mt-2 rounded-md bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#303A33] border border-[#E5EAE4] truncate">
                {item.example}
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-[#5E675E]">{item.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
