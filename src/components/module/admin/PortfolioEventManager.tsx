'use client';

import React, { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Booking,
  EventType,
  PortfolioEventStatus,
  PortfolioMediaItem,
  PortfolioMediaType,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import {
  archivePortfolioEvent,
  createPortfolioEvent,
  createPortfolioEventFromBooking,
  getAdminPortfolioEvent,
  publishPortfolioEvent,
  registerPortfolioMedia,
  removePortfolioMedia,
  reorderPortfolioMedia,
  signPortfolioUpload,
  unpublishPortfolioEvent,
  updatePortfolioEvent,
  updatePortfolioMedia,
} from '@/service/catalog/catalog.service';
import {
  buildCloudinaryImageUrl,
  buildCloudinaryVideoPosterUrl,
} from '@/lib/showcaseMedia';
import {
  ALBUM_THEME_PRESETS,
  AlbumFontStyle,
  AlbumThemeConfig,
  DEFAULT_ALBUM_THEME,
  generateMatchingAlbumTheme,
  parseAlbumDescriptionAndTheme,
  serializeAlbumDescriptionWithTheme,
  shortenTitleToSlug,
} from '@/lib/albumTheme';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { cn, formatLocalDate } from '@/lib/utils';
import { PlusIcon } from '@/components/shared/Icons';
import { PortfolioEventDetailModal } from '../public/PortfolioEventDetailModal';
import { PortfolioEventPageClient } from '../public/PortfolioEventPageClient';

const PREVIEW_ALBUM_BRANDING: PublicBranding = {
  displayName: 'Studio Digital Album',
  logoUrl: null,
  themeTokens: {
    primaryColor: '#0F172A',
    secondaryColor: '#475569',
    accentColor: '#4F46E5',
    backgroundColor: '#FAF8F5',
    textColor: '#1C1917',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  contactDetails: {},
  timezone: 'Asia/Dhaka',
  currency: 'BDT',
};

interface UploadQueueItem {
  localId: string;
  file: File;
  resourceType: PortfolioMediaType;
  format: string;
  progress: number;
  state: 'SIGNING' | 'UPLOADING' | 'REGISTERING' | 'DONE' | 'FAILED';
  errorMessage?: string;
  /** Cached Cloudinary response if upload succeeded before registration */
  cloudinaryResult?: {
    asset_id: string;
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
    duration?: number;
    version?: number;
    signature?: string;
  };
}

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function detectFileFormat(file: File): {
  resourceType: PortfolioMediaType;
  format: string;
} {
  const isVideo =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|mov)$/i.test(file.name);
  const extFromName = file.name.split('.').pop()?.toLowerCase() || '';
  const extFromMime = file.type.split('/').pop()?.toLowerCase() || '';
  const rawFormat = extFromName || extFromMime || (isVideo ? 'mp4' : 'jpg');
  const format = rawFormat === 'quicktime' ? 'mov' : rawFormat === 'jpeg' ? 'jpg' : rawFormat;
  return {
    resourceType: isVideo ? 'VIDEO' : 'IMAGE',
    format,
  };
}

interface PortfolioEventManagerProps {
  initialEvents: PortfolioShowcaseEvent[];
  eventTypes: EventType[];
  galleryMedia?: PortfolioMediaItem[];
  completedBookings?: Booking[];
  initialSelectedEventId?: string;
  mode?: 'portfolio' | 'gallery';
}

export function PortfolioEventManager({
  initialEvents,
  eventTypes,
  galleryMedia = [],
  completedBookings = [],
  initialSelectedEventId,
  mode = 'portfolio',
}: PortfolioEventManagerProps) {
  const isGalleryMode = mode === 'gallery';
  const filteredInitialEvents = initialEvents.filter((e) => !isSystemPortfolioEventSlug(e.slug));
  const [events, setEvents] = useState<PortfolioShowcaseEvent[]>(filteredInitialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    if (
      initialSelectedEventId &&
      filteredInitialEvents.some((e) => e.id === initialSelectedEventId)
    ) {
      return initialSelectedEventId;
    }
    return filteredInitialEvents[0]?.id ?? null;
  });
  const [selectedCompletedBookingId, setSelectedCompletedBookingId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PortfolioEventStatus>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(filteredInitialEvents.length === 0);
  const [previewEvent, setPreviewEvent] = useState<PortfolioShowcaseEvent | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryPickerType, setGalleryPickerType] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [activeEditorTab, setActiveEditorTab] = useState<
    'photos' | 'videos' | 'profile' | 'theme'
  >('photos');
  const [copiedLink, setCopiedLink] = useState<'url' | 'msg' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Draft form state
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newEventTypeId, setNewEventTypeId] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit active event metadata & theme state
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const initialParsed = parseAlbumDescriptionAndTheme(selectedEvent?.description);
  const [editTitle, setEditTitle] = useState(selectedEvent?.title || '');
  const [editSlug, setEditSlug] = useState(selectedEvent?.slug || '');
  const [editDate, setEditDate] = useState(
    selectedEvent?.eventDate ? selectedEvent.eventDate.slice(0, 10) : '',
  );
  const [editLocation, setEditLocation] = useState(selectedEvent?.location || '');
  const [editEventTypeId, setEditEventTypeId] = useState(selectedEvent?.eventTypeId || '');
  const [editDescription, setEditDescription] = useState(initialParsed.cleanDescription);
  const [editTheme, setEditTheme] = useState<AlbumThemeConfig>(initialParsed.theme);
  const [themeHistory, setThemeHistory] = useState<AlbumThemeConfig[]>([]);
  const [generatedThemeName, setGeneratedThemeName] = useState<string | null>(null);
  const [showFullThemePreview, setShowFullThemePreview] = useState(false);

  // Per-file upload queue (keyed by eventId)
  const [uploadQueues, setUploadQueues] = useState<Record<string, UploadQueueItem[]>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline caption / altText draft state per mediaId
  const [mediaEdits, setMediaEdits] = useState<
    Record<string, { caption: string; altText: string }>
  >({});

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

  const copyPortfolioShare = async (slug: string, kind: 'url' | 'msg', title: string) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/album/${slug}`
        : `/album/${slug}`;
    const text =
      kind === 'url'
        ? url
        : `Hi! Your Digital Album for "${title}" is ready to view and share:\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(kind);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      notify('err', 'Could not copy to clipboard.');
    }
  };

  const handleAttachFromGallery = (item: PortfolioMediaItem) => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await registerPortfolioMedia(selectedEvent.id, {
        assetId: item.assetId,
        publicId: item.publicId,
        resourceType: item.resourceType,
        format: item.format,
        secureUrl: item.secureUrl,
        bytes: item.bytes,
        width: item.width ?? undefined,
        height: item.height ?? undefined,
        durationSeconds: item.durationSeconds ?? undefined,
        caption: item.caption ?? undefined,
        altText: item.altText ?? undefined,
      });
      if (!res.ok) {
        notify('err', res.message || 'Could not attach media from Gallery.');
        return;
      }
      await refreshEventInList(selectedEvent.id);
      notify('ok', 'Added media from Studio Gallery to this portfolio.');
    });
  };

  const selectEventForEditing = (ev: PortfolioShowcaseEvent) => {
    const parsed = parseAlbumDescriptionAndTheme(ev.description);
    setSelectedEventId(ev.id);
    setEditTitle(ev.title);
    setEditSlug(ev.slug);
    setEditDate(ev.eventDate ? ev.eventDate.slice(0, 10) : '');
    setEditLocation(ev.location || '');
    setEditEventTypeId(ev.eventTypeId || '');
    setEditDescription(parsed.cleanDescription);
    setEditTheme(parsed.theme);
    setThemeHistory([]);
    setGeneratedThemeName(null);
    setShowCreateForm(false);
  };

  const refreshEventInList = async (eventId: string) => {
    const res = await getAdminPortfolioEvent(eventId);
    if (res.ok && res.data) {
      setEvents((prev) =>
        prev.map((item) => (item.id === eventId ? res.data! : item)),
      );
    }
  };

  const findPortfolioForBooking = (booking: Booking): PortfolioShowcaseEvent | undefined => {
    const refToken = booking.reference.trim();
    const refSuffix = refToken.toLowerCase();
    return events.find(
      (ev) =>
        ev.description?.includes(`[${refToken}]`) ||
        ev.slug === refSuffix ||
        ev.slug.endsWith(`-${refSuffix}`),
    );
  };

  const bookingsAvailableForPortfolio = completedBookings.filter(
    (b) => !findPortfolioForBooking(b),
  );

  const handleCreateFromCompletedBooking = (bookingId: string) => {
    if (!bookingId) {
      notify('err', 'Please select a completed booking event first.');
      return;
    }
    startTransition(async () => {
      const res = await createPortfolioEventFromBooking(bookingId);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to create digital portfolio for this booking.');
        return;
      }
      const created = res.data.event;
      setEvents((prev) =>
        prev.some((ev) => ev.id === created.id)
          ? prev.map((ev) => (ev.id === created.id ? created : ev))
          : [created, ...prev],
      );
      selectEventForEditing(created);
      setSelectedCompletedBookingId('');
      notify(
        'ok',
        res.data.created
          ? `Digital portfolio created from booking "${created.title}". Now upload photos or pick from Studio Gallery.`
          : `Opened existing digital portfolio for "${created.title}" (duplicate prevented).`,
      );
    });
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSlug = (newSlug || slugifyTitle(newTitle)).trim();
    if (!finalSlug) {
      notify('err', 'Please provide a valid URL slug (lowercase letters, numbers, and hyphens).');
      return;
    }

    startTransition(async () => {
      const res = await createPortfolioEvent({
        title: newTitle.trim(),
        slug: finalSlug,
        eventDate: newDate || undefined,
        location: newLocation.trim() || undefined,
        eventTypeId: newEventTypeId || undefined,
        description: newDescription.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to create showcase event draft.');
        return;
      }
      const created = res.data;
      setEvents((prev) => [created, ...prev]);
      selectEventForEditing(created);
      setNewTitle('');
      setNewSlug('');
      setSlugManuallyEdited(false);
      setNewDate('');
      setNewLocation('');
      setNewEventTypeId('');
      setNewDescription('');
      notify('ok', `Draft "${created.title}" created. Now drag & drop photos and highlight videos below.`);
    });
  };

  const handleSaveEventMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    startTransition(async () => {
      const serializedDescription = serializeAlbumDescriptionWithTheme(editDescription, editTheme);
      const res = await updatePortfolioEvent(selectedEvent.id, {
        title: editTitle.trim(),
        slug: editSlug.trim().toLowerCase(),
        eventDate: editDate || undefined,
        location: editLocation.trim() || undefined,
        eventTypeId: editEventTypeId || undefined,
        description: serializedDescription || undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update profile info.');
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === res.data!.id ? res.data! : ev)));
      notify('ok', 'Album profile info & slug saved.');
    });
  };

  const handleAutoGenerateTheme = () => {
    setThemeHistory((prev) => [...prev.slice(-14), editTheme]);
    const preferDynamic = themeHistory.length >= 6 && themeHistory.length % 2 === 1;
    const generated = generateMatchingAlbumTheme(editTheme, preferDynamic);
    setEditTheme(generated.theme);
    setGeneratedThemeName(generated.name);
  };

  const handleUndoGeneratedTheme = () => {
    setThemeHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setEditTheme(last);
      setGeneratedThemeName(null);
      return prev.slice(0, -1);
    });
  };

  const handleSaveThemeSettings = () => {
    if (!selectedEvent) return;

    startTransition(async () => {
      const serializedDescription = serializeAlbumDescriptionWithTheme(editDescription, editTheme);
      const res = await updatePortfolioEvent(selectedEvent.id, {
        description: serializedDescription,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to save album theme.');
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === res.data!.id ? res.data! : ev)));
      setGeneratedThemeName(null);
      setShowFullThemePreview(false);
      notify('ok', 'Custom theme settings saved for this digital album.');
    });
  };

  const updateQueueItem = (
    eventId: string,
    localId: string,
    patch: Partial<UploadQueueItem>,
  ) => {
    setUploadQueues((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    }));
  };

  const removeQueueItem = (eventId: string, localId: string) => {
    setUploadQueues((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).filter((item) => item.localId !== localId),
    }));
  };

  /**
   * Executes direct browser-to-Cloudinary upload with live XHR progress tracking,
   * then registers the uploaded asset in PostgreSQL idempotently.
   */
  const processSingleUpload = async (eventId: string, item: UploadQueueItem) => {
    try {
      let cld = item.cloudinaryResult;

      if (!cld) {
        updateQueueItem(eventId, item.localId, {
          state: 'SIGNING',
          progress: 5,
          errorMessage: undefined,
        });

        const signRes = await signPortfolioUpload(eventId, {
          resourceType: item.resourceType,
          format: item.format,
          bytes: item.file.size,
        });

        if (!signRes.ok || !signRes.data) {
          updateQueueItem(eventId, item.localId, {
            state: 'FAILED',
            errorMessage: signRes.message || 'Upload signature request failed.',
          });
          return;
        }

        const signed = signRes.data;
        updateQueueItem(eventId, item.localId, {
          state: 'UPLOADING',
          progress: 10,
        });

        cld = await new Promise<NonNullable<UploadQueueItem['cloudinaryResult']>>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', signed.uploadUrl, true);

            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable && ev.total > 0) {
                const pct = Math.min(95, Math.max(10, Math.round((ev.loaded / ev.total) * 90)));
                updateQueueItem(eventId, item.localId, { progress: pct });
              }
            };

            xhr.onload = () => {
              try {
                const body = JSON.parse(xhr.responseText || '{}');
                if (xhr.status >= 200 && xhr.status < 300 && body.asset_id && body.public_id) {
                  resolve(body);
                } else {
                  reject(
                    new Error(
                      body?.error?.message ||
                        `Cloudinary upload failed (HTTP ${xhr.status}).`,
                    ),
                  );
                }
              } catch {
                reject(new Error(`Cloudinary upload failed (HTTP ${xhr.status}).`));
              }
            };

            xhr.onerror = () => {
              reject(new Error('Network error while uploading directly to Cloudinary.'));
            };

            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('api_key', signed.apiKey);
            formData.append('timestamp', String(signed.timestamp));
            formData.append('signature', signed.signature);
            formData.append('folder', signed.folder);
            formData.append('allowed_formats', signed.allowedFormats.join(','));
            formData.append('context', signed.context);
            if (signed.uploadPreset) {
              formData.append('upload_preset', signed.uploadPreset);
            }

            xhr.send(formData);
          },
        );

        updateQueueItem(eventId, item.localId, {
          cloudinaryResult: cld,
          progress: 96,
          state: 'REGISTERING',
        });
      } else {
        updateQueueItem(eventId, item.localId, {
          state: 'REGISTERING',
          progress: 96,
          errorMessage: undefined,
        });
      }

      const regRes = await registerPortfolioMedia(eventId, {
        assetId: cld.asset_id,
        publicId: cld.public_id,
        resourceType: item.resourceType,
        format: cld.format || item.format,
        secureUrl: cld.secure_url,
        bytes: cld.bytes || item.file.size,
        width: cld.width,
        height: cld.height,
        durationSeconds: cld.duration,
        status: 'READY',
        version: cld.version,
        responseSignature: cld.signature,
      });

      if (!regRes.ok || !regRes.data) {
        updateQueueItem(eventId, item.localId, {
          state: 'FAILED',
          errorMessage: regRes.message || 'Failed to save uploaded media in database.',
        });
        return;
      }

      updateQueueItem(eventId, item.localId, {
        state: 'DONE',
        progress: 100,
      });

      await refreshEventInList(eventId);
    } catch (err) {
      updateQueueItem(eventId, item.localId, {
        state: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  };

  const enqueueFilesForUpload = (files: FileList | File[]) => {
    if (!selectedEvent) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newItems: UploadQueueItem[] = fileArray.map((file, idx) => {
      const { resourceType, format } = detectFileFormat(file);
      return {
        localId: `${Date.now()}-${idx}-${file.name}`,
        file,
        resourceType,
        format,
        progress: 0,
        state: 'SIGNING',
      };
    });

    setUploadQueues((prev) => ({
      ...prev,
      [selectedEvent.id]: [...(prev[selectedEvent.id] || []), ...newItems],
    }));

    // Upload each file independently in parallel so one failure never blocks or re-uploads others
    for (const item of newItems) {
      void processSingleUpload(selectedEvent.id, item);
    }
  };

  const handleSetCoverImage = (media: PortfolioMediaItem) => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await updatePortfolioMedia(selectedEvent.id, media.id, {
        isCover: true,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to set cover image.');
        return;
      }
      await refreshEventInList(selectedEvent.id);
      notify('ok', 'Cover image updated.');
    });
  };

  const handleSaveMediaDetails = (media: PortfolioMediaItem) => {
    if (!selectedEvent) return;
    const draft = mediaEdits[media.id] ?? {
      caption: media.caption || '',
      altText: media.altText || '',
    };
    startTransition(async () => {
      const res = await updatePortfolioMedia(selectedEvent.id, media.id, {
        caption: draft.caption,
        altText: draft.altText,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to save caption / alt text.');
        return;
      }
      await refreshEventInList(selectedEvent.id);
      notify('ok', 'Media caption & alt text saved.');
    });
  };

  const handleRetryFailedStoredMedia = (media: PortfolioMediaItem) => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await updatePortfolioMedia(selectedEvent.id, media.id, {
        status: 'READY',
        errorMessage: '',
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to retry media processing.');
        return;
      }
      await refreshEventInList(selectedEvent.id);
      notify('ok', 'Media marked READY.');
    });
  };

  const handleMoveMediaOrder = (
    mediaId: string,
    direction: -1 | 1,
    scopeType?: PortfolioMediaType,
  ) => {
    if (!selectedEvent) return;
    const fullList = [...(selectedEvent.media || [])];
    const scopedList = scopeType
      ? fullList.filter((m) => m.resourceType === scopeType)
      : fullList;
    const scopeIdx = scopedList.findIndex((m) => m.id === mediaId);
    const targetScopeIdx = scopeIdx + direction;
    if (scopeIdx === -1 || targetScopeIdx < 0 || targetScopeIdx >= scopedList.length) return;

    const neighborId = scopedList[targetScopeIdx].id;
    const fullIdxA = fullList.findIndex((m) => m.id === mediaId);
    const fullIdxB = fullList.findIndex((m) => m.id === neighborId);
    if (fullIdxA === -1 || fullIdxB === -1) return;

    const swapped = [...fullList];
    const temp = swapped[fullIdxA];
    swapped[fullIdxA] = swapped[fullIdxB];
    swapped[fullIdxB] = temp;

    startTransition(async () => {
      const res = await reorderPortfolioMedia(
        selectedEvent.id,
        swapped.map((m) => m.id),
      );
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to reorder media.');
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === res.data!.id ? res.data! : ev)));
    });
  };

  const handleDeleteMedia = (mediaId: string) => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await removePortfolioMedia(selectedEvent.id, mediaId);
      if (!res.ok) {
        notify('err', res.message || 'Failed to remove media.');
        return;
      }
      await refreshEventInList(selectedEvent.id);
      notify('ok', 'Media removed from event.');
    });
  };

  const handlePublish = () => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await publishPortfolioEvent(selectedEvent.id);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Cannot publish showcase event without a READY cover image.');
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === res.data!.id ? res.data! : ev)));
      notify('ok', `"${res.data.title}" is now PUBLISHED on the public portfolio!`);
    });
  };

  const handleUnpublish = () => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await unpublishPortfolioEvent(selectedEvent.id);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to unpublish event.');
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === res.data!.id ? res.data! : ev)));
      notify('ok', `"${res.data.title}" moved back to DRAFT and removed from public listing.`);
    });
  };

  const handleArchive = () => {
    if (!selectedEvent) return;
    startTransition(async () => {
      const res = await archivePortfolioEvent(selectedEvent.id);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to archive event.');
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === res.data!.id ? res.data! : ev)));
      notify('ok', `"${res.data.title}" archived and removed from public listing.`);
    });
  };

  const filteredEvents = events.filter((ev) =>
    statusFilter === 'ALL' ? true : ev.status === statusFilter,
  );

  const activeQueue = selectedEvent ? uploadQueues[selectedEvent.id] || [] : [];
  const selectedPhotos = (selectedEvent?.media || []).filter((m) => m.resourceType === 'IMAGE');
  const selectedVideos = (selectedEvent?.media || []).filter((m) => m.resourceType === 'VIDEO');
  const galleryFilteredMedia =
    galleryPickerType === 'ALL'
      ? galleryMedia
      : galleryMedia.filter((gm) => gm.resourceType === galleryPickerType);
  const hasReadyCoverImage = Boolean(
    selectedEvent &&
      ((selectedEvent.coverMedia &&
        selectedEvent.coverMedia.resourceType === 'IMAGE' &&
        selectedEvent.coverMedia.status === 'READY') ||
        (selectedEvent.media || []).some(
          (m) => m.resourceType === 'IMAGE' && m.status === 'READY',
        )),
  );

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all';

  return (
    <div className="space-y-6">
      {feedback && (
        <div
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
            className="text-xs underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Bar: Filter Tabs & Create Event Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {st === 'ALL' ? `All Events (${events.length})` : st}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>
            {showCreateForm
              ? 'Close Form'
              : isGalleryMode
                ? 'New Gallery Album'
                : 'Create From Completed Event'}
          </span>
        </button>
      </div>

      {/* Create Portfolio From Completed Booking (Portfolio Mode) OR Free-Form Album (Gallery Mode) */}
      {showCreateForm && !isGalleryMode && (
        <div className="atelier-card p-6 space-y-4 border-indigo-200 bg-indigo-50/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Create Digital Portfolio From Completed Event
              </h3>
              <p className="text-xs text-slate-500">
                Only bookings marked <strong className="text-slate-700">COMPLETED</strong> can have
                a Client Digital Portfolio. Event title, date, category, and venue auto-fill with
                no duplicate records.
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage Bookings →
            </Link>
          </div>

          {completedBookings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-800">
                No completed event bookings available yet
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Open a confirmed booking in{' '}
                <Link href="/admin/bookings" className="text-indigo-600 underline font-medium">
                  Bookings
                </Link>{' '}
                and click <strong>Mark Completed</strong> when the event wraps—then create its
                Digital Portfolio directly from there or select it here.
              </p>
            </div>
          ) : bookingsAvailableForPortfolio.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  Every completed booking ({completedBookings.length}) already has a Digital
                  Portfolio
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Select an existing portfolio from the left sidebar to upload media, set a cover,
                  or share the client link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[260px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Select Completed Event Booking ({bookingsAvailableForPortfolio.length} ready)
                  </label>
                  <select
                    value={selectedCompletedBookingId}
                    onChange={(e) => setSelectedCompletedBookingId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a completed booking...</option>
                    {bookingsAvailableForPortfolio.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.reference} — {b.eventTitle} ({b.clientName}
                        {b.eventDate ? ` • ${formatLocalDate(b.eventDate)}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={isPending || !selectedCompletedBookingId}
                  onClick={() => handleCreateFromCompletedBooking(selectedCompletedBookingId)}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Creating Portfolio...' : '+ Create Portfolio From Booking'}
                </button>
              </div>

              {selectedCompletedBookingId &&
                (() => {
                  const picked = bookingsAvailableForPortfolio.find(
                    (b) => b.id === selectedCompletedBookingId,
                  );
                  if (!picked) return null;
                  return (
                    <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono-code font-semibold text-indigo-700">
                          {picked.reference}
                        </span>{' '}
                        • <strong className="text-slate-900">{picked.eventTitle}</strong> • Client:{' '}
                        {picked.clientName}
                        {picked.eventType ? ` • ${picked.eventType.name}` : ''}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Auto-fills title, date, category &amp; venue
                      </span>
                    </div>
                  );
                })()}
            </div>
          )}
        </div>
      )}

      {showCreateForm && isGalleryMode && (
        <form
          onSubmit={handleCreateDraft}
          className="atelier-card p-6 space-y-4 border-indigo-200 bg-indigo-50/20"
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isGalleryMode ? 'Create New Gallery Album' : 'Create Showcase Event (Draft)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isGalleryMode
                  ? 'Name your album, then drag & drop photos and videos right from your computer.'
                  : 'Create a standalone portfolio event (no customer booking required), then drag & drop photos and highlight videos.'}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isGalleryMode ? 'Album Title *' : 'Event Title *'}
              </label>
              <input
                required
                value={newTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewTitle(val);
                  if (!slugManuallyEdited) {
                    setNewSlug(slugifyTitle(val));
                  }
                }}
                placeholder="e.g. Ayesha & Rafiq Royal Wedding Reception"
                className={inputClass}
              />
            </div>

            {!isGalleryMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  URL Slug *
                </label>
                <input
                  required
                  value={newSlug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setNewSlug(slugifyTitle(e.target.value));
                  }}
                  placeholder="ayesha-rafiq-royal-wedding"
                  className={`${inputClass} font-mono-code`}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={`${inputClass} font-mono-code`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Event Category
              </label>
              <select
                value={newEventTypeId}
                onChange={(e) => setNewEventTypeId(e.target.value)}
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

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Venue / Location
              </label>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Radisson Blu Water Garden, Dhaka"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Story / Description
              </label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe the event atmosphere, lighting, and story highlights..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Create Draft &amp; Open Media Uploader →
            </button>
          </div>
        </form>
      )}

      {/* Main Split Workspace: Event List (Left) + Event Editor & Direct Cloudinary Uploader (Right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Events List */}
        <div className="lg:col-span-4 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="atelier-card p-6 text-center text-xs text-slate-500">
              No client portfolios in this filter.{' '}
              {isGalleryMode
                ? 'Click "New Gallery Album" above to start a draft.'
                : 'Complete a booking event and click "Create From Completed Event" above.'}
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const isSelected = ev.id === selectedEvent?.id;
              const coverThumb =
                ev.coverMedia?.deliveryUrls?.thumbnailUrl ||
                (ev.coverMedia?.secureUrl
                  ? buildCloudinaryImageUrl(ev.coverMedia.secureUrl, {
                      width: 320,
                      height: 200,
                      crop: 'fill',
                    })
                  : '');

              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => selectEventForEditing(ev)}
                  className={cn(
                    'w-full text-left atelier-card p-3.5 flex items-center gap-3.5 transition-all cursor-pointer',
                    isSelected
                      ? 'ring-2 ring-indigo-600 border-indigo-500 bg-indigo-50/20'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <div className="h-16 w-20 shrink-0 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                    {coverThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverThumb}
                        alt={ev.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">No Cover</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          ev.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'ARCHIVED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800',
                        )}
                      >
                        {ev.status}
                      </span>
                      {ev.eventDate && (
                        <span className="text-[11px] font-mono-code text-slate-400">
                          {formatLocalDate(ev.eventDate)}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-slate-900 truncate mt-1">
                      {ev.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ev.counts?.photos ?? 0} Photos • {ev.counts?.videos ?? 0} Videos
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Showcase Event Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedEvent ? (
            <div className="atelier-card p-10 text-center text-sm text-slate-500">
              Select a showcase event on the left or create a new draft above.
            </div>
          ) : (
            <>
              {/* Action Bar & Status Banner */}
              <div className="atelier-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                          selectedEvent.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedEvent.status === 'ARCHIVED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800',
                        )}
                      >
                        {selectedEvent.status}
                      </span>
                      <span className="font-mono-code text-xs text-slate-500">
                        /album/{selectedEvent.slug}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      {selectedEvent.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewEvent(selectedEvent)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      👁 Preview
                    </button>

                    {selectedEvent.status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        disabled={isPending || !hasReadyCoverImage}
                        onClick={handlePublish}
                        title={
                          hasReadyCoverImage
                            ? 'Publish event to public portfolio'
                            : 'Upload at least 1 READY cover image before publishing'
                        }
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        Publish Event ✓
                      </button>
                    )}

                    {selectedEvent.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleUnpublish}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Unpublish (Move to Draft)
                      </button>
                    )}

                    {selectedEvent.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleArchive}
                        className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                {!hasReadyCoverImage && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900">
                    <strong>Publish Requirement:</strong> Upload or pick at least one{' '}
                    <strong>READY cover image</strong> below before publishing this client
                    portfolio link.
                  </div>
                )}

                {/* Shareable Client Digital Album Link Box */}
                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                      Client Digital Album Link
                    </p>
                    <p className="font-mono-code text-xs text-slate-800 break-all mt-0.5">
                      /album/{selectedEvent.slug}{' '}
                      <span className="text-slate-400">(/a/{selectedEvent.slug})</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        void copyPortfolioShare(selectedEvent.slug, 'url', selectedEvent.title)
                      }
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/60 transition-colors cursor-pointer"
                    >
                      {copiedLink === 'url' ? 'Copied Link ✓' : 'Copy Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyPortfolioShare(selectedEvent.slug, 'msg', selectedEvent.title)
                      }
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      {copiedLink === 'msg' ? 'Copied Message ✓' : 'Copy WhatsApp Text'}
                    </button>
                    {selectedEvent.status === 'PUBLISHED' && (
                      <a
                        href={`/album/${selectedEvent.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                      >
                        Open Page ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* 4-Category Navigation Bar (Portfolio Mode) */}
                {!isGalleryMode && (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                    {(
                      [
                        { id: 'photos', label: `Photos (${selectedPhotos.length})` },
                        { id: 'videos', label: `Video / Film (${selectedVideos.length})` },
                        { id: 'profile', label: 'Profile Info' },
                        { id: 'theme', label: 'Theme Settings' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveEditorTab(tab.id)}
                        className={cn(
                          'rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer',
                          activeEditorTab === tab.id
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Helper Block: Direct Cloudinary Uploader + Media List (Used in Photos Tab, Video Tab, or Gallery Mode) */}
              {(isGalleryMode ||
                activeEditorTab === 'photos' ||
                activeEditorTab === 'videos') &&
                (() => {
                  const scopeType: PortfolioMediaType | undefined = isGalleryMode
                    ? undefined
                    : activeEditorTab === 'videos'
                      ? 'VIDEO'
                      : 'IMAGE';
                  const items =
                    scopeType === 'VIDEO'
                      ? selectedVideos
                      : scopeType === 'IMAGE'
                        ? selectedPhotos
                        : selectedEvent.media || [];
                  const scopedQueue = scopeType
                    ? activeQueue.filter((q) => q.resourceType === scopeType)
                    : activeQueue;
                  const galleryMatchesCount = scopeType
                    ? galleryMedia.filter((gm) => gm.resourceType === scopeType).length
                    : galleryMedia.length;
                  const acceptAttr =
                    scopeType === 'IMAGE'
                      ? 'image/jpeg,image/png,image/webp,image/avif,image/heic'
                      : scopeType === 'VIDEO'
                        ? 'video/mp4,video/webm,video/quicktime'
                        : 'image/jpeg,image/png,image/webp,image/avif,image/heic,video/mp4,video/webm,video/quicktime';

                  return (
                    <>
                      {selectedEvent.status !== 'ARCHIVED' && (
                        <div className="atelier-card p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                {scopeType === 'VIDEO'
                                  ? 'Upload Cinematic Highlight Film (Direct to Cloudinary)'
                                  : scopeType === 'IMAGE'
                                    ? 'Upload Event Photos (Direct to Cloudinary)'
                                    : 'Upload Photos & Highlight Videos (Direct to Cloudinary)'}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {scopeType === 'VIDEO'
                                  ? 'Your first video becomes the full-width Featured Cinema Showcase on the client album.'
                                  : 'Drag & drop files for this client album, or pick already-uploaded media from your Studio Gallery.'}
                              </p>
                            </div>
                            {galleryMatchesCount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setGalleryPickerType(scopeType || 'ALL');
                                  setShowGalleryPicker(true);
                                }}
                                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                + Pick{' '}
                                {scopeType === 'VIDEO'
                                  ? 'Films'
                                  : scopeType === 'IMAGE'
                                    ? 'Photos'
                                    : 'From'}{' '}
                                Gallery ({galleryMatchesCount})
                              </button>
                            )}
                          </div>

                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingOver(true);
                            }}
                            onDragLeave={() => setIsDraggingOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingOver(false);
                              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                enqueueFilesForUpload(e.dataTransfer.files);
                              }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              'rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                              isDraggingOver
                                ? 'border-indigo-600 bg-indigo-50/70'
                                : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50',
                            )}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept={acceptAttr}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  enqueueFilesForUpload(e.target.files);
                                  e.target.value = '';
                                }
                              }}
                              className="hidden"
                            />
                            <p className="text-sm font-semibold text-slate-800">
                              Drag &amp; drop{' '}
                              {scopeType === 'VIDEO'
                                ? 'cinematic highlight videos'
                                : scopeType === 'IMAGE'
                                  ? 'high-resolution photos'
                                  : 'photos and highlight videos'}{' '}
                              here, or <span className="text-indigo-600 underline">browse files</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {scopeType === 'VIDEO'
                                ? 'Supported: MP4, WebM, MOV (up to 100 MB)'
                                : scopeType === 'IMAGE'
                                  ? 'Supported: JPG, PNG, WebP, AVIF, HEIC (up to 15 MB)'
                                  : 'Supported: JPG, PNG, WebP, AVIF, HEIC (up to 15 MB) • MP4, WebM, MOV (up to 100 MB)'}
                            </p>
                          </div>

                          {scopedQueue.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Upload Queue ({scopedQueue.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUploadQueues((prev) => ({
                                      ...prev,
                                      [selectedEvent.id]: (prev[selectedEvent.id] || []).filter(
                                        (q) => q.state !== 'DONE',
                                      ),
                                    }))
                                  }
                                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                                >
                                  Clear completed
                                </button>
                              </div>

                              {scopedQueue.map((item) => (
                                <div
                                  key={item.localId}
                                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0 flex items-center gap-2">
                                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono-code text-[10px] font-bold">
                                        {item.resourceType}
                                      </span>
                                      <span className="font-semibold text-slate-900 truncate">
                                        {item.file.name}
                                      </span>
                                      <span className="text-slate-400 font-mono-code">
                                        ({(item.file.size / (1024 * 1024)).toFixed(1)} MB)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'font-semibold',
                                          item.state === 'DONE'
                                            ? 'text-emerald-700'
                                            : item.state === 'FAILED'
                                              ? 'text-rose-700'
                                              : 'text-indigo-700',
                                        )}
                                      >
                                        {item.state === 'DONE'
                                          ? 'READY ✓'
                                          : item.state === 'FAILED'
                                            ? 'FAILED'
                                            : `${item.state} (${item.progress}%)`}
                                      </span>

                                      {item.state === 'FAILED' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void processSingleUpload(selectedEvent.id, item)
                                          }
                                          className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                                        >
                                          Retry Upload
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => removeQueueItem(selectedEvent.id, item.localId)}
                                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>

                                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full transition-all duration-200',
                                        item.state === 'FAILED'
                                          ? 'bg-rose-500'
                                          : item.state === 'DONE'
                                            ? 'bg-emerald-500'
                                            : 'bg-indigo-600',
                                      )}
                                      style={{ width: `${item.progress}%` }}
                                    />
                                  </div>

                                  {item.errorMessage && (
                                    <p className="text-rose-600 font-medium">{item.errorMessage}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="atelier-card p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">
                              {scopeType === 'VIDEO'
                                ? `Album Cinematic Films (${items.length})`
                                : scopeType === 'IMAGE'
                                  ? `Album Photographs (${items.length})`
                                  : `Album Media Items (${items.length})`}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {scopeType === 'VIDEO'
                                ? 'First film is highlighted full-width in the Digital Album cinema showcase.'
                                : 'Choose the cover photograph, edit captions & alt text, and reorder or remove.'}
                            </p>
                          </div>
                        </div>

                        {items.length === 0 ? (
                          <p className="text-xs text-slate-500 py-8 text-center">
                            {scopeType === 'VIDEO'
                              ? 'No videos in this album yet. Upload a cinematic film or pick one from Studio Gallery.'
                              : 'No photos in this album yet. Drag & drop photos above or pick from Studio Gallery.'}
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {items.map((m, idx) => {
                              const isCover = selectedEvent.coverMediaId === m.id;
                              const editState = mediaEdits[m.id] ?? {
                                caption: m.caption || '',
                                altText: m.altText || '',
                              };
                              const thumbUrl =
                                m.resourceType === 'VIDEO'
                                  ? m.deliveryUrls?.posterUrl ||
                                    buildCloudinaryVideoPosterUrl(m.secureUrl, 480)
                                  : m.deliveryUrls?.thumbnailUrl ||
                                    buildCloudinaryImageUrl(m.secureUrl, {
                                      width: 320,
                                      height: 240,
                                      crop: 'fill',
                                    });

                              return (
                                <div key={m.id} className="py-4 flex flex-col sm:flex-row gap-4">
                                  <div className="w-full sm:w-40 h-28 shrink-0 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-200">
                                    {thumbUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={thumbUrl}
                                        alt={m.altText || m.caption || selectedEvent.title}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                        {m.resourceType}
                                      </div>
                                    )}
                                    <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono-code font-bold text-white">
                                      #{idx + 1} • {m.resourceType}
                                    </span>
                                    {isCover && (
                                      <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                                        ★ Cover Photo
                                      </span>
                                    )}
                                    {m.resourceType === 'VIDEO' && idx === 0 && (
                                      <span className="absolute bottom-2 left-2 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                                        ★ Featured Film
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span
                                          className={cn(
                                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                                            m.status === 'READY'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : m.status === 'FAILED'
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-amber-100 text-amber-800',
                                          )}
                                        >
                                          {m.status}
                                        </span>
                                        <span className="font-mono-code text-slate-500">
                                          {m.format.toUpperCase()}
                                          {m.width && m.height ? ` • ${m.width}×${m.height}` : ''}
                                          {m.durationSeconds
                                            ? ` • ${Math.round(m.durationSeconds)}s`
                                            : ''}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {m.resourceType === 'IMAGE' &&
                                          m.status === 'READY' &&
                                          !isCover && (
                                            <button
                                              type="button"
                                              disabled={isPending}
                                              onClick={() => handleSetCoverImage(m)}
                                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                            >
                                              Set as Cover
                                            </button>
                                          )}

                                        {m.status === 'FAILED' && (
                                          <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => handleRetryFailedStoredMedia(m)}
                                            className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                                          >
                                            Retry Processing
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          disabled={isPending || idx === 0}
                                          onClick={() => handleMoveMediaOrder(m.id, -1, scopeType)}
                                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-35"
                                          title="Move earlier"
                                        >
                                          ↑
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isPending || idx === items.length - 1}
                                          onClick={() => handleMoveMediaOrder(m.id, 1, scopeType)}
                                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-35"
                                          title="Move later"
                                        >
                                          ↓
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isPending}
                                          onClick={() => handleDeleteMedia(m.id)}
                                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid sm:grid-cols-12 gap-2 items-center">
                                      <input
                                        value={editState.caption}
                                        onChange={(e) =>
                                          setMediaEdits((prev) => ({
                                            ...prev,
                                            [m.id]: { ...editState, caption: e.target.value },
                                          }))
                                        }
                                        placeholder={
                                          m.resourceType === 'VIDEO'
                                            ? 'Film title / caption'
                                            : 'Caption (shown in lightbox)'
                                        }
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:col-span-5"
                                      />
                                      <input
                                        value={editState.altText}
                                        onChange={(e) =>
                                          setMediaEdits((prev) => ({
                                            ...prev,
                                            [m.id]: { ...editState, altText: e.target.value },
                                          }))
                                        }
                                        placeholder="Alt text (accessibility & SEO)"
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:col-span-5"
                                      />
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => handleSaveMediaDetails(m)}
                                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 sm:col-span-2"
                                      >
                                        Save Text
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

              {/* Category 3: Profile Info Tab */}
              {!isGalleryMode && activeEditorTab === 'profile' && (
                <form onSubmit={handleSaveEventMetadata} className="atelier-card p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Album Profile Info</h3>
                    <p className="text-xs text-slate-500">
                      Customize the album title and short share URL. Internal notes are never shown
                      on the client Digital Album page.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Album Title
                      </label>
                      <input
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold uppercase text-slate-500">
                          Short URL Slug (/album/...)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const shortened = shortenTitleToSlug(editTitle || editSlug);
                            if (shortened) setEditSlug(shortened);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Auto-Shorten URL
                        </button>
                      </div>
                      <input
                        required
                        value={editSlug}
                        onChange={(e) => setEditSlug(slugifyTitle(e.target.value))}
                        className={`${inputClass} font-mono-code`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Event Date (Admin Ref)
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className={`${inputClass} font-mono-code`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Category (Admin Ref)
                      </label>
                      <select
                        value={editEventTypeId}
                        onChange={(e) => setEditEventTypeId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">None</option>
                        {eventTypes.map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Venue / Location (Admin Ref)
                      </label>
                      <input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Venue or city"
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Internal Admin Notes
                      </label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Save Profile Info
                    </button>
                  </div>
                </form>
              )}

              {/* Category 4: Per-Album Theme Settings Tab */}
              {!isGalleryMode && activeEditorTab === 'theme' && (() => {
                const savedThemeConfig = parseAlbumDescriptionAndTheme(selectedEvent.description).theme;
                const hasUnsavedTheme =
                  JSON.stringify(editTheme) !== JSON.stringify(savedThemeConfig);
                const previewCover =
                  selectedEvent.coverMedia ||
                  selectedPhotos[0] ||
                  null;
                const previewCoverUrl = previewCover
                  ? buildCloudinaryImageUrl(previewCover.secureUrl, { width: 480, crop: 'limit' })
                  : '';
                const previewGridThumbs = selectedPhotos.slice(0, 3);

                return (
                  <div className="atelier-card p-5 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Digital Album Theme Settings
                          </h3>
                          {hasUnsavedTheme && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                              Unsaved Preview
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Auto-generate harmonious color + typography pairings, preview live with
                          this client&apos;s real photos, and save the one you love.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAutoGenerateTheme}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          <span>✨ Auto-Generate Theme</span>
                        </button>

                        {themeHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={handleUndoGeneratedTheme}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            ← Previous
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowFullThemePreview(true)}
                          className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          👁 Full-Screen Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setThemeHistory((prev) => [...prev.slice(-14), editTheme]);
                            setEditTheme({ ...DEFAULT_ALBUM_THEME });
                            setGeneratedThemeName(null);
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>

                    {generatedThemeName && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-indigo-950">
                          ✨ Generated Palette: <strong>{generatedThemeName}</strong>
                        </span>
                        <span className="text-indigo-700">
                          Click &ldquo;Auto-Generate Theme&rdquo; again to try another, or save
                          below when ready.
                        </span>
                      </div>
                    )}

                    {/* Rich Visual Live Client Album Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Live Album Preview ({editTheme.isDark ? 'Dark Cinema' : 'Daylight'} •{' '}
                          {editTheme.fontStyle === 'serif' ? 'Editorial Serif' : 'Modern Sans'})
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowFullThemePreview(true)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Expand Full Album Preview ⤢
                        </button>
                      </div>

                      <div
                        style={{
                          backgroundColor: editTheme.bg,
                          color: editTheme.text,
                        }}
                        className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-colors duration-300"
                      >
                        {/* Mini Top Bar */}
                        <div
                          style={{
                            borderColor: editTheme.isDark
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.08)',
                          }}
                          className="border-b px-4 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-[0.22em] opacity-65">
                              Digital Album
                            </p>
                            <p className="text-xs font-semibold truncate">{selectedEvent.title}</p>
                          </div>
                          <span
                            style={{ backgroundColor: editTheme.accent, color: '#FFFFFF' }}
                            className="rounded-full px-3 py-1 text-[10px] font-semibold shrink-0"
                          >
                            Share Album
                          </span>
                        </div>

                        {/* Mini Framed Cover Hero */}
                        <div
                          style={{ backgroundColor: editTheme.surface }}
                          className="p-4 sm:p-5 grid sm:grid-cols-12 gap-4 items-center"
                        >
                          <div className="sm:col-span-5 flex justify-center">
                            {previewCoverUrl ? (
                              <div
                                style={{ backgroundColor: editTheme.bg }}
                                className="rounded-xl p-1.5 border border-black/10 shadow-md max-w-[200px]"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previewCoverUrl}
                                  alt=""
                                  className="w-full h-28 object-cover rounded-lg"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-28 rounded-xl border border-dashed border-current/25 flex items-center justify-center text-[11px] opacity-60">
                                Cover Photo Preview
                              </div>
                            )}
                          </div>

                          <div className="sm:col-span-7 space-y-2.5 text-center sm:text-left">
                            <p className="text-[9px] uppercase tracking-[0.26em] opacity-65">
                              Digital Photo &amp; Film Album
                            </p>
                            <p
                              style={{
                                fontFamily:
                                  editTheme.fontStyle === 'serif'
                                    ? 'var(--font-album-serif), Georgia, serif'
                                    : 'var(--font-sans), sans-serif',
                              }}
                              className="text-lg sm:text-xl font-semibold leading-tight line-clamp-2"
                            >
                              {selectedEvent.title}
                            </p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                              <span
                                style={{ backgroundColor: editTheme.accent, color: '#FFFFFF' }}
                                className="rounded-full px-3.5 py-1 text-[10px] font-semibold"
                              >
                                ▶ Watch Cinematic Film
                              </span>
                              <span className="rounded-full border border-current/25 px-3 py-1 text-[10px] font-medium opacity-85">
                                Browse Photo Grid ↓
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mini Photo Grid Row */}
                        {previewGridThumbs.length > 0 && (
                          <div className="p-4 grid grid-cols-3 gap-2.5">
                            {previewGridThumbs.map((photo) => {
                              const tUrl = buildCloudinaryImageUrl(photo.secureUrl, {
                                width: 320,
                                height: 220,
                                crop: 'fill',
                              });
                              return (
                                <div
                                  key={photo.id}
                                  style={{ backgroundColor: editTheme.surface }}
                                  className="rounded-lg overflow-hidden border border-black/10 aspect-[4/3]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={tUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preset Palettes Grid */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Signature Studio Presets
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ALBUM_THEME_PRESETS.map((preset) => {
                          const isSelected = editTheme.preset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setThemeHistory((prev) => [...prev.slice(-14), editTheme]);
                                setEditTheme({
                                  preset: preset.id,
                                  bg: preset.bg,
                                  surface: preset.surface,
                                  text: preset.text,
                                  accent: preset.accent,
                                  isDark: preset.isDark,
                                  fontStyle: preset.fontStyle,
                                });
                                setGeneratedThemeName(preset.name);
                              }}
                              className={cn(
                                'text-left rounded-xl border p-3.5 transition-all cursor-pointer space-y-2',
                                isSelected
                                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/30'
                                  : 'border-slate-200 bg-white hover:border-slate-300',
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {preset.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {[preset.bg, preset.surface, preset.accent].map((hex, i) => (
                                    <span
                                      key={i}
                                      style={{ backgroundColor: hex }}
                                      className="h-4 w-4 rounded-full border border-slate-300/80 shadow-2xs"
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500">{preset.tagline}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Fine-Tuning Color Pickers + Typography */}
                    <div className="grid sm:grid-cols-2 gap-4 pt-1">
                      {(
                        [
                          { key: 'bg', label: 'Page Background Color' },
                          { key: 'surface', label: 'Hero & Card Surface Color' },
                          { key: 'text', label: 'Heading & Text Color' },
                          { key: 'accent', label: 'Primary Accent & Buttons' },
                        ] as const
                      ).map((field) => (
                        <div
                          key={field.key}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-slate-800">
                              {field.label}
                            </label>
                            <span className="font-mono-code text-[11px] text-slate-500">
                              {editTheme[field.key]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editTheme[field.key]}
                              onChange={(e) => {
                                setGeneratedThemeName('Custom');
                                setEditTheme((prev) => ({
                                  ...prev,
                                  preset: 'custom',
                                  [field.key]: e.target.value.toUpperCase(),
                                }));
                              }}
                              className="h-8 w-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-800">Heading Font Style</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              { id: 'serif', label: 'Editorial Serif' },
                              { id: 'sans', label: 'Modern Sans' },
                            ] as { id: AlbumFontStyle; label: string }[]
                          ).map((fontOpt) => (
                            <button
                              key={fontOpt.id}
                              type="button"
                              onClick={() =>
                                setEditTheme((prev) => ({ ...prev, fontStyle: fontOpt.id }))
                              }
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                                editTheme.fontStyle === fontOpt.id
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                              )}
                            >
                              {fontOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-800">
                          Default Brightness Mode
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { val: false, label: '☀ Daylight' },
                            { val: true, label: '☾ Dark Cinema' },
                          ].map((modeOpt) => (
                            <button
                              key={String(modeOpt.val)}
                              type="button"
                              onClick={() =>
                                setEditTheme((prev) => ({
                                  ...prev,
                                  preset: 'custom',
                                  isDark: modeOpt.val,
                                }))
                              }
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                                editTheme.isDark === modeOpt.val
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                              )}
                            >
                              {modeOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        {hasUnsavedTheme
                          ? 'Previewing unsaved theme — click Save Theme Settings to publish this look.'
                          : 'Saved theme is currently active on the client album.'}
                      </span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleSaveThemeSettings}
                        className={cn(
                          'rounded-xl px-5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer',
                          hasUnsavedTheme
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                            : 'bg-indigo-600 hover:bg-indigo-700',
                        )}
                      >
                        {isPending ? 'Saving Theme...' : 'Save Theme Settings ✓'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Full-Screen Live Digital Album Theme Preview Modal */}
      {showFullThemePreview && selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 overflow-hidden"
        >
          <div className="shrink-0 border-b border-white/15 bg-slate-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-950">
                Theme Preview
              </span>
              <span className="text-xs font-medium truncate">
                {generatedThemeName || editTheme.preset} • {selectedEvent.title}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAutoGenerateTheme}
                className="rounded-xl bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 cursor-pointer"
              >
                ✨ Try Another Theme
              </button>
              {themeHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoGeneratedTheme}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                >
                  ← Previous
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveThemeSettings}
                className="rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                {isPending ? 'Saving...' : 'Save This Theme ✓'}
              </button>
              <button
                type="button"
                onClick={() => setShowFullThemePreview(false)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto album-preview-isolated">
            <PortfolioEventPageClient
              key={`${selectedEvent.id}-${JSON.stringify(editTheme)}`}
              event={{
                ...selectedEvent,
                description: serializeAlbumDescriptionWithTheme(editDescription, editTheme),
              }}
              branding={PREVIEW_ALBUM_BRANDING}
            />
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewEvent && (
        <div className="album-preview-isolated">
          <PortfolioEventDetailModal
            event={previewEvent}
            isPreview
            onClose={() => setPreviewEvent(null)}
          />
        </div>
      )}

      {/* Pick From Studio Gallery Modal (Filtered cleanly by Photos / Video tab) */}
      {showGalleryPicker && selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGalleryPicker(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pick{' '}
                  {galleryPickerType === 'IMAGE'
                    ? 'Photos'
                    : galleryPickerType === 'VIDEO'
                      ? 'Cinematic Films'
                      : 'Photos & Videos'}{' '}
                  From Studio Gallery
                </h3>
                <p className="text-xs text-slate-500">
                  Click any item to add it to &ldquo;{selectedEvent.title}&rdquo;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryPicker(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕ Done
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryFilteredMedia.map((gm) => {
                const alreadyAdded = (selectedEvent.media || []).some(
                  (m) => m.publicId === gm.publicId,
                );
                const thumbUrl =
                  gm.resourceType === 'VIDEO'
                    ? gm.deliveryUrls?.posterUrl || buildCloudinaryVideoPosterUrl(gm.secureUrl, 320)
                    : gm.deliveryUrls?.thumbnailUrl ||
                      buildCloudinaryImageUrl(gm.secureUrl, {
                        width: 320,
                        height: 240,
                        crop: 'fill',
                      });
                return (
                  <button
                    key={gm.id}
                    type="button"
                    disabled={alreadyAdded || isPending}
                    onClick={() => handleAttachFromGallery(gm)}
                    className={cn(
                      'group relative rounded-xl border overflow-hidden text-left transition-all',
                      alreadyAdded
                        ? 'border-emerald-300 bg-emerald-50/40 opacity-75 cursor-default'
                        : 'border-slate-200 hover:border-indigo-400 cursor-pointer',
                    )}
                  >
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {gm.resourceType === 'VIDEO' ? '▶ Video' : 'Photo'}
                      </span>
                    </div>
                    <div className="p-2 flex items-center justify-between gap-1 text-[11px]">
                      <span className="truncate font-medium text-slate-800">
                        {gm.caption || gm.format.toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 font-semibold',
                          alreadyAdded ? 'text-emerald-700' : 'text-indigo-600',
                        )}
                      >
                        {alreadyAdded ? 'Added ✓' : '+ Add'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
