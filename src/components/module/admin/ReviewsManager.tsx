'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ClientReview,
  CloudinaryStatusSummary,
  PortfolioMediaItem,
} from '@/types/event-management';
import {
  createClientReview,
  deleteClientReview,
  reorderClientReviews,
  signReviewUpload,
  updateClientReview,
} from '@/service/reviews/reviews.service';
import {
  detectImageFormat,
  formatBytes,
  measureImageDimensions,
  uploadImageToCloudinary,
} from '@/lib/cloudinaryClientUpload';
import { buildCloudinaryImageUrl } from '@/lib/showcaseMedia';
import { useModalHistoryBack } from '@/lib/useModalHistoryBack';
import { cn } from '@/lib/utils';
import {
  CameraIcon,
  CheckCircleIcon,
  CloseIcon,
  ExternalLinkIcon,
  GalleryHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface ReviewsManagerProps {
  initialReviews: ClientReview[];
  initialUploadStatus: CloudinaryStatusSummary | null;
  galleryImages: PortfolioMediaItem[];
  initialError?: string | null;
}

type StatusFilter = 'all' | 'published' | 'draft';

interface ReviewFormState {
  editingId: string | null;
  clientName: string;
  quote: string;
  rating: number;
  eventTitle: string;
  sourceLabel: string;
  imageUrl: string;
  imageAssetId: string;
  imagePublicId: string;
  imageFormat: string;
  imageBytes: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageResponseSignature: string;
  isPublished: boolean;
}

const INITIAL_FORM_STATE: ReviewFormState = {
  editingId: null,
  clientName: '',
  quote: '',
  rating: 5,
  eventTitle: '',
  sourceLabel: '',
  imageUrl: '',
  imageAssetId: '',
  imagePublicId: '',
  imageFormat: '',
  imageBytes: null,
  imageWidth: null,
  imageHeight: null,
  imageVersion: null,
  imageResponseSignature: '',
  isPublished: true,
};

const FIELD_INPUT_CLASS =
  'w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3.5 py-2.5 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/70 outline-none transition-colors';

function StarSvg({
  className,
  filled,
}: {
  className?: string;
  filled: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        'transition-colors',
        filled ? 'text-[#F5C518]' : 'text-[var(--admin-muted)]/25',
        className,
      )}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.25l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.15l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.25z" />
    </svg>
  );
}

function TrashSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function ReviewsManager({
  initialReviews,
  initialUploadStatus,
  galleryImages,
  initialError = null,
}: ReviewsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reviews, setReviews] = useState<ClientReview[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Storefront preview strip state
  const [showPreview, setShowPreview] = useState(true);
  const [previewReviewId, setPreviewReviewId] = useState<string | null>(null);

  // Composer modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<ReviewFormState>(INITIAL_FORM_STATE);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Studio Gallery picker modal state
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(false);

  // Upload & mutation state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useModalHistoryBack(composerOpen && !galleryPickerOpen, () => {
    if (!isUploading && !isPending) {
      setComposerOpen(false);
    }
  });

  useEffect(() => {
    if (!composerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !galleryPickerOpen && !isUploading && !isPending) {
        setComposerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [composerOpen, galleryPickerOpen, isUploading, isPending]);

  const publishedReviews = useMemo(
    () => reviews.filter((r) => r.isPublished),
    [reviews],
  );
  const draftCount = reviews.length - publishedReviews.length;

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const total = reviews.reduce((sum, r) => sum + (r.rating || 5), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reviews.filter((r) => {
      if (statusFilter === 'published' && !r.isPublished) return false;
      if (statusFilter === 'draft' && r.isPublished) return false;
      if (!q) return true;
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.quote.toLowerCase().includes(q) ||
        (r.eventTitle || '').toLowerCase().includes(q) ||
        (r.sourceLabel || '').toLowerCase().includes(q)
      );
    });
  }, [reviews, statusFilter, searchQuery]);

  const canReorder = statusFilter === 'all' && searchQuery.trim().length === 0;

  // Determine active slide inside the top interactive Storefront Preview strip
  const previewSlides = publishedReviews.length > 0 ? publishedReviews : reviews;
  const activePreviewIndex = useMemo(() => {
    if (previewSlides.length === 0) return 0;
    if (previewReviewId) {
      const idx = previewSlides.findIndex((r) => r.id === previewReviewId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [previewSlides, previewReviewId]);
  const activePreviewReview = previewSlides[activePreviewIndex] ?? null;

  const galleryActiveIds = useMemo(() => {
    const set = new Set<string>();
    if (form.imagePublicId) set.add(form.imagePublicId);
    return set;
  }, [form.imagePublicId]);

  const openCreateModal = () => {
    setForm(INITIAL_FORM_STATE);
    setModalError(null);
    setShowUrlInput(false);
    setComposerOpen(true);
  };

  const openEditModal = (review: ClientReview) => {
    setModalError(null);
    setShowUrlInput(false);
    setForm({
      editingId: review.id,
      clientName: review.clientName,
      quote: review.quote,
      rating: review.rating,
      eventTitle: review.eventTitle ?? '',
      sourceLabel: review.sourceLabel ?? '',
      imageUrl: review.imageUrl,
      imageAssetId: review.imageAssetId ?? '',
      imagePublicId: review.imagePublicId ?? '',
      imageFormat: review.imageFormat ?? '',
      imageBytes: review.imageBytes ?? null,
      imageWidth: review.imageWidth ?? null,
      imageHeight: review.imageHeight ?? null,
      imageVersion: null,
      imageResponseSignature: '',
      isPublished: review.isPublished,
    });
    setComposerOpen(true);
  };

  const handleUploadPicture = async (file: File | null | undefined) => {
    if (!file) return;
    setModalError(null);

    const detected = detectImageFormat(file);
    if (!detected.valid) {
      setModalError('Please choose a valid image file (JPG, PNG, WEBP, or AVIF).');
      return;
    }

    if (
      initialUploadStatus &&
      !initialUploadStatus.configured &&
      initialUploadStatus.missingVariables.length > 0
    ) {
      setModalError(
        `Cloudinary upload is not configured (${initialUploadStatus.missingVariables.join(', ')}). Pick an existing Studio Gallery image or paste an HTTPS URL.`,
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(6);

    try {
      const [signRes, dims] = await Promise.all([
        signReviewUpload({ format: detected.format, bytes: file.size }),
        measureImageDimensions(file),
      ]);

      if (!signRes.ok || !signRes.data) {
        if (signRes.status === 404) {
          setModalError(
            'Reviews upload endpoint (/reviews/sign-upload) was not found on the backend. Restart or redeploy wedding-photoart-server first.',
          );
        } else {
          setModalError(signRes.message || 'Unable to authorize Cloudinary upload.');
        }
        return;
      }

      const uploaded = await uploadImageToCloudinary(file, signRes.data, (pct) => {
        setUploadProgress(pct);
      });

      setForm((prev) => ({
        ...prev,
        imageUrl: uploaded.secure_url || prev.imageUrl,
        imageAssetId: uploaded.asset_id || '',
        imagePublicId: uploaded.public_id || '',
        imageFormat: uploaded.format || detected.format,
        imageBytes: typeof uploaded.bytes === 'number' ? uploaded.bytes : file.size,
        imageWidth: uploaded.width ?? dims.width ?? null,
        imageHeight: uploaded.height ?? dims.height ?? null,
        imageVersion: typeof uploaded.version === 'number' ? uploaded.version : null,
        imageResponseSignature: uploaded.signature || '',
      }));
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to upload review picture.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePickFromGallery = (media: PortfolioMediaItem) => {
    setModalError(null);
    setForm((prev) => ({
      ...prev,
      imageUrl: media.secureUrl,
      imageAssetId: media.assetId,
      imagePublicId: media.publicId,
      imageFormat: media.format,
      imageBytes: media.bytes,
      imageWidth: media.width,
      imageHeight: media.height,
      imageVersion: null,
      imageResponseSignature: '',
    }));
    setGalleryPickerOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    const clientName = form.clientName.trim();
    const quote = form.quote.trim();
    const imageUrl = form.imageUrl.trim();

    if (!imageUrl || !imageUrl.startsWith('https://')) {
      setModalError('Please upload or choose a backdrop picture (HTTPS URL required).');
      return;
    }
    if (!clientName) {
      setModalError('Client name is required (e.g. Tangir Miah).');
      return;
    }
    if (quote.length < 3) {
      setModalError('Please enter a review quote of at least 3 characters.');
      return;
    }

    startTransition(async () => {
      if (form.editingId) {
        const res = await updateClientReview(form.editingId, {
          clientName,
          quote,
          rating: form.rating,
          eventTitle: form.eventTitle.trim(),
          sourceLabel: form.sourceLabel.trim(),
          imageUrl,
          imageAssetId: form.imageAssetId || undefined,
          imagePublicId: form.imagePublicId || undefined,
          imageFormat: form.imageFormat || undefined,
          imageBytes: form.imageBytes ?? undefined,
          imageWidth: form.imageWidth ?? undefined,
          imageHeight: form.imageHeight ?? undefined,
          imageVersion: form.imageVersion ?? undefined,
          imageResponseSignature: form.imageResponseSignature || undefined,
          isPublished: form.isPublished,
        });

        if (!res.ok || !res.data) {
          setModalError(res.message || 'Unable to update review.');
          return;
        }

        const updated = res.data;
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setPreviewReviewId(updated.id);
        setComposerOpen(false);
        setSuccessMsg(`Saved changes to ${updated.clientName}'s review.`);
      } else {
        const res = await createClientReview({
          clientName,
          quote,
          rating: form.rating,
          eventTitle: form.eventTitle.trim() || undefined,
          sourceLabel: form.sourceLabel.trim() || undefined,
          imageUrl,
          imageAssetId: form.imageAssetId || undefined,
          imagePublicId: form.imagePublicId || undefined,
          imageFormat: form.imageFormat || undefined,
          imageBytes: form.imageBytes ?? undefined,
          imageWidth: form.imageWidth ?? undefined,
          imageHeight: form.imageHeight ?? undefined,
          imageVersion: form.imageVersion ?? undefined,
          imageResponseSignature: form.imageResponseSignature || undefined,
          isPublished: form.isPublished,
        });

        if (!res.ok || !res.data) {
          setModalError(res.message || 'Unable to create review.');
          return;
        }

        const created = res.data;
        setReviews((prev) => [...prev, created]);
        setPreviewReviewId(created.id);
        setComposerOpen(false);
        setSuccessMsg(
          created.isPublished
            ? `Published review by ${created.clientName} to your homepage banner.`
            : `Saved draft review by ${created.clientName}.`,
        );
      }
    });
  };

  const handleTogglePublish = (review: ClientReview) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await updateClientReview(review.id, {
        isPublished: !review.isPublished,
      });
      if (!res.ok || !res.data) {
        setErrorMsg(res.message || 'Failed to update publish status.');
        return;
      }
      const updated = res.data;
      setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (updated.isPublished) {
        setPreviewReviewId(updated.id);
      }
      setSuccessMsg(
        updated.isPublished
          ? `Review by ${updated.clientName} is now live on the homepage.`
          : `Review by ${updated.clientName} moved to drafts.`,
      );
    });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= reviews.length) return;

    const reordered = [...reviews];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);
    setReviews(reordered);

    startTransition(async () => {
      const res = await reorderClientReviews(reordered.map((r) => r.id));
      if (!res.ok || !res.data) {
        setErrorMsg(res.message || 'Failed to save new review order.');
        return;
      }
      setReviews(res.data.data);
      setSuccessMsg('Updated homepage review slider sequence.');
    });
  };

  const handleDelete = (review: ClientReview) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await deleteClientReview(review.id);
      if (!res.ok) {
        setErrorMsg(res.message || 'Unable to delete review.');
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      if (previewReviewId === review.id) {
        setPreviewReviewId(null);
      }
      setDeletingId(null);
      setSuccessMsg(`Deleted review by ${review.clientName}.`);
    });
  };

  const cyclePreview = (delta: number) => {
    if (previewSlides.length <= 1) return;
    const nextIdx =
      (activePreviewIndex + delta + previewSlides.length) % previewSlides.length;
    const target = previewSlides[nextIdx];
    if (target) setPreviewReviewId(target.id);
  };

  const modalPreviewUrl = form.imageUrl.trim()
    ? buildCloudinaryImageUrl(form.imageUrl.trim(), {
        width: 1200,
        crop: 'limit',
        quality: 'auto:good',
      })
    : '';

  return (
    <div className="space-y-5">
      {/* =====================================================================
          TOP STUDIO HEADER & PRIMARY ACTIONS
      ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="admin-page-title">Client Reviews Banner</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                publishedReviews.length > 0
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-[var(--admin-accent)]/35 bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  publishedReviews.length > 0 ? 'bg-emerald-500' : 'bg-[var(--admin-accent)]',
                )}
              />
              {publishedReviews.length > 0
                ? `Live • ${publishedReviews.length} Published`
                : 'Auto-Fallback Active'}
            </span>
          </div>
          <p className="admin-meta">
            Showcase full-bleed couple portraits and verified quotes directly below
            &ldquo;See All Services&rdquo; on your homepage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
          >
            {showPreview ? 'Hide Banner Preview' : 'Show Banner Preview'}
          </button>

          <Link
            href="/#reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
          >
            <span>View Live Section</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] shadow-xs hover:bg-[var(--admin-accent-hover)] transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Client Review</span>
          </button>
        </div>
      </div>

      {/* Explicit missing-credential notice when backend reports missing Cloudinary env vars */}
      {initialUploadStatus &&
        !initialUploadStatus.configured &&
        initialUploadStatus.missingVariables.length > 0 && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200 space-y-0.5">
            <p className="font-semibold">Cloudinary Upload Setup Needed in Backend .env</p>
            <p>
              Missing variables:{' '}
              <span className="font-mono font-semibold">
                {initialUploadStatus.missingVariables.join(', ')}
              </span>
              . You can still pick from Studio Gallery or paste an HTTPS URL.
            </p>
          </div>
        )}

      {/* Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
            {successMsg}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-semibold underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE FULL-WIDTH STOREFRONT BANNER PREVIEW
      ===================================================================== */}
      {showPreview && (
        <div className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/70">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                Storefront Slider Preview
              </span>
              {activePreviewReview && !activePreviewReview.isPublished && (
                <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  Draft Preview (Hidden on Live Site)
                </span>
              )}
            </div>

            {previewSlides.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--admin-muted)]">
                <span>
                  Slide {activePreviewIndex + 1} of {previewSlides.length}
                </span>
                {previewSlides.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => cyclePreview(-1)}
                      className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => cyclePreview(1)}
                      className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-[#14110C] text-white flex items-center justify-center px-6 text-center">
            {activePreviewReview?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={buildCloudinaryImageUrl(
                  activePreviewReview.deliveryUrls?.fullUrl ||
                    activePreviewReview.imageUrl,
                  { width: 1600, crop: 'limit', quality: 'auto:good' },
                )}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#231D14] via-[#15120D] to-[#0D0B08]" />
            )}

            <div
              className="absolute inset-0 bg-[#120F0A]/62"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(16,13,9,0.72) 0%, rgba(16,13,9,0.52) 50%, rgba(16,13,9,0.78) 100%)',
              }}
            />

            <div className="relative z-10 max-w-2xl mx-auto space-y-2.5">
              <p className="font-editorial uppercase tracking-[0.07em] text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-white">
                Client Reviews
              </p>
              <p className="text-xs sm:text-sm lg:text-[15px] text-[#F7F3EA] leading-relaxed">
                &ldquo;{' '}
                {activePreviewReview?.quote ||
                  'Riazul Islam Shawon thank you bhaia for these amazing captures'}{' '}
                &rdquo;
              </p>
              <div className="flex items-center justify-center gap-1 pt-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarSvg
                    key={star}
                    filled={star <= (activePreviewReview?.rating ?? 5)}
                    className="w-4 h-4"
                  />
                ))}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#EFEAE0]">
                -{activePreviewReview?.clientName || 'Tangir Miah'}
              </p>
              {(activePreviewReview?.eventTitle || activePreviewReview?.sourceLabel) && (
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-white/65">
                  {[activePreviewReview.eventTitle, activePreviewReview.sourceLabel]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}
            </div>

            {previewSlides.length > 1 && (
              <div className="absolute bottom-4 right-5 z-10 flex items-center gap-2">
                {previewSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Preview slide ${idx + 1}`}
                    onClick={() => setPreviewReviewId(slide.id)}
                    className={cn(
                      'rounded-full transition-all cursor-pointer',
                      idx === activePreviewIndex
                        ? 'h-2.5 w-2.5 bg-white'
                        : 'h-2 w-2 bg-white/40 hover:bg-white/75',
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          FILTER BAR + SUMMARY SCOPE + SEARCH
      ===================================================================== */}
      <div className="admin-card p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center overflow-x-auto no-scrollbar max-w-full gap-1.5 pb-0.5">
          {(
            [
              { id: 'all', label: `All (${reviews.length})` },
              { id: 'published', label: `Published (${publishedReviews.length})` },
              { id: 'draft', label: `Drafts (${draftCount})` },
            ] as Array<{ id: StatusFilter; label: string }>
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                  active
                    ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                    : 'bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)]',
                )}
              >
                {tab.label}
              </button>
            );
          })}

          <span className="ml-1 inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-text)] whitespace-nowrap shrink-0">
            <StarSvg filled className="w-3.5 h-3.5" />
            <span>{avgRating} Avg</span>
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="w-4 h-4 text-[var(--admin-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, quote, event..."
            className="w-full h-9 sm:h-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] pl-9 pr-3 py-1.5 text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/70 outline-none"
          />
        </div>
      </div>

      {/* =====================================================================
          SPACIOUS REVIEWS CARD GRID
      ===================================================================== */}
      {filteredReviews.length === 0 ? (
        <div className="admin-card p-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <CameraIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="admin-section-title">
              {reviews.length === 0
                ? 'No Client Reviews Added Yet'
                : 'No Reviews Match Your Filter'}
            </h2>
            <p className="admin-meta">
              {reviews.length === 0
                ? 'Upload a couple backdrop photo, rate the experience, and publish your first testimonial to the homepage slider.'
                : 'Try clearing the search box or switching filter tabs above.'}
            </p>
          </div>
          {reviews.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] hover:bg-[var(--admin-accent-hover)] cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add First Client Review</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredReviews.map((review) => {
            const globalIndex = reviews.findIndex((r) => r.id === review.id);
            const cardImageUrl = buildCloudinaryImageUrl(
              review.deliveryUrls?.coverUrl || review.imageUrl,
              { width: 800, height: 460, crop: 'fill', quality: 'auto' },
            );
            const isPreviewed = activePreviewReview?.id === review.id;

            return (
              <article
                key={review.id}
                className={cn(
                  'admin-card overflow-hidden flex flex-col justify-between transition-colors',
                  isPreviewed && 'ring-1 ring-[var(--admin-accent)]/50',
                )}
              >
                {/* Top 16:9 Photo Backdrop Thumbnail */}
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#14110C] group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cardImageUrl}
                      alt={`Backdrop for ${review.clientName}`}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/35" />

                    {/* Top-left order & live status pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-full bg-black/65 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-mono font-semibold text-white">
                        #{globalIndex + 1}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider',
                          review.isPublished
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-neutral-900/85 text-neutral-200 border border-white/20',
                        )}
                      >
                        {review.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {/* Top-right star summary */}
                    <div className="absolute top-3 right-3 rounded-full bg-black/65 backdrop-blur-xs px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                      <StarSvg filled className="w-3.5 h-3.5" />
                      <span>{review.rating}.0</span>
                    </div>

                    {/* Bottom overlay attribution + Preview shortcut */}
                    <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
                      <p className="text-sm font-semibold text-white truncate drop-shadow-xs">
                        -{review.clientName}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPreview(true);
                          setPreviewReviewId(review.id);
                        }}
                        className="rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/25 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-colors cursor-pointer shrink-0"
                      >
                        {isPreviewed ? 'Previewing' : 'Preview'}
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Quote & Event Chips */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarSvg
                          key={star}
                          filled={star <= review.rating}
                          className="w-3.5 h-3.5"
                        />
                      ))}
                    </div>

                    <p className="text-xs sm:text-[13px] text-[var(--admin-text)] leading-relaxed line-clamp-3">
                      &ldquo;{review.quote}&rdquo;
                    </p>

                    {(review.eventTitle || review.sourceLabel) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {review.eventTitle && (
                          <span className="rounded-md border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-text)]">
                            {review.eventTitle}
                          </span>
                        )}
                        {review.sourceLabel && (
                          <span className="rounded-md border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)] px-2 py-0.5 text-[11px] text-[var(--admin-muted)]">
                            {review.sourceLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Reorder & Lifecycle Actions */}
                <div className="px-4 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)]/45 flex flex-wrap items-center justify-between gap-2">
                  {canReorder ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={globalIndex === 0 || isPending}
                        onClick={() => handleMove(globalIndex, -1)}
                        title="Move earlier in banner slider"
                        className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={globalIndex === reviews.length - 1 || isPending}
                        onClick={() => handleMove(globalIndex, 1)}
                        title="Move later in banner slider"
                        className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--admin-muted)]">
                      Clear search/filter to reorder
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTogglePublish(review)}
                      className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                    >
                      {review.isPublished ? 'Hide' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => openEditModal(review)}
                      className="rounded-lg border border-[var(--admin-accent)]/40 bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:opacity-85 cursor-pointer"
                    >
                      Edit
                    </button>

                    {deletingId === review.id ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(review)}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-[11px] text-[var(--admin-muted)] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(review.id)}
                        aria-label={`Delete review by ${review.clientName}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-[var(--admin-surface)] px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <TrashSvg className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          FOCUSED REVIEW COMPOSER MODAL (ADD / EDIT)
      ===================================================================== */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 sm:backdrop-blur-xs p-0 sm:p-6"
          onClick={() => !isUploading && !isPending && setComposerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={form.editingId ? 'Edit Client Review' : 'Add Client Review'}
            className="admin-card w-full h-dvh sm:h-auto sm:max-w-4xl sm:max-h-[92vh] rounded-none sm:rounded-xl border-0 sm:border pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--admin-border)]">
              <div>
                <h2 className="admin-section-title text-base sm:text-lg">
                  {form.editingId ? 'Edit Client Review' : 'Add Client Review'}
                </h2>
                <p className="admin-meta">
                  Upload a backdrop portrait and enter the client&apos;s verified quote.
                </p>
              </div>
              <button
                type="button"
                disabled={isUploading || isPending}
                onClick={() => setComposerOpen(false)}
                aria-label="Close review modal"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              id="client-review-form"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-5"
            >
              {modalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300"
                >
                  {modalError}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-12 items-start">
                {/* Left Column: Backdrop Picture Upload + Live Mini Banner Preview */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                        Backdrop Picture *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput((v) => !v)}
                        className="text-[11px] font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] underline cursor-pointer"
                      >
                        {showUrlInput ? 'Hide URL' : 'Paste URL'}
                      </button>
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const droppedFile = e.dataTransfer.files?.[0];
                        void handleUploadPicture(droppedFile);
                      }}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={cn(
                        'rounded-xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer',
                        isDragging
                          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/70 hover:border-[var(--admin-accent)]/60',
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        onChange={(e) => {
                          const selected = e.target.files?.[0];
                          void handleUploadPicture(selected);
                          e.target.value = '';
                        }}
                      />

                      {isUploading ? (
                        <div className="space-y-2 py-4">
                          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--admin-text)]">
                            <RefreshCwIcon className="w-4 h-4 animate-spin text-[var(--admin-accent)]" />
                            Uploading... {uploadProgress}%
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[var(--admin-border)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--admin-accent)] transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : form.imageUrl ? (
                        <div className="space-y-2">
                          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#14110C] border border-[var(--admin-border)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={buildCloudinaryImageUrl(form.imageUrl, {
                                width: 640,
                                crop: 'fill',
                                quality: 'auto',
                              })}
                              alt="Review backdrop preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--admin-muted)]">
                            <span>
                              {form.imageFormat ? form.imageFormat.toUpperCase() : 'Image'}
                              {form.imageBytes ? ` • ${formatBytes(form.imageBytes)}` : ''}
                            </span>
                            <span className="font-semibold text-[var(--admin-accent)] underline">
                              Replace file
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-4">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                            <CameraIcon className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-[var(--admin-text)]">
                            Drop photo or click to upload
                          </p>
                          <p className="text-[11px] text-[var(--admin-muted)]">
                            Landscape couple frame (JPG, PNG, WEBP)
                          </p>
                        </div>
                      )}
                    </div>

                    {galleryImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setGalleryPickerOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                      >
                        <GalleryHorizontalIcon className="w-4 h-4 text-[var(--admin-accent)]" />
                        <span>Choose from Studio Gallery ({galleryImages.length})</span>
                      </button>
                    )}

                    {showUrlInput && (
                      <input
                        type="url"
                        value={form.imageUrl}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            imageUrl: e.target.value,
                            imageAssetId: '',
                            imagePublicId: '',
                            imageFormat: '',
                            imageBytes: null,
                            imageWidth: null,
                            imageHeight: null,
                            imageVersion: null,
                            imageResponseSignature: '',
                          }))
                        }
                        placeholder="https://res.cloudinary.com/.../photo.jpg"
                        className={cn(FIELD_INPUT_CLASS, 'text-xs')}
                      />
                    )}
                  </div>

                  {/* Mini Live Preview */}
                  <div className="rounded-xl border border-[var(--admin-border)] overflow-hidden">
                    <div className="px-3 py-1.5 bg-[var(--admin-surface-subtle)] border-b border-[var(--admin-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                      Live Card Preview
                    </div>
                    <div className="relative h-36 w-full overflow-hidden bg-[#14110C] text-white flex items-center justify-center px-4 text-center">
                      {modalPreviewUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={modalPreviewUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                      )}
                      <div className="absolute inset-0 bg-[#120F0A]/62" />
                      <div className="relative z-10 space-y-1 max-w-full">
                        <p className="font-editorial uppercase tracking-[0.06em] text-xs font-semibold text-white">
                          Client Reviews
                        </p>
                        <p className="text-[11px] text-[#F7F3EA] line-clamp-2">
                          &ldquo; {form.quote.trim() || 'Your client quote appears here...'} &rdquo;
                        </p>
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarSvg
                              key={star}
                              filled={star <= form.rating}
                              className="w-3 h-3"
                            />
                          ))}
                        </div>
                        <p className="text-[11px] font-medium text-[#EFEAE0]">
                          -{form.clientName.trim() || 'Client Name'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Review Text & Metadata Inputs */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="review-client-name"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]"
                    >
                      Client Name *
                    </label>
                    <input
                      id="review-client-name"
                      type="text"
                      required
                      maxLength={120}
                      value={form.clientName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, clientName: e.target.value }))
                      }
                      placeholder="e.g. Tangir Miah"
                      className={FIELD_INPUT_CLASS}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                        Star Rating *
                      </span>
                      <span className="text-xs font-semibold text-[var(--admin-accent)]">
                        {form.rating} / 5 Stars
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3.5 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, rating: star }))}
                          aria-label={`Rate ${star} stars`}
                          className="p-0.5 rounded-md transition-transform hover:scale-110 cursor-pointer"
                        >
                          <StarSvg filled={star <= form.rating} className="w-6 h-6" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="review-quote"
                        className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]"
                      >
                        Review Quote *
                      </label>
                      <span className="text-[11px] text-[var(--admin-muted)]">
                        {form.quote.length} / 600
                      </span>
                    </div>
                    <textarea
                      id="review-quote"
                      required
                      rows={4}
                      maxLength={600}
                      value={form.quote}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, quote: e.target.value }))
                      }
                      placeholder="Riazul Islam Shawon thank you bhaia for these amazing captures"
                      className={cn(FIELD_INPUT_CLASS, 'min-h-[108px] resize-y leading-relaxed')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="review-event-title"
                        className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]"
                      >
                        Event / Occasion (Optional)
                      </label>
                      <input
                        id="review-event-title"
                        type="text"
                        maxLength={140}
                        value={form.eventTitle}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, eventTitle: e.target.value }))
                        }
                        placeholder="e.g. Wedding & Reception"
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="review-source-label"
                        className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]"
                      >
                        Source Label (Optional)
                      </label>
                      <input
                        id="review-source-label"
                        type="text"
                        maxLength={80}
                        value={form.sourceLabel}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, sourceLabel: e.target.value }))
                        }
                        placeholder="e.g. Facebook Review"
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/70 px-4 py-3 cursor-pointer select-none">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--admin-text)]">
                        Publish to Homepage Banner
                      </p>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        Turn off to keep as an internal draft without showing on the live site.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, isPublished: e.target.checked }))
                      }
                      className="h-4 w-4 rounded accent-[var(--admin-accent)]"
                    />
                  </label>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/50">
              <button
                type="button"
                disabled={isUploading || isPending}
                onClick={() => setComposerOpen(false)}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="client-review-form"
                disabled={isPending || isUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] shadow-xs hover:bg-[var(--admin-accent-hover)] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isPending
                  ? form.editingId
                    ? 'Saving...'
                    : 'Publishing...'
                  : form.editingId
                    ? 'Save Changes'
                    : form.isPublished
                      ? 'Publish Review'
                      : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          REUSED STUDIO GALLERY PICKER MODAL
      ===================================================================== */}
      <StudioGalleryPickerModal
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        title="Pick Backdrop from Studio Gallery"
        subtitle="Select an existing couple portrait or wedding frame from Cloudinary."
        actionLabel="Use Picture"
        activeLabel="Selected"
        galleryImages={galleryImages}
        activePublicIds={galleryActiveIds}
        searchQuery={gallerySearch}
        onSearchChange={setGallerySearch}
        landscapeOnly={landscapeOnly}
        onLandscapeOnlyChange={setLandscapeOnly}
        isBusy={isUploading || isPending}
        onPickImage={handlePickFromGallery}
      />
    </div>
  );
}
