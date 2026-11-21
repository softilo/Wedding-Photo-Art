'use client';

import React, { useState, useTransition } from 'react';
import { EventType, PublicBranding, StudioPackage } from '@/types/event-management';
import { submitPublicInquiry } from '@/service/inquiries/inquiries.service';
import { formatPoisha } from '@/lib/utils';
import { ArrowRightIcon, CalendarIcon, CheckCircleIcon } from '@/components/shared/Icons';

interface InquiryFormProps {
  branding: PublicBranding;
  eventTypes: EventType[];
  packages: StudioPackage[];
  selectedPackageId?: string;
  onPackageChange?: (id: string) => void;
  eventTitle?: string;
  onEventTitleChange?: (val: string) => void;
  notes?: string;
  onNotesChange?: (val: string) => void;
}

export function InquiryForm({
  branding,
  eventTypes,
  packages,
  selectedPackageId,
  onPackageChange,
  eventTitle: controlledEventTitle,
  onEventTitleChange,
  notes: controlledNotes,
  onNotesChange,
}: InquiryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [localPackageId, setLocalPackageId] = useState(selectedPackageId || '');
  const [eventTypeId, setEventTypeId] = useState('');
  const packageId = selectedPackageId !== undefined ? selectedPackageId : localPackageId;
  const setPackageId = (val: string) => {
    setLocalPackageId(val);
    onPackageChange?.(val);
    const matchedPkg = packages.find((p) => p.id === val);
    if (matchedPkg?.eventTypeId) {
      setEventTypeId(matchedPkg.eventTypeId);
    }
  };

  const [localEventTitle, setLocalEventTitle] = useState('');
  const eventTitle =
    controlledEventTitle !== undefined ? controlledEventTitle : localEventTitle;
  const setEventTitle = (val: string) => {
    setLocalEventTitle(val);
    onEventTitleChange?.(val);
  };

  const [localNotes, setLocalNotes] = useState('');
  const notes = controlledNotes !== undefined ? controlledNotes : localNotes;
  const setNotes = (val: string) => {
    setLocalNotes(val);
    onNotesChange?.(val);
  };

  const [requestedDate, setRequestedDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    requestedDate: string | null;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const accent = branding.themeTokens.accentColor || '#8B6A21';
  const selectedPkg = packages.find((p) => p.id === packageId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = eventTitle.trim();
    const trimmedName = clientName.trim();
    const trimmedPhone = clientPhone.trim();
    if (!trimmedTitle || !trimmedName || !trimmedPhone) {
      setError('Please enter event title, your name, and phone number.');
      return;
    }

    startTransition(async () => {
      const resolvedEventTypeId = eventTypeId || selectedPkg?.eventTypeId || undefined;
      const res = await submitPublicInquiry({
        eventTypeId: resolvedEventTypeId,
        packageId: packageId || undefined,
        eventTitle: trimmedTitle,
        requestedDate: requestedDate || undefined,
        clientName: trimmedName,
        clientPhone: trimmedPhone,
        clientEmail: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.ok || !res.data) {
        setError(res.message || 'Unable to submit inquiry right now.');
        return;
      }

      setConfirmation({
        reference: res.data.reference,
        requestedDate: res.data.requestedDate,
      });
      setEventTitle('');
      setNotes('');
    });
  };

  const handleCopyRef = async (refCode: string) => {
    try {
      await navigator.clipboard.writeText(refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  if (confirmation) {
    return (
      <div className="atelier-card p-8 sm:p-10 text-center space-y-4 bg-white shadow-[0_24px_60px_-24px_rgba(24,22,17,0.12)]">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          <CheckCircleIcon className="w-6 h-6" />
        </div>
        <h3 className="font-editorial text-3xl font-semibold text-[#181611]">
          Booking Request Received
        </h3>
        <p className="text-sm text-[#4A4438] max-w-md mx-auto leading-relaxed">
          Thank you. Our {branding.displayName} coordinator has logged your shoot inquiry and will
          follow up shortly with date availability and an itemized quote.
        </p>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] px-4 py-2">
          <span className="text-xs text-[#6B6352]">Reference:</span>
          <span className="font-mono-code text-sm font-semibold text-[#181611]">
            {confirmation.reference}
          </span>
          <button
            type="button"
            onClick={() => handleCopyRef(confirmation.reference)}
            className="ml-1 rounded-md bg-white px-2.5 py-0.5 text-xs font-semibold border border-[#D8CCB2] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
            style={{ color: accent }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-[#6B6352] max-w-md mx-auto">
          Submitting an inquiry starts availability verification with zero obligation; shoot dates
          are locked once you approve your quote and confirm the booking deposit.
        </p>
        <div>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="mt-2 text-sm font-semibold underline underline-offset-4 cursor-pointer"
            style={{ color: accent }}
          >
            Submit another inquiry
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-[#D8CCB2] bg-[#F9F8F5] px-3.5 py-2.5 text-sm text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21] focus:bg-white focus:ring-2 focus:ring-[#CAA650]/25 transition-all';

  return (
    <form
      onSubmit={handleSubmit}
      className="atelier-card p-6 sm:p-8 space-y-5 bg-white shadow-[0_24px_60px_-24px_rgba(24,22,17,0.12)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#ECE6D8] pb-4">
        <div>
          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            Step 05 • Free Date Check &amp; Quote
          </p>
          <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#181611] mt-0.5">
            Reserve Your Shoot &amp; Quote
          </h3>
          <p className="text-sm text-[#4A4438] mt-1">
            No payment required to inquire—share your date and venue for a tailored proposal.
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F3E6] text-[#7A5E21] border border-[#DFCEAA] shrink-0">
          <CalendarIcon className="w-4 h-4" />
        </span>
      </div>

      {selectedPkg && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] px-4 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-[#181611]">
            <span className="font-semibold">Selected Collection:</span>
            <span>{selectedPkg.name}</span>
            <span className="font-mono-code font-semibold text-[#8B6A21]">
              ({formatPoisha(selectedPkg.basePricePoisha, branding.currency)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPackageId('')}
            className="font-semibold text-[#6F5319] hover:text-[#181611] cursor-pointer shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#B8933C] bg-[#F8F3E6] px-4 py-3 text-sm font-medium text-[#5C4414]">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Celebration / Shoot Title *
          </label>
          <input
            type="text"
            required
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Nusrat & Tanvir — Wedding & Holud"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Event Specialty
          </label>
          <select
            value={eventTypeId || selectedPkg?.eventTypeId || ''}
            onChange={(e) => setEventTypeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select event category</option>
            {eventTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Preferred Event Date
          </label>
          <input
            type="date"
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Collection / Package
          </label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className={inputClass}
          >
            <option value="">Custom Photography &amp; Cinema Quote</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} ({formatPoisha(pkg.basePricePoisha, branding.currency)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Bride, Groom, or Family Contact"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Phone / WhatsApp *
          </label>
          <input
            type="tel"
            required
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="01855-XXXXXX"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
            Venue, Schedule &amp; Shoot Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share your venue in Feni or destination, indoor/outdoor shoot preferences, or multi-day Holud + Wedding + Reception schedule..."
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        style={{ backgroundColor: accent }}
      >
        <span>{isPending ? 'Sending Request...' : 'Check Date & Request Free Quote'}</span>
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </form>
  );
}
