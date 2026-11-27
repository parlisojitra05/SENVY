import React from 'react';
import { ShieldCheck, BookOpen, AlertTriangle, KeyRound, CreditCard } from 'lucide-react';
import PrivacyPanel from './PrivacyPanel.jsx';

export default function AboutSettingsPanel({ hasActiveDocument }) {
  return (
    <div className="space-y-5">
      <PrivacyPanel compact={false} hasActiveDocument={hasActiveDocument} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Masking & Pseudonymization Explanation */}
        <section className="rounded-xl border border-[#E5EAE4] bg-white p-5 space-y-3 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4.5 w-4.5 text-[#668A70]" />
            <h3 className="text-sm font-semibold text-[#303A33]">
              How Redaction & Pseudonymization Work
            </h3>
          </div>
          <div className="space-y-2.5 text-xs text-[#545E55] leading-relaxed">
            <p>
              <strong className="text-[#303A33]">Full Mask:</strong> Replaces every matched value in
              enabled categories with{' '}
              <code className="rounded bg-[#EAF2EA] border border-[#C7DDCB] px-1 py-0.5 text-[#303A33]">
                [REDACTED]
              </code>
              .
            </p>
            <p>
              <strong className="text-[#303A33]">Partial Mask:</strong> Preserves minimal
              non-sensitive verification cues (e.g. last 4 digits of phones/cards/Aadhaar, first
              character of email local/domain, or final octet of IPv4).
            </p>
            <p>
              <strong className="text-[#303A33]">Consistent Pseudonymization:</strong> Normalizes
              canonical entities (such as lowercased emails or digits-only phone/card/Aadhaar
              values) and assigns deterministic sequential tokens (e.g.{' '}
              <code className="rounded bg-[#EAF2EA] border border-[#C7DDCB] px-1 py-0.5 text-[#303A33]">
                EMAIL_01
              </code>
              ,{' '}
              <code className="rounded bg-[#EAF2EA] border border-[#C7DDCB] px-1 py-0.5 text-[#303A33]">
                PHONE_01
              </code>
              ) so repeated references stay correlated across rows and paragraphs without exposing
              original values.
            </p>
          </div>
        </section>

        {/* Validation, Confidence & Honest Limitations */}
        <section className="rounded-xl border border-[#E5EAE4] bg-white p-5 space-y-3 shadow-[0_1px_2px_rgba(48,58,51,0.03)]">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-[#4D749D]" />
            <h3 className="text-sm font-semibold text-[#303A33]">
              Validation Scope & Honest Limitations
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-[#545E55] leading-relaxed">
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[#877B33] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#303A33]">No 100% Accuracy Claim:</strong> Pattern +
                heuristic detection cannot catch every unstructured or obfuscated identifier. Always
                use the manual review panel before sharing sensitive documents.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#668A70] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#303A33]">Luhn Checksum Scope:</strong> Payment card
                candidates must pass the Luhn check-digit algorithm, eliminating random 13–19 digit
                strings. Passing Luhn verifies checksum structure only — it never proves a card is
                real or active.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 text-[#4D749D] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#303A33]">Aadhaar Context & Review:</strong> 12-digit
                sequences near order/invoice/tracking terms are skipped unless explicitly labeled as
                Aadhaar. Unlabeled 12-digit matches are flagged as <em>Needs Review</em> for human
                triage.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
