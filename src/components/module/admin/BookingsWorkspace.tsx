'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AcceptanceChannel,
  Assignment,
  AssignmentStatus,
  Booking,
  BookingLedgerSummary,
  Deliverable,
  DeliverableStatus,
  EventSession,
  EventType,
  Inquiry,
  PaymentEntry,
  PaymentMethod,
  PortfolioShowcaseEvent,
  Quote,
  Resource,
  ResourceType,
  StudioPackage,
  UserRole,
} from '@/types/event-management';
import { createPhoneInquiry } from '@/service/inquiries/inquiries.service';
import {
  acceptQuote,
  createQuote,
  createQuoteVersion,
  sendQuote,
} from '@/service/quotes/quotes.service';
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  getBooking,
  listBookings,
} from '@/service/bookings/bookings.service';
import {
  createPortfolioEventFromBooking,
  getPortfolioEventByBooking,
} from '@/service/catalog/catalog.service';
import {
  getBookingLedger,
  recordPayment,
  verifyPayment,
} from '@/service/payments/payments.service';
import {
  createAssignment,
  createDeliverable,
  deleteDeliverable,
  deliverDeliverable,
  syncBookingDeliverablesFromQuote,
  updateAssignment,
  updateDeliverable,
} from '@/service/operations/operations.service';
import {
  cancelSession,
  completeSession,
  createResource,
  createSession,
  rescheduleSession,
} from '@/service/schedule/schedule.service';
import { cn, formatDateTimeInTz, formatLocalDate, formatPoisha } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CalendarIcon, PlusIcon, ReceiptIcon, SearchIcon } from '@/components/shared/Icons';
import { BookingReceiptModal } from './BookingReceiptModal';
import { BookingQuickDrawer } from './BookingQuickDrawer';

