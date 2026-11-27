'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CloudinaryStatusSummary,
  EventType,
  PortfolioMediaItem,
  StudioPackage,
} from '@/types/event-management';
import {
  createPackage,
  listGalleryMedia,
  SavePackagePayload,
  signPackageCoverUpload,
  updatePackage,
} from '@/service/catalog/catalog.service';
import {
  detectImageFormat,
  measureImageDimensions,
  uploadImageToCloudinary,
} from '@/lib/cloudinaryClientUpload';
import { buildCloudinaryImageUrl } from '@/lib/showcaseMedia';
import { cn, formatPoisha } from '@/lib/utils';
import {
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface PackageFormWorkspaceProps {
  mode: 'create' | 'edit';
  initialPackage?: StudioPackage | null;
  eventTypes: EventType[];
  galleryImages: PortfolioMediaItem[];
  cloudinaryStatus?: CloudinaryStatusSummary | null;
  currency?: string;
}

interface EditablePackageLineItem {
  localKey: string;
  serviceItemId?: string;
  description: string;
  quantity: string;
  unitPriceTk: string;
}

interface CoverImageState {
  imageUrl: string | null;
  assetId: string | null;
  publicId: string | null;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  version: number | null;
  responseSignature: string | null;
}

const EMPTY_COVER: CoverImageState = {
  imageUrl: null,
  assetId: null,
  publicId: null,
  format: null,
  bytes: null,
  width: null,
  height: null,
  version: null,
  responseSignature: null,
};

function buildInitialLines(pkg?: StudioPackage | null): EditablePackageLineItem[] {
  if (pkg?.items && pkg.items.length > 0) {
    return pkg.items.map((item, idx) => ({
      localKey: item.id || `line-${idx}`,
      serviceItemId: item.serviceItemId ?? undefined,
      description: item.description,
      quantity: String(Math.max(1, item.quantity || 1)),
      unitPriceTk: String(Math.max(0, Math.round((item.unitPricePoisha || 0) / 100))),
    }));
  }
  return [
    {
      localKey: `line-initial-1`,
      description: '',
      quantity: '1',
      unitPriceTk: '0',
    },
  ];
}

function buildInitialCover(pkg?: StudioPackage | null): CoverImageState {
  if (!pkg?.coverImageUrl) return EMPTY_COVER;
  return {
    imageUrl: pkg.coverImageUrl,
    assetId: pkg.coverImageAssetId ?? null,
    publicId: pkg.coverImagePublicId ?? null,
    format: pkg.coverImageFormat ?? null,
    bytes: pkg.coverImageBytes ?? null,
    width: pkg.coverImageWidth ?? null,
    height: pkg.coverImageHeight ?? null,
    version: null,
    responseSignature: null,
  };
}

export function PackageFormWorkspace({
  mode,
  initialPackage = null,
  eventTypes,
  galleryImages,
  cloudinaryStatus = null,
  currency = 'BDT',
}: PackageFormWorkspaceProps) {
  const router = useRouter();
  const [name, setName] = useState(initialPackage?.name ?? '');
  const [basePriceTk, setBasePriceTk] = useState(
    initialPackage ? String(Math.round((initialPackage.basePricePoisha || 0) / 100)) : '50000',
  );
  const [eventTypeId, setEventTypeId] = useState(initialPackage?.eventTypeId ?? '');
  const [description, setDescription] = useState(initialPackage?.description ?? '');
  const [isPublished, setIsPublished] = useState(
    initialPackage ? initialPackage.isPublished : true,
  );
  const [items, setItems] = useState<EditablePackageLineItem[]>(() =>
    buildInitialLines(initialPackage),
  );
  const [cover, setCover] = useState<CoverImageState>(() => buildInitialCover(initialPackage));

  const [galleryPool, setGalleryPool] = useState<PortfolioMediaItem[]>(galleryImages);
  const [showPicker, setShowPicker] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(true);
  const [uploadState, setUploadState] = useState<{ progress: number; text: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const itemsTotalTk = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const price = Math.max(0, Number(item.unitPriceTk) || 0);
      return sum + qty * price;
    }, 0);
  }, [items]);

  const coverPreviewUrl = useMemo(() => {
    if (!cover.imageUrl) return null;
    if (cover.imageUrl.startsWith('/')) return cover.imageUrl;
    return buildCloudinaryImageUrl(cover.imageUrl, {
      width: 960,
      height: 600,
      crop: 'fill',
      quality: 'auto:good',
    });
  }, [cover.imageUrl]);

  const selectedEventTypeName = useMemo(
    () => eventTypes.find((et) => et.id === eventTypeId)?.name || null,
    [eventTypes, eventTypeId],
  );

  const pickerPublicIds = useMemo(() => {
    const set = new Set<string>();
    if (cover.publicId) set.add(cover.publicId);
    return set;
  }, [cover.publicId]);

  const handleAddLine = () => {
    setItems((prev) => [
      ...prev,
      {
        localKey: `line-${Date.now().toString(36)}-${prev.length}`,
        description: '',
        quantity: '1',
        unitPriceTk: '0',
      },
    ]);
  };

  const updateLine = (
    localKey: string,
    patch: Partial<Pick<EditablePackageLineItem, 'description' | 'quantity' | 'unitPriceTk'>>,
  ) => {
    setItems((prev) =>
      prev.map((row) => (row.localKey === localKey ? { ...row, ...patch } : row)),
    );
  };

  const moveLine = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      if (moved) next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const removeLine = (localKey: string) => {
    setItems((prev) => prev.filter((row) => row.localKey !== localKey));
  };

  const handleUploadPicture = (file: File) => {
    const { valid, format } = detectImageFormat(file);
    if (!valid) {
      setFeedback({
        type: 'err',
        text: 'Please pick a valid photo file (JPG, PNG, WebP, AVIF, or HEIC).',
      });
      return;
    }

    void (async () => {
      setFeedback(null);
      setUploadState({ progress: 12, text: 'Authorizing upload...' });
      try {
        const [dims, signRes] = await Promise.all([
          measureImageDimensions(file),
          signPackageCoverUpload({ format, bytes: file.size }),
        ]);

        if (!signRes.ok || !signRes.data) {
          setFeedback({
            type: 'err',
            text:
              signRes.message ||
              'Could not authorize package cover upload. Check Cloudinary configuration.',
          });
          return;
        }

        const cld = await uploadImageToCloudinary(file, signRes.data, (pct) => {
          setUploadState({ progress: pct, text: `${pct}%` });
        });

        setCover({
          imageUrl: cld.secure_url,
          assetId: cld.asset_id,
          publicId: cld.public_id,
          format: cld.format || format,
          bytes: cld.bytes || file.size,
          width: cld.width ?? dims.width ?? null,
          height: cld.height ?? dims.height ?? null,
          version: cld.version ?? null,
          responseSignature: cld.signature ?? null,
        });
      } catch (err) {
        setFeedback({
          type: 'err',
          text: err instanceof Error ? err.message : 'Cover photo upload failed.',
        });
      } finally {
        setUploadState(null);
      }
    })();
  };

  const handleOpenGalleryPicker = () => {
    setShowPicker(true);
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        setGalleryPool(res.data.data);
      }
    });
  };

  const handlePickFromGallery = (img: PortfolioMediaItem) => {
    setCover({
      imageUrl: img.secureUrl,
      assetId: img.assetId,
      publicId: img.publicId,
      format: img.format,
      bytes: img.bytes,
      width: img.width ?? null,
      height: img.height ?? null,
      version: null,
      responseSignature: null,
    });
    setShowPicker(false);
    setFeedback(null);
  };

  const handleClearPicture = () => {
    setCover(EMPTY_COVER);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeedback({ type: 'err', text: 'Package name is required.' });
      return;
    }

    const numericBasePrice = Number(basePriceTk);
    if (!Number.isFinite(numericBasePrice) || numericBasePrice < 0) {
      setFeedback({ type: 'err', text: 'Enter a valid non-negative base price.' });
      return;
    }

    // Check line items: ignore untouched completely blank rows ONLY when user left everything blank on the sole empty row,
    // otherwise require non-empty description on every added item row with a quantity or price.
    const populatedRows: Array<{
      serviceItemId?: string;
      description: string;
      quantity: number;
      unitPricePoisha: number;
    }> = [];

    for (let idx = 0; idx < items.length; idx += 1) {
      const row = items[idx]!;
      const desc = row.description.trim();
      const qty = Math.round(Number(row.quantity) || 0);
      const lineTk = Number(row.unitPriceTk) || 0;

      if (!desc) {
        const isOnlyUntouchedBlankRow = items.length === 1 && (lineTk === 0 || !row.unitPriceTk.trim());
        if (isOnlyUntouchedBlankRow) continue;
        setFeedback({
          type: 'err',
          text: `Package item line #${idx + 1} needs a description (or remove the blank line).`,
        });
        return;
      }

      if (!Number.isFinite(qty) || qty < 1) {
        setFeedback({
          type: 'err',
          text: `Quantity on item line #${idx + 1} must be at least 1.`,
        });
        return;
      }
      if (!Number.isFinite(lineTk) || lineTk < 0) {
        setFeedback({
          type: 'err',
          text: `Line value on item line #${idx + 1} cannot be negative.`,
        });
        return;
      }

      populatedRows.push({
        ...(row.serviceItemId ? { serviceItemId: row.serviceItemId } : {}),
        description: desc,
        quantity: qty,
        unitPricePoisha: Math.round(lineTk * 100),
      });
    }

    const basePricePoisha = Math.round(numericBasePrice * 100);

    const commonPayload: SavePackagePayload = {
      name: trimmedName,
      description: description.trim() || null,
      eventTypeId: eventTypeId || null,
      basePricePoisha,
      isPublished,
      coverImageUrl: cover.imageUrl,
      coverImageAssetId: cover.assetId,
      coverImagePublicId: cover.publicId,
      coverImageFormat: cover.format,
      coverImageBytes: cover.bytes,
      coverImageWidth: cover.width,
      coverImageHeight: cover.height,
      coverImageVersion: cover.version,
      coverImageResponseSignature: cover.responseSignature,
      items: populatedRows,
    };

    startTransition(async () => {
      try {
        if (mode === 'edit' && initialPackage?.id) {
          const res = await updatePackage(initialPackage.id, commonPayload);
          if (!res.ok || !res.data) {
            setFeedback({
              type: 'err',
              text:
                res.message ||
                'Could not update package. All your form inputs have been preserved.',
            });
            return;
          }
          setFeedback({ type: 'ok', text: `Package "${res.data.name}" updated cleanly.` });
          router.refresh();
          return;
        }

        const res = await createPackage({
          ...commonPayload,
          name: trimmedName,
          basePricePoisha,
        });
        if (!res.ok || !res.data) {
          setFeedback({
            type: 'err',
            text:
              res.message ||
              'Could not create package. All your form inputs have been preserved.',
          });
          return;
        }
        router.push('/admin/catalog');
        router.refresh();
      } catch (err) {
        setFeedback({
          type: 'err',
          text:
            err instanceof Error
              ? `${err.message} — your entered form values were kept intact.`
              : 'Network or server error while saving. Your form values were kept intact.',
        });
      }
    });
  };

  const isCloudinaryReady = cloudinaryStatus?.configured ?? true;
  const inputClass =
    'w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs sm:text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-muted)] focus:outline-none focus:border-[var(--admin-accent)] transition-colors';

  const previewItems = items.filter((i) => i.description.trim().length > 0);
  const previewPricePoisha = Math.max(0, Math.round((Number(basePriceTk) || 0) * 100));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Bar under Dashboard Sidebar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/catalog"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
            >
              ← Back to Packages
            </Link>
            <h1 className="admin-page-title">
              {mode === 'edit' ? 'Edit Service Package' : 'Create Service Package'}
            </h1>
          </div>
          <p className="admin-meta">
            Add itemized deliverables, set bundle pricing, and attach a cover photo for your storefront.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--admin-accent)]"
            />
            <span>{isPublished ? 'Published on Storefront' : 'Save as Draft'}</span>
          </label>
        </div>
      </div>

      {!isCloudinaryReady && cloudinaryStatus && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Cloudinary Setup Needed for Direct Uploads:</strong> Missing{' '}
          <span className="font-mono-code font-semibold">
            {cloudinaryStatus.missingVariables.join(', ')}
          </span>
          . You can still pick an existing photo from Gallery.
        </div>
      )}

      {feedback && (
        <div
          role="alert"
          className={cn(
            'rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3',
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Core Fields + Itemized Lines */}
        <div className="lg:col-span-7 space-y-4">
          <div className="admin-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-[var(--admin-border-subtle)] pb-2.5">
              <h2 className="admin-section-title">Package Details</h2>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  maxLength={160}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Signature Wedding Story"
                  className={cn(inputClass, 'font-semibold')}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Base Price ({currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={basePriceTk}
                  onChange={(e) => setBasePriceTk(e.target.value)}
                  placeholder="50000"
                  className={cn(inputClass, 'font-mono-code')}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Event Category
                </label>
                <select
                  value={eventTypeId}
                  onChange={(e) => setEventTypeId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Any event category</option>
                  {eventTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Short Summary / Tagline
                </label>
                <textarea
                  rows={2}
                  value={description}
                  maxLength={1000}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview shown under the package title (e.g. Ideal for full-day Wedding coverage with highlight cinema)"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Line-by-Line Included Items */}
          <div className="admin-card p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border-subtle)] pb-2.5">
              <div>
                <h2 className="admin-section-title">
                  Included Deliverables &amp; Items ({items.length})
                </h2>
                <p className="text-[11px] text-[var(--admin-muted)]">
                  Add each photographer, film, album, or deliverable on its own line.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-accent)]/45 bg-[var(--admin-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            {itemsTotalTk > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-2 text-xs">
                <span className="text-[var(--admin-muted)]">
                  Itemized line total:{' '}
                  <strong className="font-mono-code text-[var(--admin-text)]">
                    {formatPoisha(itemsTotalTk * 100, currency)}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setBasePriceTk(String(Math.round(itemsTotalTk)))}
                  className="font-semibold text-[var(--admin-accent)] underline cursor-pointer"
                >
                  Use Line Total as Base Price
                </button>
              </div>
            )}

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--admin-border)] p-5 text-center space-y-2">
                <p className="text-xs text-[var(--admin-muted)]">No package lines added yet.</p>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-accent-fg)] cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add First Line</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((row, idx) => (
                  <div
                    key={row.localKey}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/70 p-2.5 sm:p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                        Line #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLine(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Move item up"
                          className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLine(idx, 1)}
                          disabled={idx === items.length - 1}
                          aria-label="Move item down"
                          className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(row.localKey)}
                          aria-label={`Remove line ${idx + 1}`}
                          className="rounded-md px-2 py-0.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr_84px_124px]">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                          Item / Deliverable Description *
                        </label>
                        <input
                          type="text"
                          value={row.description}
                          maxLength={300}
                          onChange={(e) =>
                            updateLine(row.localKey, { description: e.target.value })
                          }
                          placeholder="e.g. Senior Photographer / Highlight Film"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                          Qty *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            updateLine(row.localKey, { quantity: e.target.value })
                          }
                          className={cn(inputClass, 'font-mono-code')}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                          Value ({currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={row.unitPriceTk}
                          onChange={(e) =>
                            updateLine(row.localKey, { unitPriceTk: e.target.value })
                          }
                          placeholder="0 = Incl."
                          className={cn(inputClass, 'font-mono-code')}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--admin-border-subtle)]">
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
                <span>Add Another Line</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/catalog"
                  className="rounded-xl border border-[var(--admin-border)] px-4 py-2 text-xs font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isPending || Boolean(uploadState)}
                  className="rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] shadow-xs hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {isPending
                    ? 'Saving Package...'
                    : mode === 'edit'
                      ? 'Save Changes'
                      : isPublished
                        ? 'Save & Publish'
                        : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cover Photo + Storefront Card Preview */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="admin-card p-4 sm:p-5 space-y-3.5">
            <div className="border-b border-[var(--admin-border-subtle)] pb-2.5">
              <h2 className="admin-section-title">Package Cover Picture</h2>
              <p className="text-[11px] text-[var(--admin-muted)]">
                Displayed at the top of this package card on your public website.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadPicture(file);
                e.target.value = '';
              }}
            />

            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]">
              {coverPreviewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={coverPreviewUrl}
                  alt={name || 'Package cover preview'}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center p-6 text-center hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                >
                  <CameraIcon className="w-8 h-8 text-[var(--admin-muted)] mb-2" />
                  <span className="text-xs font-semibold text-[var(--admin-text)]">
                    Upload Cover Picture
                  </span>
                  <span className="text-[11px] text-[var(--admin-muted)] mt-0.5">
                    Landscape photo recommended (JPG, PNG, WebP)
                  </span>
                </button>
              )}

              {uploadState && (
                <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white text-xs gap-2 px-6">
                  <span className="font-semibold">{uploadState.text}</span>
                  <div className="w-full max-w-[200px] h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-[#CAA650]"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={Boolean(uploadState) || isPending}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-xl bg-[var(--admin-accent)] px-3 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] hover:opacity-95 cursor-pointer text-center"
              >
                {coverPreviewUrl ? 'Replace Photo' : 'Upload Photo'}
              </button>
              <button
                type="button"
                disabled={Boolean(uploadState) || isPending}
                onClick={handleOpenGalleryPicker}
                className="flex-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer text-center"
              >
                Pick Gallery
              </button>
              {cover.imageUrl && (
                <button
                  type="button"
                  disabled={Boolean(uploadState) || isPending}
                  onClick={handleClearPicture}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Live Public Storefront Preview */}
          <div className="admin-card p-4 sm:p-5 space-y-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
              Live Storefront Card Preview
            </p>

            <div className="rounded-2xl border border-[#E5DFD0] bg-white text-[#181611] overflow-hidden shadow-xs">
              {coverPreviewUrl && (
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3EFE6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreviewUrl}
                    alt={name || 'Preview'}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              )}
              <div className="p-5 space-y-3">
                {selectedEventTypeName && (
                  <span className="inline-block rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6F5319]">
                    {selectedEventTypeName}
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-editorial text-xl font-semibold text-[#181611] leading-snug">
                    {name.trim() || 'Package Title'}
                  </h3>
                  <span className="rounded-lg bg-[#181611] px-2.5 py-1 text-xs font-mono-code font-semibold text-white shrink-0 tabular-nums">
                    {formatPoisha(previewPricePoisha, currency)}
                  </span>
                </div>
                {description.trim() && (
                  <p className="text-xs text-[#4A4438] leading-relaxed">{description.trim()}</p>
                )}
                {previewItems.length > 0 && (
                  <ul className="space-y-1.5 border-t border-[#ECE6D8] pt-3 text-xs text-[#4A4438]">
                    {previewItems.map((line) => {
                      const lineVal = Math.max(0, Math.round((Number(line.unitPriceTk) || 0) * 100));
                      const qty = Math.max(1, Math.round(Number(line.quantity) || 1));
                      return (
                        <li key={line.localKey} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-[#8B6A21] shrink-0" />
                            <span className="truncate">
                              {qty}× {line.description.trim()}
                            </span>
                          </span>
                          {lineVal > 0 && (
                            <span className="font-mono-code text-[11px] text-[#6B6352] tabular-nums shrink-0">
                              {formatPoisha(lineVal * qty, currency)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="pt-2">
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-semibold text-white shadow-sm">
                    <span>Book on WhatsApp</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <StudioGalleryPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        title="Pick Package Cover Photo"
        subtitle="Select an existing studio gallery photo or upload a dedicated cover image directly."
        actionLabel="Use Cover"
        activeLabel="Current"
        galleryImages={galleryPool}
        activePublicIds={pickerPublicIds}
        searchQuery={gallerySearch}
        onSearchChange={setGallerySearch}
        landscapeOnly={landscapeOnly}
        onLandscapeOnlyChange={setLandscapeOnly}
        isBusy={Boolean(uploadState) || isPending}
        onPickImage={handlePickFromGallery}
      />
    </div>
  );
}