interface StudioMemberOption {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

interface QuoteItemDraft {
  packageId?: string;
  serviceItemId?: string;
  description: string;
  quantity: string;
  unitPriceTk: string;
}

export type BookingsWorkspaceMode = 'inquiries' | 'quotes' | 'bookings' | 'detail';
export type BookingDetailSection = 'payments' | 'schedule' | 'deliverables' | 'tasks';

interface BookingsWorkspaceProps {
  mode?: BookingsWorkspaceMode;
  initialInquiries: Inquiry[];
  initialQuotes: Quote[];
  initialBookings: Booking[];
  packages: StudioPackage[];
  eventTypes: EventType[];
  initialResources: Resource[];
  members: StudioMemberOption[];
  currency: string;
  timezone: string;
  initialTab?: 'inquiries' | 'quotes' | 'bookings';
  initialSelectedBookingId?: string;
  initialSelectedBooking?: Booking | null;
  initialLedger?: {
    summary: BookingLedgerSummary;
    entries: PaymentEntry[];
  } | null;
  initialBookingPortfolio?: PortfolioShowcaseEvent | null;
  isDetailPage?: boolean;
  initialDetailSection?: BookingDetailSection;
  initialInquiryIdForQuote?: string;
  initialOpenCreateModal?: boolean;
  initialLoadError?: string;
}

function getDefaultSlotFromEventDate(eventDate?: string | null): { start: string; end: string } {
  const datePart = eventDate ? eventDate.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return { start: '', end: '' };
  }
  return { start: `${datePart}T10:00`, end: `${datePart}T18:00` };
}

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingsWorkspace({
  mode,
  initialInquiries,
  initialQuotes,
  initialBookings,
  packages,
  eventTypes,
  initialResources,
  members,
  currency,
  timezone,
  initialTab = 'bookings',
  initialSelectedBookingId,
  initialSelectedBooking = null,
  initialLedger = null,
  initialBookingPortfolio = null,
  isDetailPage = false,
  initialDetailSection = 'payments',
  initialInquiryIdForQuote,
  initialOpenCreateModal = false,
  initialLoadError,
}: BookingsWorkspaceProps) {
  const router = useRouter();

  const resolvedMode: BookingsWorkspaceMode =
    mode ?? (isDetailPage ? 'detail' : initialTab);

  const [detailSection, setDetailSection] =
    useState<BookingDetailSection>(initialDetailSection);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    resolvedMode === 'inquiries' ? 'NEW' : 'ALL',
  );

  const [showInquiryForm, setShowInquiryForm] = useState(
    resolvedMode === 'inquiries' && initialOpenCreateModal,
  );
  const [showQuoteForm, setShowQuoteForm] = useState(
    resolvedMode === 'quotes' && (initialOpenCreateModal || Boolean(initialInquiryIdForQuote)),
  );

  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [prevInitialInquiries, setPrevInitialInquiries] = useState<Inquiry[]>(initialInquiries);
  if (initialInquiries !== prevInitialInquiries) {
    setPrevInitialInquiries(initialInquiries);
    setInquiries(initialInquiries);
  }
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [prevInitialQuotes, setPrevInitialQuotes] = useState<Quote[]>(initialQuotes);
  if (initialQuotes !== prevInitialQuotes) {
    setPrevInitialQuotes(initialQuotes);
    setQuotes(initialQuotes);
  }
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [prevInitialBookings, setPrevInitialBookings] = useState<Booking[]>(initialBookings);
  if (initialBookings !== prevInitialBookings) {
    setPrevInitialBookings(initialBookings);
    setBookings(initialBookings);
  }
  const [quickDrawerBookingId, setQuickDrawerBookingId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(initialSelectedBooking);
  const [ledger, setLedger] = useState<{
    summary: BookingLedgerSummary;
    entries: PaymentEntry[];
  } | null>(initialLedger);
  const [bookingPortfolio, setBookingPortfolio] = useState<PortfolioShowcaseEvent | null>(
    initialBookingPortfolio,
  );
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    initialLoadError ? { type: 'err', text: initialLoadError } : null,
  );
  const [prevInitialLoadError, setPrevInitialLoadError] = useState<string | undefined>(
    initialLoadError,
  );
  if (initialLoadError !== prevInitialLoadError) {
    setPrevInitialLoadError(initialLoadError);
    if (initialLoadError) {
      setFeedback({ type: 'err', text: initialLoadError });
    }
  }
  const [isPending, startTransition] = useTransition();
  const [renderNowMs] = useState(() => Date.now());

  // Phone Inquiry Modal state
  const [inqTitle, setInqTitle] = useState('');
  const [inqEventTypeId, setInqEventTypeId] = useState('');
  const [inqPackageId, setInqPackageId] = useState('');
  const [inqDate, setInqDate] = useState('');
  const [inqClient, setInqClient] = useState('');
  const [inqPhone, setInqPhone] = useState('');
  const [inqEmail, setInqEmail] = useState('');
  const [inqNotes, setInqNotes] = useState('');
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const prefilledInquiry = initialInquiryIdForQuote
    ? initialInquiries.find((i) => i.id === initialInquiryIdForQuote)
    : undefined;
  const prefilledInquiryPkg = prefilledInquiry?.packageId
    ? packages.find((p) => p.id === prefilledInquiry.packageId)
    : undefined;
  const initialSlot = getDefaultSlotFromEventDate(initialSelectedBooking?.eventDate);

  // Quote Builder & Revision state
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteInquiryId, setQuoteInquiryId] = useState(prefilledInquiry?.id || '');
  const [quoteEventTypeId, setQuoteEventTypeId] = useState(
    prefilledInquiry?.eventTypeId || prefilledInquiryPkg?.eventTypeId || '',
  );
  const [quotePackageId, setQuotePackageId] = useState(prefilledInquiry?.packageId || '');
  const [quoteEventTitle, setQuoteEventTitle] = useState(prefilledInquiry?.eventTitle || '');
  const [quoteClientName, setQuoteClientName] = useState(prefilledInquiry?.clientName || '');
  const [quoteClientPhone, setQuoteClientPhone] = useState(prefilledInquiry?.clientPhone || '');
  const [quoteClientEmail, setQuoteClientEmail] = useState(prefilledInquiry?.clientEmail || '');
  const [quoteDate, setQuoteDate] = useState(
    prefilledInquiry?.requestedDate ? prefilledInquiry.requestedDate.slice(0, 10) : '',
  );
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [lastCreatedQuote, setLastCreatedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItemDraft[]>(() => {
    if (prefilledInquiryPkg) {
      if (prefilledInquiryPkg.items && prefilledInquiryPkg.items.length > 0) {
        return prefilledInquiryPkg.items.map((item) => ({
          packageId: prefilledInquiryPkg.id,
          serviceItemId: item.serviceItemId || undefined,
          description: item.description,
          quantity: String(item.quantity),
          unitPriceTk: String(Math.max(1, Math.round(item.unitPricePoisha / 100))),
        }));
      }
      return [
        {
          packageId: prefilledInquiryPkg.id,
          description: prefilledInquiryPkg.name,
          quantity: '1',
          unitPriceTk: String(
            prefilledInquiryPkg.basePricePoisha > 0
              ? Math.round(prefilledInquiryPkg.basePricePoisha / 100)
              : 50000,
          ),
        },
      ];
    }
    return [
      {
        description: prefilledInquiry?.eventTitle || '',
        quantity: '1',
        unitPriceTk: '50000',
      },
    ];
  });
  const [quoteDiscountTk, setQuoteDiscountTk] = useState('0');
  const [quoteTerms, setQuoteTerms] = useState(
    'Advance locks the event date & crew. Remaining balance due before final gallery/album delivery.',
  );
  const [acceptChannelMap, setAcceptChannelMap] = useState<Record<string, AcceptanceChannel>>({});

  const [prevInquiryIdForQuote, setPrevInquiryIdForQuote] = useState<string | undefined>(
    initialInquiryIdForQuote,
  );
  if (initialInquiryIdForQuote !== prevInquiryIdForQuote) {
    setPrevInquiryIdForQuote(initialInquiryIdForQuote);
    if (resolvedMode === 'quotes' && initialInquiryIdForQuote) {
      const targetInq = initialInquiries.find((i) => i.id === initialInquiryIdForQuote);
      if (targetInq) {
        const targetPkg = targetInq.packageId
          ? packages.find((p) => p.id === targetInq.packageId)
          : undefined;
        setEditingQuoteId(null);
        setQuoteError(null);
        setQuoteInquiryId(targetInq.id);
        setQuoteEventTypeId(targetInq.eventTypeId || targetPkg?.eventTypeId || '');
        setQuotePackageId(targetInq.packageId || '');
        setQuoteEventTitle(targetInq.eventTitle);
        setQuoteClientName(targetInq.clientName);
        setQuoteClientPhone(targetInq.clientPhone);
        setQuoteClientEmail(targetInq.clientEmail || '');
        setQuoteDate(targetInq.requestedDate ? targetInq.requestedDate.slice(0, 10) : '');
        if (targetPkg?.items && targetPkg.items.length > 0) {
          setQuoteItems(
            targetPkg.items.map((item) => ({
              packageId: targetPkg.id,
              serviceItemId: item.serviceItemId || undefined,
              description: item.description,
              quantity: String(item.quantity),
              unitPriceTk: String(Math.max(1, Math.round(item.unitPricePoisha / 100))),
            })),
          );
        } else if (targetPkg) {
          setQuoteItems([
            {
              packageId: targetPkg.id,
              description: targetPkg.name,
              quantity: '1',
              unitPriceTk: String(
                targetPkg.basePricePoisha > 0
                  ? Math.round(targetPkg.basePricePoisha / 100)
                  : 50000,
              ),
            },
          ]);
        } else {
          setQuoteItems([
            {
              description: targetInq.eventTitle || 'Full Event Coverage',
              quantity: '1',
              unitPriceTk: '50000',
            },
          ]);
        }
        setQuoteDiscountTk('0');
        setShowQuoteForm(true);
      }
    }
  }

  // Payment entry state
  const [payAmountTk, setPayAmountTk] = useState('10000');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BKASH');
  const [payRef, setPayRef] = useState('');
  const [payIdemKey, setPayIdemKey] = useState('');

  // Receipt modal + Cancel Booking state
  const [receiptBookingId, setReceiptBookingId] = useState<string | null>(null);
  const [showCancelBooking, setShowCancelBooking] = useState(false);
  const [bookingCancelReason, setBookingCancelReason] = useState('');

  // Integrated Schedule & Crew state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleOnConfirm, setScheduleOnConfirm] = useState(false);
  const [schedTitle, setSchedTitle] = useState(initialSelectedBooking?.eventTitle || '');
  const [schedStart, setSchedStart] = useState(initialSlot.start);
  const [schedEnd, setSchedEnd] = useState(initialSlot.end);
  const [schedLocation, setSchedLocation] = useState('');
  const [schedResourceIds, setSchedResourceIds] = useState<string[]>([]);

  // Inline quick resource creation
  const [showQuickResource, setShowQuickResource] = useState(false);
  const [newResName, setNewResName] = useState('');
  const [newResType, setNewResType] = useState<ResourceType>('CREW');
  const [newResUserId, setNewResUserId] = useState('');

  // Session reschedule / cancel state
  const [reschedSessionId, setReschedSessionId] = useState<string | null>(null);
  const [reschedStart, setReschedStart] = useState('');
  const [reschedEnd, setReschedEnd] = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [reschedResourceIds, setReschedResourceIds] = useState<string[]>([]);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Assignments state
  const [assignUserId, setAssignUserId] = useState(members[0]?.id || '');
  const [assignSessionId, setAssignSessionId] = useState('');
  const [assignRoleLabel, setAssignRoleLabel] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Deliverable state
  const [delivLabel, setDelivLabel] = useState('');
  const [delivDueDate, setDelivDueDate] = useState('');
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveryUrlInput, setDeliveryUrlInput] = useState('');

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

  const prefillScheduleDefaults = (booking: Booking) => {
    const slot = getDefaultSlotFromEventDate(booking.eventDate);
    setSchedTitle(booking.eventTitle);
    setSchedStart(slot.start);
    setSchedEnd(slot.end);
    setSchedLocation('');
    setSchedResourceIds([]);
    setScheduleOnConfirm(false);
    setShowScheduleForm(false);
    setReschedSessionId(null);
    setCancellingSessionId(null);
    setShowCancelBooking(false);
    setBookingCancelReason('');
  };

  const openBookingDetail = (bookingId: string, resetScheduleForm = true) => {
    startTransition(async () => {
      const [bRes, lRes, pRes] = await Promise.all([
        getBooking(bookingId),
        getBookingLedger(bookingId),
        getPortfolioEventByBooking(bookingId),
      ]);
      if (bRes.ok && bRes.data) {
        setSelectedBooking(bRes.data);
        setBookings((prev) =>
          prev.map((item) => (item.id === bRes.data!.id ? { ...item, ...bRes.data! } : item)),
        );
        if (resetScheduleForm) {
          prefillScheduleDefaults(bRes.data);
        }
      }
      if (lRes.ok && lRes.data) {
        setLedger(lRes.data);
      }
      if (pRes.ok && pRes.data) {
        setBookingPortfolio(pRes.data.event);
      }
    });
  };

  const applyPackagePresetToQuote = (pkgId: string, fallbackTitle?: string) => {
    setQuotePackageId(pkgId);
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    if (pkg.eventTypeId) {
      setQuoteEventTypeId(pkg.eventTypeId);
    }
    if (pkg.items && pkg.items.length > 0) {
      setQuoteItems(
        pkg.items.map((item) => ({
          packageId: pkg.id,
          serviceItemId: item.serviceItemId || undefined,
          description: item.description,
          quantity: String(item.quantity),
          unitPriceTk: String(Math.round(item.unitPricePoisha / 100)),
        })),
      );
    } else {
      setQuoteItems([
        {
          packageId: pkg.id,
          description: pkg.name || fallbackTitle || 'Package Coverage',
          quantity: '1',
          unitPriceTk: String(Math.round(pkg.basePricePoisha / 100)),
        },
      ]);
    }
  };

  useEffect(() => {
    if (initialSelectedBookingId && !initialSelectedBooking) {
      openBookingDetail(initialSelectedBookingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedBookingId]);

  const handleCreateInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError(null);
    const trimmedTitle = inqTitle.trim();
    const trimmedClient = inqClient.trim();
    const trimmedPhone = inqPhone.trim();
    if (!trimmedTitle || !trimmedClient || !trimmedPhone) {
      setInquiryError('Event title, client name, and client phone are required.');
      return;
    }

    startTransition(async () => {
      const matchedPkg = packages.find((p) => p.id === inqPackageId);
      const res = await createPhoneInquiry({
        eventTypeId: inqEventTypeId || matchedPkg?.eventTypeId || undefined,
        packageId: inqPackageId || undefined,
        eventTitle: trimmedTitle,
        requestedDate: inqDate || undefined,
        clientName: trimmedClient,
        clientPhone: trimmedPhone,
        clientEmail: inqEmail.trim() || undefined,
        notes: inqNotes.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        const msg = res.message || 'Failed to save inquiry. Check your connection and login session.';
        setInquiryError(msg);
        notify('err', msg);
        return;
      }
      setInquiries((prev) => [res.data!, ...prev]);
      setInqTitle('');
      setInqEventTypeId('');
      setInqPackageId('');
      setInqDate('');
      setInqClient('');
      setInqPhone('');
      setInqEmail('');
      setInqNotes('');
      setStatusFilter(resolvedMode === 'inquiries' ? 'NEW' : 'ALL');
      setSearchQuery('');
      setShowInquiryForm(false);
      notify('ok', `Saved inquiry ${res.data.reference}`);
      router.refresh();
    });
  };

  const openQuoteBuilder = (inq?: Inquiry) => {
    setEditingQuoteId(null);
    setQuoteError(null);
    setQuoteDiscountTk('0');
    if (inq) {
      const pkg = inq.packageId ? packages.find((p) => p.id === inq.packageId) : undefined;
      setQuoteInquiryId(inq.id);
      setQuoteEventTypeId(inq.eventTypeId || pkg?.eventTypeId || '');
      setQuotePackageId(inq.packageId || '');
      setQuoteEventTitle(inq.eventTitle);
      setQuoteClientName(inq.clientName);
      setQuoteClientPhone(inq.clientPhone);
      setQuoteClientEmail(inq.clientEmail || '');
      setQuoteDate(inq.requestedDate ? inq.requestedDate.slice(0, 10) : '');
      if (pkg?.items && pkg.items.length > 0) {
        setQuoteItems(
          pkg.items.map((item) => ({
            packageId: pkg.id,
            serviceItemId: item.serviceItemId || undefined,
            description: item.description,
            quantity: String(item.quantity),
            unitPriceTk: String(Math.max(1, Math.round(item.unitPricePoisha / 100))),
          })),
        );
      } else if (pkg) {
        setQuoteItems([
          {
            packageId: pkg.id,
            description: pkg.name,
            quantity: '1',
            unitPriceTk: String(
              pkg.basePricePoisha > 0 ? Math.round(pkg.basePricePoisha / 100) : 50000,
            ),
          },
        ]);
      } else {
        setQuoteItems([
          {
            description: inq.eventTitle || 'Full Event Coverage',
            quantity: '1',
            unitPriceTk: '50000',
          },
        ]);
      }
    } else {
      setQuoteInquiryId('');
      setQuoteEventTypeId('');
      setQuotePackageId('');
      setQuoteEventTitle('');
      setQuoteClientName('');
      setQuoteClientPhone('');
      setQuoteClientEmail('');
      setQuoteDate('');
      setQuoteItems([{ description: '', quantity: '1', unitPriceTk: '50000' }]);
    }
    setShowQuoteForm(true);
  };

  const startReviseQuote = (q: Quote) => {
    const latest = q.versions?.[0] || q.currentVersion;
    setQuoteError(null);
    setEditingQuoteId(q.id);
    setQuoteInquiryId(q.inquiryId || '');
    setQuoteEventTypeId(q.eventTypeId || '');
    setQuotePackageId('');
    setQuoteEventTitle(q.eventTitle);
    setQuoteClientName(q.clientName);
    setQuoteClientPhone(q.clientPhone);
    setQuoteClientEmail('');
    setQuoteDate(q.requestedDate ? q.requestedDate.slice(0, 10) : '');
    if (latest?.items && latest.items.length > 0) {
      setQuoteItems(
        latest.items.map((item) => ({
          packageId: item.packageId || undefined,
          serviceItemId: item.serviceItemId || undefined,
          description: item.description,
          quantity: String(item.quantity),
          unitPriceTk: String(Math.round(item.unitPricePoisha / 100)),
        })),
      );
    } else {
      setQuoteItems([
        {
          description: q.eventTitle,
          quantity: '1',
          unitPriceTk: latest ? String(Math.round(latest.totalPoisha / 100)) : '50000',
        },
      ]);
    }
    setQuoteDiscountTk(latest ? String(Math.round(latest.discountPoisha / 100)) : '0');
    if (latest?.terms) setQuoteTerms(latest.terms);
    setShowQuoteForm(true);
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError(null);

    if (!editingQuoteId) {
      if (!quoteEventTitle.trim() || !quoteClientName.trim() || !quoteClientPhone.trim()) {
        const msg = 'Event title, client name, and client phone are required.';
        setQuoteError(msg);
        notify('err', msg);
        return;
      }
    }

    const parsedItems = quoteItems
      .filter((item) => item.description.trim())
      .map((item) => ({
        packageId: item.packageId || undefined,
        serviceItemId: item.serviceItemId || undefined,
        description: item.description.trim(),
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        unitPricePoisha: Math.max(0, Math.round((Number(item.unitPriceTk) || 0) * 100)),
      }));

    if (parsedItems.length === 0) {
      const msg = 'Add at least one line item with a description.';
      setQuoteError(msg);
      notify('err', msg);
      return;
    }

    const subtotalPoisha = parsedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPricePoisha,
      0,
    );
    const discountPoisha = Math.max(0, Math.round((Number(quoteDiscountTk) || 0) * 100));

    if (subtotalPoisha <= 0) {
      const msg = 'Quote subtotal must be greater than Tk 0. Enter a valid price above 0.';
      setQuoteError(msg);
      notify('err', msg);
      return;
    }
    if (discountPoisha >= subtotalPoisha) {
      const msg = 'Discount cannot equal or exceed the quote subtotal.';
      setQuoteError(msg);
      notify('err', msg);
      return;
    }

    const cleanDate =
      quoteDate && /^\d{4}-\d{2}-\d{2}$/.test(quoteDate.trim()) ? quoteDate.trim() : undefined;
    const cleanEmail =
      quoteClientEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quoteClientEmail.trim())
        ? quoteClientEmail.trim()
        : undefined;

    startTransition(async () => {
      if (editingQuoteId) {
        const res = await createQuoteVersion(editingQuoteId, {
          items: parsedItems,
          discountPoisha,
          terms: quoteTerms.trim() || undefined,
        });
        if (!res.ok || !res.data) {
          const msg = res.message || 'Failed to revise quote. Please review your entries.';
          setQuoteError(msg);
          notify('err', msg);
          return;
        }
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === editingQuoteId
              ? {
                  ...q,
                  status: 'DRAFT',
                  currentVersionId: res.data!.id,
                  currentVersion: res.data!,
                  versions: [res.data!, ...(q.versions || [])],
                }
              : q,
          ),
        );
        setQuoteError(null);
        setEditingQuoteId(null);
        setShowQuoteForm(false);
        notify('ok', `Quote revised to v${res.data.versionNumber}`);
        router.refresh();
        return;
      }

      const res = await createQuote({
        inquiryId: quoteInquiryId || undefined,
        eventTypeId: quoteEventTypeId || undefined,
        eventTitle: quoteEventTitle.trim(),
        requestedDate: cleanDate,
        clientName: quoteClientName.trim(),
        clientPhone: quoteClientPhone.trim(),
        clientEmail: cleanEmail,
        items: parsedItems,
        discountPoisha,
        terms: quoteTerms.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        const msg = res.message || 'Failed to create quote. Check backend connection or inquiry status.';
        setQuoteError(msg);
        notify('err', msg);
        return;
      }
      const createdQuote = res.data;
      setQuotes((prev) => [createdQuote, ...prev]);
      if (quoteInquiryId) {
        setInquiries((prev) =>
          prev.map((i) => (i.id === quoteInquiryId ? { ...i, status: 'QUOTED' } : i)),
        );
      }
      setLastCreatedQuote(createdQuote);
      setQuoteError(null);
      setQuoteInquiryId('');
      setShowQuoteForm(false);
      notify('ok', `Created quote ${createdQuote.reference}`);
      router.refresh();
    });
  };

  const handleSendQuote = (q: Quote) => {
    startTransition(async () => {
      const res = await sendQuote(q.id);
      if (!res.ok) {
        notify('err', res.message || 'Failed to mark quote sent');
        return;
      }
      setQuotes(quotes.map((item) => (item.id === q.id ? { ...item, status: 'SENT' } : item)));
      notify('ok', `Quote ${q.reference} marked as SENT`);
    });
  };

  const handleAcceptQuote = (q: Quote) => {
    const channel = acceptChannelMap[q.id] || 'PHONE';
    startTransition(async () => {
      const res = await acceptQuote(q.id, {
        acceptedBy: q.clientName,
        acceptedChannel: channel,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to accept quote');
        return;
      }
      setQuotes(quotes.map((item) => (item.id === q.id ? { ...item, status: 'ACCEPTED' } : item)));
      router.push(`/admin/bookings/${res.data.booking.id}`);
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (selectedBooking.status === 'CANCELLED') {
      notify('err', `Cannot record a payment on cancelled booking ${selectedBooking.reference}.`);
      return;
    }
    const amountPoisha = Math.round(Number(payAmountTk) * 100);
    if (!Number.isFinite(amountPoisha) || amountPoisha <= 0) {
      notify('err', 'Please enter a valid payment amount greater than Tk 0.');
      return;
    }
    if (ledger) {
      const outstandingDuePoisha = ledger.summary.outstandingDuePoisha;
      const pendingReceiptsPoisha = ledger.summary.pendingReceiptsPoisha;
      const maxCollectiblePoisha = Math.max(0, outstandingDuePoisha - pendingReceiptsPoisha);

      if (outstandingDuePoisha <= 0) {
        notify(
          'err',
          `Booking ${selectedBooking.reference} is already fully paid (${formatPoisha(ledger.summary.effectiveAgreedChargePoisha, currency)}). No additional payment can be recorded.`,
        );
        return;
      }
      if (amountPoisha > outstandingDuePoisha) {
        notify(
          'err',
          `Payment of ${formatPoisha(amountPoisha, currency)} exceeds the remaining due balance of ${formatPoisha(outstandingDuePoisha, currency)} (Total price: ${formatPoisha(ledger.summary.effectiveAgreedChargePoisha, currency)}).`,
        );
        return;
      }
      if (amountPoisha > maxCollectiblePoisha) {
        notify(
          'err',
          `Payment of ${formatPoisha(amountPoisha, currency)} plus pending unverified receipts (${formatPoisha(pendingReceiptsPoisha, currency)}) exceeds the remaining due of ${formatPoisha(outstandingDuePoisha, currency)}. Verify or reject the pending payment first.`,
        );
        return;
      }
    }
    startTransition(async () => {
      const res = await recordPayment(selectedBooking.id, {
        amountPoisha,
        method: payMethod,
        transactionRef: payRef || undefined,
        idempotencyKey: payIdemKey || undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to record payment');
        return;
      }
      notify(
        'ok',
        res.data.idempotentReplay
          ? 'This payment was already recorded.'
          : 'Payment recorded. Click Verify to add it to the paid balance.',
      );
      setPayRef('');
      setPayIdemKey('');
      openBookingDetail(selectedBooking.id, false);
    });
  };

  const handleVerifyPayment = (paymentId: string, alsoConfirm = false) => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await verifyPayment(paymentId);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Verification failed (requires Owner or Accountant)');
        return;
      }
      if (
        alsoConfirm &&
        res.data.ledger.isAdvanceMet &&
        selectedBooking.status === 'PENDING_CONFIRMATION'
      ) {
        const confRes = await confirmBooking(selectedBooking.id, selectedBooking.version);
        if (confRes.ok && confRes.data) {
          const delCount = confRes.data.deliverables?.length ?? 0;
          const taskCount = confRes.data.assignments?.length ?? 0;
          openBookingDetail(selectedBooking.id, false);
          notify(
            'ok',
            `Payment verified & booking confirmed! Auto-created ${delCount} deliverables and ${taskCount} crew tasks.`,
          );
          return;
        }
      }
      notify(
        'ok',
        res.data.ledger.isAdvanceMet && selectedBooking.status === 'PENDING_CONFIRMATION'
          ? 'Payment verified! Advance threshold is now met — ready to confirm.'
          : 'Payment verified and applied to booking balance',
      );
      openBookingDetail(selectedBooking.id, false);
    });
  };

  const applyCeremonyPreset = (preset: 'HOLUD' | 'WEDDING' | 'WALIMA' | 'CORPORATE') => {
    if (!selectedBooking) return;
    const baseDate = selectedBooking.eventDate ? selectedBooking.eventDate.slice(0, 10) : '';
    const map = {
      HOLUD: { label: 'Gaye Holud Ceremony', start: '17:00', end: '23:00' },
      WEDDING: { label: 'Wedding / Biye Ceremony', start: '11:00', end: '23:00' },
      WALIMA: { label: 'Walima / Reception', start: '18:00', end: '23:00' },
      CORPORATE: { label: 'Corporate Event Coverage', start: '09:00', end: '17:00' },
    }[preset];
    setSchedTitle(`${selectedBooking.eventTitle} — ${map.label}`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
      setSchedStart(`${baseDate}T${map.start}`);
      setSchedEnd(`${baseDate}T${map.end}`);
    }
  };

  const handleConfirmBooking = () => {
    if (!selectedBooking) return;

    const existingSessionsCount = selectedBooking.sessions?.length ?? 0;
    const includeInitialSession = scheduleOnConfirm && existingSessionsCount === 0;
    if (includeInitialSession && (!schedTitle.trim() || !schedStart || !schedEnd)) {
      notify('err', 'Enter shoot title, start time, and end time to schedule on confirmation');
      return;
    }

    startTransition(async () => {
      const res = await confirmBooking(
        selectedBooking.id,
        selectedBooking.version,
        includeInitialSession
          ? [
              {
                title: schedTitle.trim(),
                startAt: new Date(schedStart).toISOString(),
                endAt: new Date(schedEnd).toISOString(),
                location: schedLocation.trim() || undefined,
                resourceIds: schedResourceIds,
                reason: 'Scheduled during booking confirmation',
              },
            ]
          : undefined,
      );
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Unable to confirm booking');
        return;
      }
      const delCount = res.data.deliverables?.length ?? 0;
      const taskCount = res.data.assignments?.length ?? 0;
      setBookings(
        bookings.map((b) => (b.id === selectedBooking.id ? res.data!.booking : b)),
      );
      openBookingDetail(selectedBooking.id);
      notify(
        'ok',
        `Booking ${selectedBooking.reference} confirmed${
          includeInitialSession ? ' + shoot scheduled' : ''
        } (auto-created ${delCount} deliverables & ${taskCount} tasks)`,
      );
    });
  };

  const handleCancelBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !bookingCancelReason.trim()) return;
    startTransition(async () => {
      const res = await cancelBooking(selectedBooking.id, bookingCancelReason.trim());
      if (!res.ok) {
        notify('err', res.message || 'Failed to cancel booking');
        return;
      }
      setShowCancelBooking(false);
      setBookingCancelReason('');
      openBookingDetail(selectedBooking.id);
      notify('ok', `Booking ${selectedBooking.reference} cancelled and reserved crew released`);
    });
  };

  const handleCreateBookingPortfolio = () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await createPortfolioEventFromBooking(selectedBooking.id);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Could not create digital portfolio for this booking.');
        return;
      }
      setBookingPortfolio(res.data.event);
      notify(
        'ok',
        res.data.created
          ? `Digital Portfolio created for "${res.data.event.title}". Opening album editor...`
          : `Digital Portfolio already exists for ${selectedBooking.reference}. Opening editor...`,
      );
      router.push(`/admin/portfolio?eventId=${encodeURIComponent(res.data.event.id)}`);
    });
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !assignUserId || !assignRoleLabel.trim()) return;
    startTransition(async () => {
      const res = await createAssignment(selectedBooking.id, {
        assigneeUserId: assignUserId,
        sessionId: assignSessionId || undefined,
        roleLabel: assignRoleLabel.trim(),
        notes: assignNotes.trim() || undefined,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to assign team member');
        return;
      }
      setAssignRoleLabel('');
      setAssignNotes('');
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Crew / production task assigned');
    });
  };

  const handleUpdateAssignmentStatus = (a: Assignment, status: AssignmentStatus) => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await updateAssignment(a.id, { status });
      if (!res.ok) {
        notify('err', res.message || 'Failed to update task');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
    });
  };

  const toggleSchedResource = (id: string) => {
    setSchedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleReschedResource = (id: string) => {
    setReschedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleQuickAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedMember = newResUserId ? members.find((m) => m.id === newResUserId) : undefined;
    const rawName = newResName.trim();
    const finalName = linkedMember
      ? rawName
        ? `${linkedMember.name} (${rawName})`
        : linkedMember.name
      : rawName;
    if (!finalName) return;

    startTransition(async () => {
      const res = await createResource({
        name: finalName,
        type: newResType,
        userId: newResType === 'CREW' && linkedMember ? linkedMember.id : undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to add crew/resource');
        return;
      }
      setResources((prev) => [...prev, res.data!]);
      setSchedResourceIds((prev) => [...prev, res.data!.id]);
      setNewResName('');
      setNewResUserId('');
      setShowQuickResource(false);
      notify('ok', `Added ${res.data.type}: ${res.data.name}`);
    });
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!schedTitle.trim() || !schedStart || !schedEnd) {
      notify('err', 'Enter shoot title, start time, and end time');
      return;
    }
    startTransition(async () => {
      const res = await createSession(selectedBooking.id, {
        title: schedTitle.trim(),
        startAt: new Date(schedStart).toISOString(),
        endAt: new Date(schedEnd).toISOString(),
        location: schedLocation.trim() || undefined,
        resourceIds: schedResourceIds,
      });
      if (!res.ok) {
        notify('err', res.message || 'Crew/resource conflict or invalid time slot');
        return;
      }
      setShowScheduleForm(false);
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Shoot session scheduled and crew reserved');
    });
  };

  const openReschedule = (s: EventSession) => {
    setReschedSessionId(s.id);
    setReschedStart(toLocalDateTimeInput(s.startAt));
    setReschedEnd(toLocalDateTimeInput(s.endAt));
    setReschedReason('');
    setReschedResourceIds(s.reservations?.map((r) => r.resourceId) || []);
    setCancellingSessionId(null);
  };

  const handleRescheduleSession = (e: React.FormEvent, sessionId: string) => {
    e.preventDefault();
    if (!selectedBooking || !reschedStart || !reschedEnd || !reschedReason.trim()) {
      notify('err', 'Provide new time range and a reschedule reason');
      return;
    }
    startTransition(async () => {
      const res = await rescheduleSession(sessionId, {
        startAt: new Date(reschedStart).toISOString(),
        endAt: new Date(reschedEnd).toISOString(),
        reason: reschedReason.trim(),
        resourceIds: reschedResourceIds,
      });
      if (!res.ok) {
        notify('err', res.message || 'Reschedule failed (check for resource conflict)');
        return;
      }
      setReschedSessionId(null);
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Session rescheduled');
    });
  };

  const handleCompleteSession = (sessionId: string) => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await completeSession(sessionId);
      if (!res.ok) {
        notify('err', res.message || 'Failed to mark session completed');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Shoot session marked completed');
    });
  };

  const handleCancelSession = (e: React.FormEvent, sessionId: string) => {
    e.preventDefault();
    if (!selectedBooking || !cancelReason.trim()) {
      notify('err', 'Please provide a cancellation reason');
      return;
    }
    startTransition(async () => {
      const res = await cancelSession(sessionId, cancelReason.trim());
      if (!res.ok) {
        notify('err', res.message || 'Failed to cancel session');
        return;
      }
      setCancellingSessionId(null);
      setCancelReason('');
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Session cancelled and reserved crew released');
    });
  };

  const handleCompleteBooking = () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await completeBooking(selectedBooking.id);
      if (!res.ok) {
        notify('err', res.message || 'Failed to mark booking completed');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Booking marked as completed.');
    });
  };

  const handleAddDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !delivLabel.trim()) return;
    startTransition(async () => {
      const res = await createDeliverable(selectedBooking.id, {
        label: delivLabel.trim(),
        dueAt: delivDueDate ? new Date(`${delivDueDate}T18:00:00+06:00`).toISOString() : undefined,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to add deliverable');
        return;
      }
      setDelivLabel('');
      setDelivDueDate('');
      openBookingDetail(selectedBooking.id, false);
      notify('ok', 'Deliverable added');
    });
  };

  const handleQuickAddDeliverable = (label: string) => {
    if (!selectedBooking || !label.trim()) return;
    startTransition(async () => {
      const baseMs = selectedBooking.eventDate
        ? new Date(selectedBooking.eventDate).getTime()
        : Date.now();
      const defaultDueIso = new Date(baseMs + 14 * 86_400_000).toISOString();
      const res = await createDeliverable(selectedBooking.id, {
        label: label.trim(),
        dueAt: delivDueDate
          ? new Date(`${delivDueDate}T18:00:00+06:00`).toISOString()
          : defaultDueIso,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to add deliverable');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
      notify('ok', `"${label.trim()}" added to deliverables.`);
    });
  };

  const handleSyncDeliverablesFromQuote = () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await syncBookingDeliverablesFromQuote(selectedBooking.id);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to sync deliverables from quote');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
      notify(
        'ok',
        res.data.createdCount > 0
          ? `Synced ${res.data.createdCount} deliverable${res.data.createdCount > 1 ? 's' : ''} from the quote.`
          : 'All quote items are already listed in deliverables.',
      );
    });
  };

  const handleUpdateDeliverableField = (
    d: Deliverable,
    patch: {
      assigneeUserId?: string | null;
      dueAt?: string | null;
      reviewStatus?: DeliverableStatus;
    },
  ) => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await updateDeliverable(d.id, patch);
      if (!res.ok) {
        notify('err', res.message || 'Failed to update deliverable');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
      notify('ok', `Updated "${d.label}".`);
    });
  };

  const handleDeleteDeliverable = (d: Deliverable) => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await deleteDeliverable(d.id);
      if (!res.ok) {
        notify('err', res.message || 'Failed to remove deliverable');
        return;
      }
      openBookingDetail(selectedBooking.id, false);
      notify('ok', `Removed "${d.label}".`);
    });
  };

  const handleDeliverItem = (d: Deliverable, url?: string) => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await deliverDeliverable(d.id, {
        deliveryUrl: url?.trim() || undefined,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to mark delivered');
        return;
      }
      setDeliveringId(null);
      setDeliveryUrlInput('');
      openBookingDetail(selectedBooking.id, false);
      notify('ok', `"${d.label}" marked as delivered.`);
    });
  };

  const q = searchQuery.trim().toLowerCase();
  const openInquiries = inquiries.filter(
    (i) => i.status !== 'CONVERTED' && i.status !== 'CLOSED',
  );
  const newInquiriesCount = inquiries.filter((i) => i.status === 'NEW').length;
  const quotedInquiriesCount = inquiries.filter((i) => i.status === 'QUOTED').length;
  const filteredInquiries = inquiries.filter(
    (i) =>
      (statusFilter === 'ALL'
        ? i.status !== 'CONVERTED' && i.status !== 'CLOSED'
        : i.status === statusFilter) &&
      (!q ||
        i.eventTitle.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q) ||
        i.reference.toLowerCase().includes(q)),
  );
  const openQuotes = quotes.filter(
    (item) => item.status !== 'ACCEPTED' && item.status !== 'SUPERSEDED',
  );
  const draftQuotesCount = quotes.filter((item) => item.status === 'DRAFT').length;
  const sentQuotesCount = quotes.filter((item) => item.status === 'SENT').length;
  const filteredQuotes = quotes.filter(
    (item) =>
      (statusFilter === 'ALL'
        ? item.status !== 'ACCEPTED' && item.status !== 'SUPERSEDED'
        : item.status === statusFilter) &&
      (!q ||
        item.eventTitle.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)),
  );
  const filteredBookings = bookings.filter(
    (b) =>
      (statusFilter === 'ALL' || b.status === statusFilter) &&
      (!q ||
        b.eventTitle.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q)),
  );

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm flex items-center justify-between',
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          MODE 1: DEDICATED INQUIRIES ROUTE (/admin/inquiries)
      ===================================================================== */}
      {resolvedMode === 'inquiries' && (
        <div className="space-y-3 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="hidden lg:block">
              <h1 className="admin-page-title">
                1. Client Inquiries
              </h1>
              <p className="admin-meta mt-1">
                Log phone/walk-in requests or review public storefront inquiries before sending a quote.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInquiryForm(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all duration-200 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Log Phone / Walk-In Inquiry</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client, event, or ref..."
                className="w-full h-9 sm:h-auto rounded-xl border border-border/60 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
              {(
                [
                  { id: 'NEW', label: `NEW (${newInquiriesCount})` },
                  { id: 'QUOTED', label: `QUOTED (${quotedInquiriesCount})` },
                  { id: 'ALL', label: `All Open (${openInquiries.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200 cursor-pointer',
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {lastCreatedQuote && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <span className="font-medium text-indigo-950">
                Quote <strong className="font-mono-code">{lastCreatedQuote.reference}</strong>{' '}
                created for <strong>{lastCreatedQuote.eventTitle}</strong>. Ready to send or accept
                as a booking!
              </span>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`/api/quotes/${encodeURIComponent(lastCreatedQuote.id)}/invoice.pdf`}
                  download
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  PDF Invoice ↓
                </a>
                <Link
                  href="/admin/quotes"
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Open in Price Quotes →
                </Link>
              </div>
            </div>
          )}

          <div className="sm:rounded-[0.875rem] sm:border sm:border-[var(--admin-border)] sm:bg-[var(--admin-surface)] sm:p-5">
            {filteredInquiries.length === 0 ? (
              <div className="atelier-card sm:border-0 sm:bg-transparent py-10 px-4 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">No matching inquiries</p>
                <p className="text-xs text-slate-500">
                  Click &ldquo;Log Phone / Walk-In Inquiry&rdquo; to add a new client request.
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-0 sm:divide-y sm:divide-[var(--admin-border)]">
                {filteredInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                  >
                    <div className="min-w-0 sm:flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-code text-xs font-medium text-slate-500 tabular-nums">
                          {inq.reference}
                        </span>
                        <StatusBadge status={inq.status} />
                      </div>
                      <p className="admin-row-title font-medium line-clamp-1">{inq.eventTitle}</p>
                      <p className="admin-meta line-clamp-1 tabular-nums">
                        {inq.clientName} ({inq.clientPhone}) • {formatLocalDate(inq.requestedDate)}
                      </p>
                      {inq.notes && (
                        <p className="admin-meta text-slate-400 line-clamp-1 max-w-2xl">
                          Notes: {inq.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0 pt-1 sm:pt-0">
                      {inq.status === 'CONVERTED' ? (
                        <Link
                          href="/admin/bookings"
                          className="w-full sm:w-auto text-center rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                        >
                          Converted • View Bookings →
                        </Link>
                      ) : inq.status === 'QUOTED' ? (
                        <>
                          <Link
                            href="/admin/quotes"
                            className="flex-1 sm:flex-initial text-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            View Quotes →
                          </Link>
                          <button
                            type="button"
                            onClick={() => openQuoteBuilder(inq)}
                            className="flex-1 sm:flex-initial text-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            + New Quote
                          </button>
                        </>
                      ) : inq.status === 'CLOSED' ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                          Closed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openQuoteBuilder(inq)}
                          className="w-full sm:w-auto text-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Create Quote →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log Inquiry Modal */}
          {showInquiryForm && (
            <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 sm:backdrop-blur-xs admin-sheet-fade">
              <div className="flex-1 sm:flex-initial w-full sm:max-w-xl h-dvh sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl border-0 sm:border sm:border-slate-200 bg-white p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto shadow-none sm:shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Log Phone / Walk-In Inquiry
                    </h2>
                    <p className="text-xs text-slate-500">
                      Generates an agency-unique reference without locking the date yet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInquiryForm(false)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateInquiry} className="space-y-3">
                  {inquiryError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                      {inquiryError}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Event Title *
                      </label>
                      <input
                        required
                        value={inqTitle}
                        onChange={(e) => setInqTitle(e.target.value)}
                        placeholder="e.g. Ayesha & Rafiq Wedding Reception"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Client Name *
                      </label>
                      <input
                        required
                        value={inqClient}
                        onChange={(e) => setInqClient(e.target.value)}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Client Phone *
                      </label>
                      <input
                        required
                        value={inqPhone}
                        onChange={(e) => setInqPhone(e.target.value)}
                        placeholder="+8801..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Client Email (optional)
                      </label>
                      <input
                        type="email"
                        value={inqEmail}
                        onChange={(e) => setInqEmail(e.target.value)}
                        placeholder="client@example.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Requested Date
                      </label>
                      <input
                        type="date"
                        value={inqDate}
                        onChange={(e) => setInqDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Event Category
                      </label>
                      <select
                        value={inqEventTypeId}
                        onChange={(e) => setInqEventTypeId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select category (optional)</option>
                        {eventTypes.map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Interested Package
                      </label>
                      <select
                        value={inqPackageId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setInqPackageId(nextId);
                          const pkg = packages.find((p) => p.id === nextId);
                          if (pkg?.eventTypeId && !inqEventTypeId) {
                            setInqEventTypeId(pkg.eventTypeId);
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="">Select package preset (optional)</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} ({formatPoisha(pkg.basePricePoisha, currency)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Venue &amp; Notes
                      </label>
                      <input
                        value={inqNotes}
                        onChange={(e) => setInqNotes(e.target.value)}
                        placeholder="Venue, ceremony count, or guest notes (optional)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInquiryForm(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isPending ? 'Saving...' : 'Save Inquiry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODE 2: DEDICATED QUOTES ROUTE (/admin/quotes)
      ===================================================================== */}
      {resolvedMode === 'quotes' && (
        <div className="space-y-3 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="hidden lg:block">
              <h1 className="admin-page-title">
                2. Price Quotes
              </h1>
              <p className="admin-meta mt-1">
                Build itemized proposals, revise versions, and accept a quote to create a booking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openQuoteBuilder()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all duration-200 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Price Quote</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quote reference, client, or event..."
                className="w-full h-9 sm:h-auto rounded-xl border border-border/60 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
              {(
                [
                  { id: 'ALL', label: `All Open (${openQuotes.length})` },
                  { id: 'DRAFT', label: `DRAFT (${draftQuotesCount})` },
                  { id: 'SENT', label: `SENT (${sentQuotesCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200 cursor-pointer',
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:rounded-[0.875rem] sm:border sm:border-[var(--admin-border)] sm:bg-[var(--admin-surface)] sm:p-5">
            {filteredQuotes.length === 0 ? (
              <div className="atelier-card sm:border-0 sm:bg-transparent py-10 px-4 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">No quotes found</p>
                <p className="text-xs text-slate-500">
                  Click &ldquo;Create Price Quote&rdquo; or convert a client inquiry.
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-0 sm:divide-y sm:divide-[var(--admin-border)]">
                {filteredQuotes.map((item) => {
                  const latest = item.versions?.[0] || item.currentVersion;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3"
                    >
                      <div className="min-w-0 lg:flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="font-mono-code text-xs font-medium text-slate-500 tabular-nums">
                              {item.reference}
                            </span>
                            <StatusBadge status={item.status} />
                            {latest && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono-code text-slate-600 tabular-nums">
                                v{latest.versionNumber}
                              </span>
                            )}
                          </div>
                          {latest && (
                            <span className="lg:hidden font-mono-code text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                              {formatPoisha(latest.totalPoisha, item.currency)}
                            </span>
                          )}
                        </div>
                        <p className="admin-row-title font-medium line-clamp-1">{item.eventTitle}</p>
                        <p className="admin-meta line-clamp-1 tabular-nums">
                          {item.clientName} ({item.clientPhone})
                          {item.requestedDate
                            ? ` • ${formatLocalDate(item.requestedDate)}`
                            : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:shrink-0 pt-1 lg:pt-0">
                        {latest && (
                          <span className="hidden lg:inline text-sm font-semibold text-slate-900 tabular-nums mr-1">
                            {formatPoisha(latest.totalPoisha, item.currency)}
                          </span>
                        )}
                        <a
                          href={`/api/quotes/${encodeURIComponent(item.id)}/invoice.pdf`}
                          download
                          className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          PDF ↓
                        </a>
                        {item.status !== 'ACCEPTED' && (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => startReviseQuote(item)}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Revise
                            </button>
                            {item.status === 'DRAFT' && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleSendQuote(item)}
                                className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                Mark Sent
                              </button>
                            )}
                            <select
                              value={acceptChannelMap[item.id] || 'PHONE'}
                              onChange={(e) =>
                                setAcceptChannelMap({
                                  ...acceptChannelMap,
                                  [item.id]: e.target.value as AcceptanceChannel,
                                })
                              }
                              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium"
                            >
                              <option value="PHONE">Phone</option>
                              <option value="WHATSAPP">WhatsApp</option>
                              <option value="IN_PERSON">In Person</option>
                              <option value="EMAIL">Email</option>
                              <option value="PORTAL">Portal</option>
                            </select>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleAcceptQuote(item)}
                              className="flex-1 sm:flex-initial text-center rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
                            >
                              Accept &amp; Book →
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quote Builder / Revision Modal (Accessible from BOTH Inquiries & Quotes!) */}
      {showQuoteForm && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 sm:backdrop-blur-xs overflow-y-auto admin-sheet-fade">
          <div className="flex-1 sm:flex-initial w-full sm:max-w-2xl h-dvh sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border sm:border-slate-200 bg-white p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-none sm:shadow-xl space-y-5 sm:my-8 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingQuoteId ? 'Revise Quote (New Version)' : 'Create Price Quote'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingQuoteId
                    ? 'Creates an immutable new quote version while preserving prior versions.'
                    : 'Auto-filled details ready — customize line items or load a package preset below.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuoteForm(false);
                  setEditingQuoteId(null);
                  setQuoteError(null);
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-4">
              {quoteError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                  {quoteError}
                </div>
              )}

              {!editingQuoteId && (() => {
                const quotableInquiries = inquiries.filter(
                  (i) => i.status !== 'CONVERTED' && i.status !== 'CLOSED',
                );
                const activeLinkedInq = quoteInquiryId
                  ? inquiries.find((i) => i.id === quoteInquiryId)
                  : undefined;

                return (
                  <>
                    {quotableInquiries.length > 0 && (
                      <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                            Linked Client Inquiry
                          </label>
                          {activeLinkedInq && (
                            <span className="font-mono-code text-[11px] font-semibold text-indigo-800">
                              {activeLinkedInq.reference}
                            </span>
                          )}
                        </div>
                        <select
                          value={quoteInquiryId}
                          onChange={(e) => {
                            const pickedId = e.target.value;
                            if (!pickedId) {
                              setQuoteInquiryId('');
                              return;
                            }
                            const found = inquiries.find((i) => i.id === pickedId);
                            if (found) openQuoteBuilder(found);
                          }}
                          className={inputClass}
                        >
                          <option value="">Standalone quote (not linked to inquiry)</option>
                          {quotableInquiries.map((inq) => (
                            <option key={inq.id} value={inq.id}>
                              {inq.reference} — {inq.eventTitle} ({inq.clientName} • {inq.status})
                            </option>
                          ))}
                        </select>
                        {activeLinkedInq?.notes && (
                          <p className="text-[11px] text-slate-600 pt-0.5">
                            Client notes: {activeLinkedInq.notes}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Event Title *
                        </label>
                        <input
                          required
                          value={quoteEventTitle}
                          onChange={(e) => setQuoteEventTitle(e.target.value)}
                          placeholder="e.g. Ayesha & Rafiq Wedding"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Client Name *
                        </label>
                        <input
                          required
                          value={quoteClientName}
                          onChange={(e) => setQuoteClientName(e.target.value)}
                          placeholder="Client name"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Client Phone *
                        </label>
                        <input
                          required
                          value={quoteClientPhone}
                          onChange={(e) => setQuoteClientPhone(e.target.value)}
                          placeholder="+8801..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Client Email (optional)
                        </label>
                        <input
                          type="email"
                          value={quoteClientEmail}
                          onChange={(e) => setQuoteClientEmail(e.target.value)}
                          placeholder="client@example.com"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Requested Date
                        </label>
                        <input
                          type="date"
                          value={quoteDate}
                          onChange={(e) => setQuoteDate(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Event Category
                        </label>
                        <select
                          value={quoteEventTypeId}
                          onChange={(e) => setQuoteEventTypeId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select category (for auto-tasks)</option>
                          {eventTypes.map((et) => (
                            <option key={et.id} value={et.id}>
                              {et.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Load Package Preset
                        </label>
                        <select
                          value={quotePackageId}
                          onChange={(e) => applyPackagePresetToQuote(e.target.value, quoteEventTitle)}
                          className={inputClass}
                        >
                          <option value="">Custom Itemized Quote...</option>
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} ({formatPoisha(pkg.basePricePoisha, currency)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}

                  {/* Line Items Builder */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Line Items
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuoteItems([
                            ...quoteItems,
                            { description: '', quantity: '1', unitPriceTk: '0' },
                          ])
                        }
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        + Add Line Item
                      </button>
                    </div>
                    {quoteItems.map((row, idx) => (
                      <div key={idx} className="grid sm:grid-cols-12 gap-2 items-center">
                        <input
                          required
                          value={row.description}
                          onChange={(e) =>
                            setQuoteItems(
                              quoteItems.map((item, i) =>
                                i === idx ? { ...item, description: e.target.value } : item,
                              ),
                            )
                          }
                          placeholder="Service / deliverable description *"
                          className={`${inputClass} sm:col-span-6`}
                        />
                        <input
                          required
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            setQuoteItems(
                              quoteItems.map((item, i) =>
                                i === idx ? { ...item, quantity: e.target.value } : item,
                              ),
                            )
                          }
                          placeholder="Qty"
                          className={`${inputClass} font-mono-code sm:col-span-2`}
                        />
                        <input
                          required
                          type="number"
                          min="0"
                          value={row.unitPriceTk}
                          onChange={(e) =>
                            setQuoteItems(
                              quoteItems.map((item, i) =>
                                i === idx ? { ...item, unitPriceTk: e.target.value } : item,
                              ),
                            )
                          }
                          placeholder={`Unit (${currency})`}
                          className={`${inputClass} font-mono-code sm:col-span-3`}
                        />
                        <button
                          type="button"
                          disabled={quoteItems.length <= 1}
                          onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                          className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-30 sm:col-span-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Discount ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={quoteDiscountTk}
                        onChange={(e) => setQuoteDiscountTk(e.target.value)}
                        className={`${inputClass} font-mono-code`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Terms &amp; Payment Schedule
                      </label>
                      <input
                        value={quoteTerms}
                        onChange={(e) => setQuoteTerms(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    {(() => {
                      const subtotalPoisha = quoteItems.reduce(
                        (sum, item) =>
                          sum +
                          Math.max(1, Math.round(Number(item.quantity) || 1)) *
                            Math.round((Number(item.unitPriceTk) || 0) * 100),
                        0,
                      );
                      const discountPoisha = Math.max(
                        0,
                        Math.round((Number(quoteDiscountTk) || 0) * 100),
                      );
                      const totalPoisha = Math.max(0, subtotalPoisha - discountPoisha);
                      return (
                        <div className="text-xs text-slate-600 font-mono-code">
                          Subtotal: {formatPoisha(subtotalPoisha, currency)} • Total:{' '}
                          <span className="font-bold text-slate-900">
                            {formatPoisha(totalPoisha, currency)}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuoteForm(false);
                          setEditingQuoteId(null);
                          setQuoteError(null);
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                      >
                        {isPending
                          ? 'Saving...'
                          : editingQuoteId
                            ? 'Save Revised Version'
                            : 'Save Quote'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

      {/* =====================================================================
          MODE 3: DEDICATED BOOKINGS LIST ROUTE (/admin/bookings)
      ===================================================================== */}
      {resolvedMode === 'bookings' && (
        <div className="space-y-3 sm:space-y-5">
          <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="admin-page-title">
                3. Bookings &amp; Ledger
              </h1>
              <p className="admin-meta mt-1">
                Click any booking to open a quick-action slide-over drawer or jump to its full workspace.
              </p>
            </div>
            <Link
              href="/admin/quotes"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200"
            >
              <span>Go to Price Quotes →</span>
            </Link>
          </div>

          {/* Search & Status Filters */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search booking ref, client, or event..."
                className="w-full h-9 sm:h-auto rounded-xl border border-border/60 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
              {(
                ['ALL', 'PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200 cursor-pointer',
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {st === 'ALL'
                    ? `All (${bookings.length})`
                    : st === 'PENDING_CONFIRMATION'
                      ? 'Pending Confirm'
                      : st}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:rounded-[0.875rem] sm:border sm:border-[var(--admin-border)] sm:bg-[var(--admin-surface)] sm:p-5">
            {filteredBookings.length === 0 ? (
              <p className="atelier-card sm:border-0 sm:bg-transparent admin-meta py-10 px-4 text-center">
                No matching bookings. Accept a quote in Price Quotes to create one.
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-0 sm:divide-y sm:divide-[var(--admin-border)]">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:rounded-lg sm:border-0 sm:bg-transparent sm:py-3.5 sm:px-2.5 sm:-mx-2.5 hover:bg-[var(--admin-surface-subtle)] transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => setQuickDrawerBookingId(b.id)}
                      className="w-full sm:flex-1 sm:min-w-0 text-left space-y-1 cursor-pointer group focus-visible:outline-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className="font-mono-code text-[11px] sm:text-xs font-medium text-[var(--admin-muted)] tabular-nums">
                            {b.reference}
                          </span>
                          <StatusBadge status={b.status} />
                          {b.eventType && (
                            <span className="text-[11px] sm:text-xs font-medium text-[var(--admin-accent)] truncate">
                              • {b.eventType.name}
                            </span>
                          )}
                        </div>
                        <span className="sm:hidden font-mono-code text-[13.5px] font-bold text-[var(--admin-text)] tabular-nums shrink-0">
                          {formatPoisha(b.agreedTotalPoisha, b.currency)}
                        </span>
                      </div>

                      <p className="admin-row-title font-semibold group-hover:text-[var(--admin-accent)] transition-colors line-clamp-1">
                        {b.eventTitle}
                      </p>
                      <p className="admin-meta line-clamp-1 tabular-nums">
                        {b.clientName} ({b.clientPhone}) • {formatLocalDate(b.eventDate)}
                      </p>
                    </button>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:shrink-0 pt-2 sm:pt-0 border-t border-[var(--admin-border)]/70 sm:border-t-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--admin-muted)]">
                          Agreed Price
                        </p>
                        <p className="font-mono-code text-[14px] font-semibold text-[var(--admin-text)] tabular-nums">
                          {formatPoisha(b.agreedTotalPoisha, b.currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuickDrawerBookingId(b.id)}
                        className="w-full sm:w-auto text-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 sm:py-1.5 text-xs font-medium text-[var(--admin-text)] hover:border-[var(--admin-accent)]/50 transition-colors cursor-pointer"
                      >
                        Quick View
                      </button>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="w-full sm:w-auto text-center rounded-lg bg-[var(--admin-accent)] px-3 py-2 sm:py-1.5 text-xs font-semibold text-[var(--admin-accent-fg)] hover:opacity-95 transition-opacity"
                      >
                        Workspace →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 4: SINGLE BOOKING WORKSPACE (/admin/bookings/[id])
          Clean Header + 4-Card Financial Strip + 4 Focused Tabs!
      ===================================================================== */}
      {resolvedMode === 'detail' && selectedBooking && (
        <div className="space-y-5">
          {/* Top Breadcrumb & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>← All Bookings</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReceiptBookingId(selectedBooking.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ReceiptIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Receipt View</span>
              </button>
              <a
                href={`/api/bookings/${encodeURIComponent(selectedBooking.id)}/invoice.pdf`}
                download
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <span>PDF Invoice</span>
              </a>

              {selectedBooking.status === 'PENDING_CONFIRMATION' && (
                <>
                  {(selectedBooking.sessions?.length ?? 0) === 0 && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setScheduleOnConfirm((v) => !v)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                        scheduleOnConfirm
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {scheduleOnConfirm ? 'Hide Shoot Slot' : '+ Add Shoot on Confirm'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleConfirmBooking}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    {scheduleOnConfirm && (selectedBooking.sessions?.length ?? 0) === 0
                      ? 'Confirm & Schedule'
                      : 'Confirm & Auto-Setup'}
                  </button>
                </>
              )}
              {selectedBooking.status === 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleCompleteBooking}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Mark Completed
                </button>
              )}
              {selectedBooking.status === 'COMPLETED' &&
                (bookingPortfolio ? (
                  <Link
                    href={`/admin/portfolio?eventId=${encodeURIComponent(bookingPortfolio.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <span>Open Digital Portfolio →</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCreateBookingPortfolio}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>{isPending ? 'Creating...' : 'Create Digital Portfolio'}</span>
                  </button>
                ))}
              {selectedBooking.status !== 'CANCELLED' &&
                selectedBooking.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setShowCancelBooking((v) => !v)}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Cancel Booking
                  </button>
                )}
            </div>
          </div>

          {/* Booking Summary Card */}
          <div className="atelier-card p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-code text-xs font-semibold text-slate-500">
                    {selectedBooking.reference}
                  </span>
                  <StatusBadge status={selectedBooking.status} />
                  {selectedBooking.eventType && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      {selectedBooking.eventType.name}
                    </span>
                  )}
                </div>
                <h1 className="admin-page-title mt-1">
                  {selectedBooking.eventTitle}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: <strong className="text-slate-800">{selectedBooking.clientName}</strong> (
                  {selectedBooking.clientPhone}) • Event Date:{' '}
                  <strong className="text-slate-800">
                    {formatLocalDate(selectedBooking.eventDate)}
                  </strong>
                  {selectedBooking.quote ? ` • Quote ${selectedBooking.quote.reference}` : ''}
                </p>
              </div>
            </div>

            {selectedBooking.status === 'COMPLETED' && (
              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      Client Digital Portfolio
                    </span>
                    {bookingPortfolio ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          bookingPortfolio.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800',
                        )}
                      >
                        {bookingPortfolio.status}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        Not Created
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {bookingPortfolio
                      ? `Shareable digital album linked to ${selectedBooking.reference} (/album/${bookingPortfolio.slug}) • ${bookingPortfolio.counts?.photos ?? 0} photos, ${bookingPortfolio.counts?.videos ?? 0} videos.`
                      : 'Event completed! Generate a Digital Portfolio album in one click using this booking’s saved title, date, category, and venue—no duplicate entry.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {bookingPortfolio ? (
                    <>
                      {bookingPortfolio.status === 'PUBLISHED' && (
                        <a
                          href={`/album/${bookingPortfolio.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Live ↗
                        </a>
                      )}
                      <Link
                        href={`/admin/portfolio?eventId=${encodeURIComponent(bookingPortfolio.id)}`}
                        className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Open Album Editor →
                      </Link>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleCreateBookingPortfolio}
                      className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      {isPending ? 'Creating Album...' : '+ Create Digital Portfolio'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {showCancelBooking && (
              <form
                onSubmit={handleCancelBooking}
                className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 flex flex-wrap gap-2 items-center"
              >
                <input
                  required
                  value={bookingCancelReason}
                  onChange={(e) => setBookingCancelReason(e.target.value)}
                  placeholder="Cancellation reason (releases all reserved crew & gear)"
                  className="flex-1 min-w-[220px] rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Cancel Booking
                </button>
              </form>
            )}

            {selectedBooking.status === 'PENDING_CONFIRMATION' && ledger && (
              <div
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2',
                  ledger.summary.isAdvanceMet
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : 'border-amber-200 bg-amber-50/70 text-amber-900',
                )}
              >
                <span>
                  {ledger.summary.isAdvanceMet
                    ? 'Required advance deposit verified — click "Confirm & Auto-Setup" above to lock dates and generate crew tasks.'
                    : `Advance Policy: ${formatPoisha(ledger.summary.requiredAdvancePoisha, ledger.summary.currency)} required • Verified so far: ${formatPoisha(ledger.summary.verifiedReceiptsPoisha, ledger.summary.currency)}`}
                </span>
              </div>
            )}

            {selectedBooking.status === 'PENDING_CONFIRMATION' &&
              scheduleOnConfirm &&
              (selectedBooking.sessions?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-indigo-900">
                      Initial Shoot &amp; Crew Slot (confirmed atomically)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(['HOLUD', 'WEDDING', 'WALIMA', 'CORPORATE'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => applyCeremonyPreset(p)}
                          className="rounded-lg border border-indigo-200 bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          + {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <input
                      value={schedTitle}
                      onChange={(e) => setSchedTitle(e.target.value)}
                      placeholder="Session title"
                      className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs"
                    />
                    <input
                      value={schedLocation}
                      onChange={(e) => setSchedLocation(e.target.value)}
                      placeholder="Venue / Location (optional)"
                      className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs"
                    />
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-indigo-700 mb-1">
                        Start ({timezone})
                      </label>
                      <input
                        type="datetime-local"
                        value={schedStart}
                        onChange={(e) => setSchedStart(e.target.value)}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-mono-code"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-indigo-700 mb-1">
                        End ({timezone})
                      </label>
                      <input
                        type="datetime-local"
                        value={schedEnd}
                        onChange={(e) => setSchedEnd(e.target.value)}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-mono-code"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {resources.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleSchedResource(r.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                          schedResourceIds.includes(r.id)
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-indigo-200 bg-white text-slate-700 hover:bg-indigo-100/50',
                        )}
                      >
                        {r.name} ({r.type})
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* 4-Card Financial KPI Strip */}
            {ledger && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Total Price</p>
                  <p className="font-mono-code text-base font-bold text-slate-900 mt-1 tabular-nums">
                    {formatPoisha(ledger.summary.effectiveAgreedChargePoisha, ledger.summary.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-700">Paid (Verified)</p>
                  <p className="font-mono-code text-base font-bold text-emerald-900 mt-1 tabular-nums">
                    {formatPoisha(ledger.summary.verifiedReceiptsPoisha, ledger.summary.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700">Pending Approval</p>
                  <p className="font-mono-code text-base font-bold text-amber-900 mt-1 tabular-nums">
                    {formatPoisha(ledger.summary.pendingReceiptsPoisha, ledger.summary.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Remaining Due</p>
                  <p className="font-mono-code text-base font-bold text-slate-900 mt-1 tabular-nums">
                    {formatPoisha(ledger.summary.outstandingDuePoisha, ledger.summary.currency)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4 Focused Section Tabs (Eliminates vertical scroll clutter!) */}
          <div className="flex items-center overflow-x-auto no-scrollbar max-w-full sm:inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1 shadow-2xs">
            {[
              {
                id: 'payments' as const,
                label: `1. Payments & Ledger (${ledger?.entries.length ?? 0})`,
              },
              {
                id: 'schedule' as const,
                label: `2. Shoot Schedule (${selectedBooking.sessions?.length ?? 0})`,
              },
              {
                id: 'deliverables' as const,
                label: `3. Deliverables (${selectedBooking.deliverables?.length ?? 0})`,
              },
              {
                id: 'tasks' as const,
                label: `4. Crew Tasks (${selectedBooking.assignments?.length ?? 0})`,
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailSection(t.id)}
                className={cn(
                  'rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer',
                  detailSection === t.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* SECTION 1: PAYMENTS & LEDGER */}
          {detailSection === 'payments' && (
            <div className="atelier-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Record &amp; Verify Payments</h2>
                  <p className="text-xs text-slate-500">
                    Log bKash, Nagad, Bank, or Cash payments. Total paid can never exceed the agreed
                    booking price.
                  </p>
                </div>
                {ledger &&
                  selectedBooking.status !== 'CANCELLED' &&
                  ledger.summary.outstandingDuePoisha - ledger.summary.pendingReceiptsPoisha > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPayAmountTk(
                          String(
                            Math.round(
                              (ledger.summary.outstandingDuePoisha -
                                ledger.summary.pendingReceiptsPoisha) /
                                100,
                            ),
                          ),
                        )
                      }
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Fill Remaining Collectible (
                      {formatPoisha(
                        ledger.summary.outstandingDuePoisha - ledger.summary.pendingReceiptsPoisha,
                        ledger.summary.currency,
                      )}
                      )
                    </button>
                  )}
              </div>

              {selectedBooking.status === 'CANCELLED' ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs font-medium text-rose-800">
                  This booking is cancelled. Recording or verifying new payments is disabled.
                </div>
              ) : ledger && ledger.summary.outstandingDuePoisha <= 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs font-semibold text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Paid in Full ✓ — Total price (
                    {formatPoisha(
                      ledger.summary.effectiveAgreedChargePoisha,
                      ledger.summary.currency,
                    )}
                    ) has been completely settled.
                  </span>
                  <span className="font-mono-code text-emerald-700">Remaining Due: Tk 0</span>
                </div>
              ) : ledger &&
                ledger.summary.outstandingDuePoisha - ledger.summary.pendingReceiptsPoisha <= 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs font-medium text-amber-900">
                  Full remaining balance (
                  {formatPoisha(ledger.summary.outstandingDuePoisha, ledger.summary.currency)}) is
                  already recorded as <strong>PENDING</strong> below. Click{' '}
                  <strong>Verify</strong> on the pending receipt below to settle the balance.
                </div>
              ) : (
                <form onSubmit={handleRecordPayment} className="grid sm:grid-cols-4 gap-2.5">
                  <input
                    type="number"
                    min="1"
                    max={
                      ledger
                        ? Math.floor(
                            (ledger.summary.outstandingDuePoisha -
                              ledger.summary.pendingReceiptsPoisha) /
                              100,
                          )
                        : undefined
                    }
                    required
                    value={payAmountTk}
                    onChange={(e) => setPayAmountTk(e.target.value)}
                    placeholder={`Max ${
                      ledger
                        ? formatPoisha(
                            ledger.summary.outstandingDuePoisha -
                              ledger.summary.pendingReceiptsPoisha,
                            ledger.summary.currency,
                          )
                        : currency
                    }`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono-code"
                  />
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium"
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                  <input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="TrxID / Receipt Ref (optional)"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    + Record Payment
                  </button>
                </form>
              )}

              {!ledger || ledger.entries.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No payments recorded yet for this booking.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ledger.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{entry.type}</span> •{' '}
                        <span className="font-mono-code">{entry.method}</span>{' '}
                        {entry.transactionRef && (
                          <span className="font-mono-code text-slate-500">
                            ({entry.transactionRef})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono-code font-bold text-slate-900 tabular-nums">
                          {formatPoisha(entry.amountPoisha, entry.currency)}
                        </span>
                        <StatusBadge status={entry.verificationState} />
                        {entry.verificationState === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleVerifyPayment(entry.id, false)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Verify
                            </button>
                            {selectedBooking.status === 'PENDING_CONFIRMATION' && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleVerifyPayment(entry.id, true)}
                                className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                Verify &amp; Confirm
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: SHOOT SCHEDULE & CREW */}
          {detailSection === 'schedule' && (
            <div className="atelier-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    <span>Shoot &amp; Event Schedule ({selectedBooking.sessions?.length ?? 0})</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Reserve shoot slots and crew for {selectedBooking.reference} •{' '}
                    <Link href="/admin/calendar" className="text-indigo-600 hover:underline">
                      Open Master Calendar ↗
                    </Link>
                  </p>
                </div>
                {selectedBooking.status !== 'CANCELLED' &&
                  selectedBooking.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>{showScheduleForm ? 'Close Form' : 'Schedule Session'}</span>
                    </button>
                  )}
              </div>

              {showScheduleForm &&
                selectedBooking.status !== 'CANCELLED' &&
                selectedBooking.status !== 'COMPLETED' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Quick Ceremony Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(['HOLUD', 'WEDDING', 'WALIMA', 'CORPORATE'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => applyCeremonyPreset(p)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          + {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <form onSubmit={handleCreateSession} className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <input
                        required
                        value={schedTitle}
                        onChange={(e) => setSchedTitle(e.target.value)}
                        placeholder="Session title (e.g. Holud, Reception)"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      />
                      <input
                        value={schedLocation}
                        onChange={(e) => setSchedLocation(e.target.value)}
                        placeholder="Venue / Location (optional)"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      />
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          Start ({timezone})
                        </label>
                        <input
                          required
                          type="datetime-local"
                          value={schedStart}
                          onChange={(e) => setSchedStart(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono-code"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          End ({timezone})
                        </label>
                        <input
                          required
                          type="datetime-local"
                          value={schedEnd}
                          onChange={(e) => setSchedEnd(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono-code"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                          Reserve Shoot Crew &amp; Gear
                        </span>
                        <div className="flex items-center gap-3">
                          <Link
                            href="/admin/crew"
                            className="text-xs font-medium text-slate-500 hover:text-[var(--admin-accent)] hover:underline"
                          >
                            Crew &amp; Gear Page ↗
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowQuickResource((v) => !v)}
                            className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                          >
                            {showQuickResource ? 'Cancel Quick Add' : '+ Quick Add Crew/Gear'}
                          </button>
                        </div>
                      </div>
                      {resources.some((r) => r.type === 'CREW') && (
                        <div className="space-y-1">
                          <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                            Shoot Crew
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {resources
                              .filter((r) => r.type === 'CREW')
                              .map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => toggleSchedResource(r.id)}
                                  className={cn(
                                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                    schedResourceIds.includes(r.id)
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                                  )}
                                >
                                  {r.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                      {resources.some((r) => r.type !== 'CREW') && (
                        <div className="space-y-1">
                          <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                            Equipment &amp; Rooms
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {resources
                              .filter((r) => r.type !== 'CREW')
                              .map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => toggleSchedResource(r.id)}
                                  className={cn(
                                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                    schedResourceIds.includes(r.id)
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                                  )}
                                >
                                  {r.name} ({r.type})
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      Save Shoot Session &amp; Reserve Crew
                    </button>
                  </form>

                  {showQuickResource && (
                    <form
                      onSubmit={handleQuickAddResource}
                      className="pt-3 border-t border-slate-200 flex flex-wrap gap-2 items-center"
                    >
                      <select
                        value={newResType}
                        onChange={(e) => {
                          const t = e.target.value as ResourceType;
                          setNewResType(t);
                          if (t !== 'CREW') setNewResUserId('');
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="CREW">Shoot Crew</option>
                        <option value="EQUIPMENT">Equipment Kit</option>
                        <option value="ROOM">Studio / Room</option>
                      </select>
                      {newResType === 'CREW' && members.length > 0 && (
                        <select
                          value={newResUserId}
                          onChange={(e) => setNewResUserId(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="">Freelance / External Crew</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              Link: {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        required={!newResUserId}
                        value={newResName}
                        onChange={(e) => setNewResName(e.target.value)}
                        placeholder={
                          newResUserId
                            ? 'Specialty title (e.g. Lead Photographer)'
                            : 'Freelancer or kit name'
                        }
                        className="flex-1 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        Add Resource
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!selectedBooking.sessions || selectedBooking.sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No shoot sessions scheduled yet for this booking. Click &ldquo;Schedule
                  Session&rdquo; above.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedBooking.sessions.map((s) => (
                    <div key={s.id} className="py-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">{s.title}</span>
                            <StatusBadge status={s.status} />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono-code">
                            {s.agencyLocalDate || formatLocalDate(s.startAt)} •{' '}
                            {formatDateTimeInTz(s.startAt, timezone)} →{' '}
                            {formatDateTimeInTz(s.endAt, timezone)}
                            {s.location ? ` • ${s.location}` : ''}
                          </p>
                          {s.reservations && s.reservations.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {s.reservations.map((r) => (
                                <span
                                  key={r.id}
                                  className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                                >
                                  {r.resource?.name || r.resourceId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {s.status === 'SCHEDULED' && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openReschedule(s)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleCompleteSession(s.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Mark Done
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                setCancellingSessionId(s.id);
                                setReschedSessionId(null);
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {reschedSessionId === s.id && (
                        <form
                          onSubmit={(e) => handleRescheduleSession(e, s.id)}
                          className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2"
                        >
                          <div className="grid sm:grid-cols-2 gap-2">
                            <input
                              required
                              type="datetime-local"
                              value={reschedStart}
                              onChange={(e) => setReschedStart(e.target.value)}
                              className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-mono-code"
                            />
                            <input
                              required
                              type="datetime-local"
                              value={reschedEnd}
                              onChange={(e) => setReschedEnd(e.target.value)}
                              className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-mono-code"
                            />
                          </div>
                          <input
                            required
                            value={reschedReason}
                            onChange={(e) => setReschedReason(e.target.value)}
                            placeholder="Reason for reschedule (required for audit log)"
                            className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {resources.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => toggleReschedResource(r.id)}
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-xs font-medium',
                                  reschedResourceIds.includes(r.id)
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-amber-200 bg-white text-slate-700',
                                )}
                              >
                                {r.name}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Save New Slot
                            </button>
                            <button
                              type="button"
                              onClick={() => setReschedSessionId(null)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Dismiss
                            </button>
                          </div>
                        </form>
                      )}

                      {cancellingSessionId === s.id && (
                        <form
                          onSubmit={(e) => handleCancelSession(e, s.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 flex flex-wrap gap-2 items-center"
                        >
                          <input
                            required
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason for cancelling shoot session"
                            className="flex-1 min-w-[200px] rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Confirm Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancellingSessionId(null)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                          >
                            Keep Slot
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: DELIVERABLES & FILES */}
          {detailSection === 'deliverables' && (() => {
            const currentDeliverables = selectedBooking.deliverables ?? [];
            const canEditDeliverables =
              selectedBooking.status !== 'CANCELLED' &&
              selectedBooking.status !== 'COMPLETED';
            const normalizeDelivKey = (text: string) =>
              text.trim().replace(/^\d+\s*[x×]\s*/i, '').toLowerCase();
            const existingKeys = new Set(currentDeliverables.map((d) => normalizeDelivKey(d.label)));
            const quoteItems = selectedBooking.acceptedQuoteVersion?.items ?? [];
            const unsyncedQuoteCount = quoteItems.filter(
              (item) =>
                item.description.trim() && !existingKeys.has(normalizeDelivKey(item.description)),
            ).length;
            const quickPresets = [
              'Edited Photos',
              'Highlight Film',
              'Full Documentary Video',
              'Printed Album',
              'Online Gallery',
            ].filter((preset) => !existingKeys.has(normalizeDelivKey(preset)));
            const portfolioAlbumSlug = bookingPortfolio?.slug ?? null;

            return (
              <div className="atelier-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Deliverables &amp; Client Files ({currentDeliverables.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Auto-populated from your Quote items — update status, dates, or mark delivered in 1 click without re-typing.
                    </p>
                  </div>
                  {canEditDeliverables && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSyncDeliverablesFromQuote}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                        unsyncedQuoteCount > 0
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      ↻ Sync Quote Items
                      {unsyncedQuoteCount > 0 ? ` (${unsyncedQuoteCount} new)` : ''}
                    </button>
                  )}
                </div>

                {canEditDeliverables && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                    {quickPresets.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                          1-Click Add:
                        </span>
                        {quickPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleQuickAddDeliverable(preset)}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    )}
                    <form onSubmit={handleAddDeliverable} className="flex flex-wrap gap-2">
                      <input
                        required
                        value={delivLabel}
                        onChange={(e) => setDelivLabel(e.target.value)}
                        placeholder="Custom deliverable item (optional)"
                        className="flex-1 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                      />
                      <input
                        type="date"
                        value={delivDueDate}
                        onChange={(e) => setDelivDueDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-code"
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        + Add Custom
                      </button>
                    </form>
                  </div>
                )}

                {currentDeliverables.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-slate-500">
                      No deliverables listed yet. Click &ldquo;Sync Quote Items&rdquo; or use a 1-click preset above.
                    </p>
                    {canEditDeliverables && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleSyncDeliverablesFromQuote}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        ↻ Sync Deliverables from Quote
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentDeliverables.map((d) => {
                      const isOverdue =
                        d.reviewStatus !== 'DELIVERED' &&
                        Boolean(d.dueAt && new Date(d.dueAt).getTime() < renderNowMs);
                      const dueInputValue = d.dueAt ? String(d.dueAt).slice(0, 10) : '';
                      return (
                        <div key={d.id} className="py-3.5 space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-sm text-slate-900">{d.label}</p>
                                <StatusBadge status={d.reviewStatus} />
                                {isOverdue && (
                                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500">
                                {d.dueAt ? `Due ${formatLocalDate(d.dueAt)}` : 'No deadline set'}
                                {d.assigneeName ? ` • Assigned: ${d.assigneeName}` : ''}
                                {d.deliveredAt ? ` • Delivered ${formatLocalDate(d.deliveredAt)}` : ''}
                                {d.deliveryUrl && (
                                  <>
                                    {' • '}
                                    <a
                                      href={d.deliveryUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-600 underline font-medium"
                                    >
                                      Open Link ↗
                                    </a>
                                  </>
                                )}
                              </p>
                            </div>

                            {canEditDeliverables && d.reviewStatus !== 'DELIVERED' && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  aria-label={`Status for ${d.label}`}
                                  disabled={isPending}
                                  value={d.reviewStatus}
                                  onChange={(e) =>
                                    handleUpdateDeliverableField(d, {
                                      reviewStatus: e.target.value as DeliverableStatus,
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700"
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="IN_REVIEW">In Review</option>
                                  <option value="CHANGES_REQUESTED">Changes Req.</option>
                                  <option value="APPROVED">Approved</option>
                                </select>

                                <input
                                  aria-label={`Due date for ${d.label}`}
                                  type="date"
                                  disabled={isPending}
                                  value={dueInputValue}
                                  onChange={(e) =>
                                    handleUpdateDeliverableField(d, {
                                      dueAt: e.target.value
                                        ? new Date(`${e.target.value}T18:00:00+06:00`).toISOString()
                                        : null,
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono-code text-slate-700"
                                />

                                {members.length > 0 && (
                                  <select
                                    aria-label={`Assignee for ${d.label}`}
                                    disabled={isPending}
                                    value={d.assigneeUserId ?? ''}
                                    onChange={(e) =>
                                      handleUpdateDeliverableField(d, {
                                        assigneeUserId: e.target.value || null,
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 max-w-[130px]"
                                  >
                                    <option value="">Unassigned</option>
                                    {members.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleDeliverItem(d)}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                                >
                                  ✓ Mark Delivered
                                </button>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    setDeliveringId(deliveringId === d.id ? null : d.id);
                                    setDeliveryUrlInput(d.deliveryUrl || '');
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  {deliveringId === d.id ? 'Close' : '+ Link'}
                                </button>

                                <button
                                  type="button"
                                  title="Remove item"
                                  disabled={isPending}
                                  onClick={() => handleDeleteDeliverable(d)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>

                          {deliveringId === d.id && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex flex-wrap items-center gap-2">
                              <input
                                value={deliveryUrlInput}
                                onChange={(e) => setDeliveryUrlInput(e.target.value)}
                                placeholder="Optional cloud gallery / Google Drive URL"
                                className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                              />
                              {portfolioAlbumSlug && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeliveryUrlInput(
                                      `${window.location.origin}/album/${portfolioAlbumSlug}`,
                                    )
                                  }
                                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                                >
                                  Use Client Album Link
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeliverItem(d, deliveryUrlInput)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Save Link &amp; Deliver
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* SECTION 4: CREW TASKS */}
          {detailSection === 'tasks' && (
            <div className="atelier-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Shoot Call Sheet &amp; Crew Tasks ({selectedBooking.assignments?.length ?? 0})
                </h2>
                <p className="text-xs text-slate-500">
                  Reserved shoot crew comes from Shoot Schedule; workflow tasks track prep, culling, editing &amp; handoff.
                </p>
              </div>

              {(selectedBooking.sessions || []).some(
                (s) => s.status !== 'CANCELLED' && (s.reservations?.length ?? 0) > 0,
              ) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Reserved on Shoot Schedule (Synced to Crew Dispatch)
                  </p>
                  <div className="space-y-1.5">
                    {(selectedBooking.sessions || [])
                      .filter((s) => s.status !== 'CANCELLED' && (s.reservations?.length ?? 0) > 0)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white rounded-lg border border-slate-200 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900">{s.title}</span>
                            <span className="text-slate-500 ml-2 tabular-nums">
                              ({formatDateTimeInTz(s.startAt, timezone)})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.reservations?.map((r) => {
                              const fullResource = resources.find((resItem) => resItem.id === r.resourceId);
                              const linkedUserId = r.resource?.userId ?? fullResource?.userId ?? null;
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => {
                                    if (linkedUserId) {
                                      setAssignUserId(linkedUserId);
                                      setAssignSessionId(s.id);
                                      setAssignRoleLabel('RAW backup & upload selects');
                                    }
                                  }}
                                  title={
                                    linkedUserId
                                      ? 'Click to pre-fill a follow-up workflow task for this crew member'
                                      : 'Gear / Freelance asset reserved on this session'
                                  }
                                  className={cn(
                                    'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                                    linkedUserId
                                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer'
                                      : 'border-slate-200 bg-slate-50 text-slate-600',
                                  )}
                                >
                                  {r.resource?.name || r.resourceId}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {members.length > 0 &&
                selectedBooking.status !== 'CANCELLED' &&
                selectedBooking.status !== 'COMPLETED' && (
                <form
                  onSubmit={handleCreateAssignment}
                  className="grid sm:grid-cols-12 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <select
                    required
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:col-span-3"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    value={assignRoleLabel}
                    onChange={(e) => setAssignRoleLabel(e.target.value)}
                    placeholder="Role / task (e.g. Holud Lead, Color Grade)"
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:col-span-4"
                  />
                  <select
                    value={assignSessionId}
                    onChange={(e) => setAssignSessionId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:col-span-3"
                  >
                    <option value="">Whole booking</option>
                    {(selectedBooking.sessions || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 sm:col-span-2"
                  >
                    + Assign
                  </button>
                </form>
              )}

              {!selectedBooking.assignments || selectedBooking.assignments.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No tasks assigned yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedBooking.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{a.roleLabel}</p>
                        <p className="text-slate-500">
                          {a.assignee ? `${a.assignee.name} (${a.assignee.role})` : 'Team member'}
                          {a.session ? ` • Session: ${a.session.title}` : ''}
                          {a.notes ? ` • ${a.notes}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleUpdateAssignmentStatus(a, 'COMPLETED')}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {receiptBookingId && (
        <BookingReceiptModal
          bookingId={receiptBookingId}
          onClose={() => setReceiptBookingId(null)}
        />
      )}

      <BookingQuickDrawer
        bookingId={quickDrawerBookingId}
        timezone={timezone}
        onClose={() => setQuickDrawerBookingId(null)}
        onMutated={() => {
          void listBookings().then((res) => {
            if (res.ok && res.data) {
              setBookings(res.data.data);
            }
          });
          router.refresh();
        }}
      />
    </div>
  );
}
