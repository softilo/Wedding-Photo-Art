'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import {
  CloudinaryStatusSummary,
  PortfolioMediaItem,
  PortfolioMediaType,
} from '@/types/event-management';
import {
  deleteGalleryMedia,
  listGalleryMedia,
  registerGalleryMedia,
  signGalleryUpload,
  updateGalleryMedia,
} from '@/service/catalog/catalog.service';
import {
  buildCloudinaryImageUrl,
  buildCloudinaryVideoPosterUrl,
} from '@/lib/showcaseMedia';
import { cn, formatLocalDate } from '@/lib/utils';
import { SearchIcon } from '@/components/shared/Icons';

interface UploadQueueItem {
  localId: string;
  file: File;
  resourceType: PortfolioMediaType;
  format: string;
  progress: number;
  state: 'SIGNING' | 'UPLOADING' | 'REGISTERING' | 'DONE' | 'FAILED';
  errorMessage?: string;
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

function detectFileFormat(file: File): {
  resourceType: PortfolioMediaType;
  format: string;
} {
  const isVideo =
    file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
  const extFromName = file.name.split('.').pop()?.toLowerCase() || '';
  const extFromMime = file.type.split('/').pop()?.toLowerCase() || '';
  const rawFormat = extFromName || extFromMime || (isVideo ? 'mp4' : 'jpg');
  const format = rawFormat === 'quicktime' ? 'mov' : rawFormat === 'jpeg' ? 'jpg' : rawFormat;
  return {
    resourceType: isVideo ? 'VIDEO' : 'IMAGE',
    format,
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface GalleryMediaManagerProps {
  initialMedia: PortfolioMediaItem[];
  cloudinaryStatus: CloudinaryStatusSummary | null;
}

export function GalleryMediaManager({
  initialMedia,
  cloudinaryStatus,
}: GalleryMediaManagerProps) {
  const [mediaItems, setMediaItems] = useState<PortfolioMediaItem[]>(initialMedia);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const photoCount = useMemo(
    () => mediaItems.filter((m) => m.resourceType === 'IMAGE').length,
    [mediaItems],
  );
  const videoCount = useMemo(
    () => mediaItems.filter((m) => m.resourceType === 'VIDEO').length,
    [mediaItems],
  );

  const filteredMedia = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mediaItems.filter((m) => {
      if (categoryFilter !== 'ALL' && m.resourceType !== categoryFilter) return false;
      if (!q) return true;
      const name = (m.caption || m.altText || m.publicId || '').toLowerCase();
      return name.includes(q) || m.format.toLowerCase().includes(q);
    });
  }, [mediaItems, categoryFilter, searchQuery]);

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(
    initialMedia[0]?.id ?? null,
  );

  const selectedMedia =
    filteredMedia.find((m) => m.id === selectedMediaId) ??
    mediaItems.find((m) => m.id === selectedMediaId) ??
    filteredMedia[0] ??
    null;

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

  const refreshGallery = async () => {
    const res = await listGalleryMedia();
    if (res.ok && res.data) {
      setMediaItems(res.data.data);
    }
  };

  const updateQueueItem = (localId: string, patch: Partial<UploadQueueItem>) => {
    setUploadQueue((prev) =>
      prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q)),
    );
  };

  const processSingleUpload = async (item: UploadQueueItem) => {
    let cloudResult = item.cloudinaryResult;

    if (!cloudResult) {
      updateQueueItem(item.localId, { state: 'SIGNING', progress: 5, errorMessage: undefined });

      const signRes = await signGalleryUpload({
        resourceType: item.resourceType,
        format: item.format,
        bytes: item.file.size,
      });

      if (!signRes.ok || !signRes.data) {
        updateQueueItem(item.localId, {
          state: 'FAILED',
          errorMessage:
            signRes.message ||
            'Could not authorize Cloudinary upload. Check Cloudinary credentials in backend .env.',
        });
        return;
      }

      const signed = signRes.data;
      updateQueueItem(item.localId, { state: 'UPLOADING', progress: 10 });

      try {
        cloudResult = await new Promise<UploadQueueItem['cloudinaryResult']>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', signed.uploadUrl);
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.min(92, Math.max(10, Math.round((evt.loaded / evt.total) * 90)));
              updateQueueItem(item.localId, { progress: pct });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error('Invalid Cloudinary response'));
              }
            } else {
              let msg = `Cloudinary upload failed (${xhr.status})`;
              try {
                const body = JSON.parse(xhr.responseText || '{}');
                if (body?.error?.message) msg = body.error.message;
              } catch {
                // keep default message
              }
              reject(new Error(msg));
            }
          };
          xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary'));

          const form = new FormData();
          form.append('file', item.file);
          form.append('api_key', signed.apiKey);
          form.append('timestamp', String(signed.timestamp));
          form.append('signature', signed.signature);
          form.append('folder', signed.folder);
          form.append('allowed_formats', signed.allowedFormats.join(','));
          form.append('context', signed.context);
          if (signed.uploadPreset) {
            form.append('upload_preset', signed.uploadPreset);
          }
          xhr.send(form);
        });
      } catch (err) {
        updateQueueItem(item.localId, {
          state: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Upload failed',
        });
        return;
      }

      updateQueueItem(item.localId, { cloudinaryResult: cloudResult });
    }

    if (!cloudResult) return;

    updateQueueItem(item.localId, { state: 'REGISTERING', progress: 95 });
    const cleanFileName = item.file.name.replace(/\.[^/.]+$/, '');
    const regRes = await registerGalleryMedia({
      assetId: cloudResult.asset_id,
      publicId: cloudResult.public_id,
      resourceType: item.resourceType,
      format: cloudResult.format || item.format,
      secureUrl: cloudResult.secure_url,
      bytes: cloudResult.bytes ?? item.file.size,
      width: cloudResult.width,
      height: cloudResult.height,
      durationSeconds: cloudResult.duration,
      version: cloudResult.version,
      responseSignature: cloudResult.signature,
      caption: cleanFileName,
      altText: cleanFileName,
    });

    if (!regRes.ok || !regRes.data) {
      updateQueueItem(item.localId, {
        state: 'FAILED',
        errorMessage: regRes.message || 'Failed to save uploaded media',
      });
      return;
    }

    updateQueueItem(item.localId, { state: 'DONE', progress: 100 });
    await refreshGallery();
    setSelectedMediaId(regRes.data.media.id);
    setCaptionDraft(null);
  };

  const enqueueFilesForUpload = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const newItems: UploadQueueItem[] = files.map((file) => {
      const { resourceType, format } = detectFileFormat(file);
      return {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        resourceType,
        format,
        progress: 0,
        state: 'SIGNING',
      };
    });

    setUploadQueue((prev) => [...newItems, ...prev]);
    for (const item of newItems) {
      void processSingleUpload(item);
    }
  };

  const handleSelectRow = (item: PortfolioMediaItem) => {
    setSelectedMediaId(item.id);
    setCaptionDraft(null);
    setCopiedUrl(false);
  };

  const handleSaveCaption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia) return;
    const nextCaption = (captionDraft ?? selectedMedia.caption ?? '').trim();
    startTransition(async () => {
      const res = await updateGalleryMedia(selectedMedia.id, {
        caption: nextCaption || undefined,
        altText: nextCaption || undefined,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to update label');
        return;
      }
      await refreshGallery();
      setCaptionDraft(null);
      notify('ok', 'Media label updated.');
    });
  };

  const handleDeleteMedia = (item: PortfolioMediaItem) => {
    startTransition(async () => {
      const res = await deleteGalleryMedia(item.id);
      if (!res.ok) {
        notify('err', res.message || 'Failed to delete media');
        return;
      }
      await refreshGallery();
      if (selectedMedia?.id === item.id) {
        setSelectedMediaId(null);
      }
      notify('ok', 'Deleted from gallery and Cloudinary.');
    });
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const isCloudinaryReady = cloudinaryStatus?.configured !== false;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title">
            Gallery — Photo &amp; Video Upload
          </h1>
          <p className="admin-meta mt-1">
            Drag &amp; drop photos or videos to upload directly to Cloudinary. Click any row in the
            table to preview it on the right.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200 cursor-pointer"
        >
          <span>+ Upload Photo / Video</span>
        </button>
      </div>

      {!isCloudinaryReady && cloudinaryStatus && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-xs text-amber-950 space-y-1">
          <p className="font-semibold text-sm">Cloudinary Setup Required in Backend `.env`</p>
          <p>
            Replace the placeholder values in{' '}
            <code className="font-mono-code bg-white/80 px-1.5 py-0.5 rounded">
              event-management-server/.env
            </code>{' '}
            for:{' '}
            <span className="font-mono-code font-semibold">
              {cloudinaryStatus.missingVariables.join(', ')}
            </span>
            , then restart the backend server to enable live photo and video uploads.
          </p>
        </div>
      )}

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

      {/* Drag & Drop File Upload Zone (Photos & Videos directly to Cloudinary) */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
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
            'rounded-2xl border-2 border-dashed px-6 py-7 text-center cursor-pointer transition-all duration-200',
            isDraggingOver
              ? 'border-primary bg-indigo-50/70'
              : 'border-slate-300 bg-slate-50/60 hover:border-primary/60 hover:bg-slate-50',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,video/mp4,video/webm,video/quicktime"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                enqueueFilesForUpload(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
          <p className="text-sm font-semibold text-slate-900">
            Drag &amp; drop photos and videos here, or{' '}
            <span className="text-primary underline underline-offset-4">browse files</span>
          </p>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Uploads directly to Cloudinary • Photos: JPG, PNG, WebP, AVIF, HEIC (up to 15 MB) •
            Videos: MP4, WebM, MOV (up to 100 MB)
          </p>
        </div>

        {/* Live Upload Progress Queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Upload Queue ({uploadQueue.length})
              </span>
              <button
                type="button"
                onClick={() => setUploadQueue((prev) => prev.filter((q) => q.state !== 'DONE'))}
                className="text-xs text-muted-foreground hover:text-slate-900 underline"
              >
                Clear completed
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {uploadQueue.map((item) => (
                <div
                  key={item.localId}
                  className="rounded-xl border border-border/60 bg-slate-50/60 p-3 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="rounded-md bg-white border border-border/60 px-2 py-0.5 font-mono-code text-[11px] font-semibold">
                        {item.resourceType === 'VIDEO' ? 'VIDEO' : 'PHOTO'}
                      </span>
                      <span className="font-medium text-slate-900 truncate">{item.file.name}</span>
                    </div>
                    <span
                      className={cn(
                        'font-semibold shrink-0',
                        item.state === 'DONE'
                          ? 'text-emerald-700'
                          : item.state === 'FAILED'
                            ? 'text-rose-700'
                            : 'text-primary',
                      )}
                    >
                      {item.state === 'DONE'
                        ? 'Uploaded ✓'
                        : item.state === 'FAILED'
                          ? 'Failed'
                          : `${item.progress}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-200',
                        item.state === 'FAILED'
                          ? 'bg-rose-500'
                          : item.state === 'DONE'
                            ? 'bg-emerald-500'
                            : 'bg-primary',
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.errorMessage && (
                    <div className="flex items-center justify-between gap-2 text-rose-600">
                      <span className="truncate">{item.errorMessage}</span>
                      <button
                        type="button"
                        onClick={() => void processSingleUpload(item)}
                        className="underline font-semibold shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs (Photo / Video) + Search */}
      <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center overflow-x-auto no-scrollbar max-w-full sm:inline-flex rounded-xl border border-border/60 bg-slate-50/80 p-1 gap-1">
          {[
            { id: 'ALL' as const, label: `All (${mediaItems.length})` },
            { id: 'IMAGE' as const, label: `Photo (${photoCount})` },
            { id: 'VIDEO' as const, label: `Video (${videoCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={cn(
                'flex-1 sm:flex-initial text-center rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200 cursor-pointer',
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search uploaded photo or video..."
            className="w-full h-9 sm:h-auto rounded-xl border border-border/60 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
      </div>

      {/* Split Section: Left Table List + Right Live Preview */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: Table List */}
        <div className="lg:col-span-7 rounded-2xl border border-border/60 bg-card overflow-hidden">
          {filteredMedia.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-900">No media files yet</p>
              <p className="text-xs text-muted-foreground font-medium">
                Drag and drop photos or videos above to upload them to Cloudinary.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-slate-50/80 text-xs font-medium text-muted-foreground">
                    <th className="py-3 px-3 sm:px-4">File</th>
                    <th className="hidden sm:table-cell py-3 px-3">Category</th>
                    <th className="hidden md:table-cell py-3 px-3">Size</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredMedia.map((item) => {
                    const isSelected = selectedMedia?.id === item.id;
                    const thumbUrl =
                      item.resourceType === 'VIDEO'
                        ? item.deliveryUrls?.posterUrl ||
                          buildCloudinaryVideoPosterUrl(item.secureUrl, 240)
                        : item.deliveryUrls?.thumbnailUrl ||
                          buildCloudinaryImageUrl(item.secureUrl, {
                            width: 160,
                            height: 120,
                            crop: 'fill',
                          });
                    const displayTitle =
                      item.caption || item.altText || item.publicId.split('/').pop() || 'Untitled';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectRow(item)}
                        className={cn(
                          'cursor-pointer transition-colors duration-150',
                          isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/80',
                        )}
                      >
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-14 shrink-0 rounded-lg bg-slate-100 border border-border/60 overflow-hidden relative flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={thumbUrl}
                                alt={displayTitle}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                              {item.resourceType === 'VIDEO' && (
                                <span className="absolute inset-0 flex items-center justify-center bg-slate-900/35 text-white text-[10px] font-bold">
                                  ▶
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[155px] sm:max-w-[200px]">
                                {displayTitle}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">
                                {item.format.toUpperCase()} • {formatLocalDate(item.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell py-3 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              item.resourceType === 'VIDEO'
                                ? 'bg-amber-50/80 text-amber-700 ring-amber-600/20'
                                : 'bg-indigo-50/80 text-indigo-700 ring-indigo-600/20',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                item.resourceType === 'VIDEO' ? 'bg-amber-500' : 'bg-indigo-500',
                              )}
                            />
                            {item.resourceType === 'VIDEO' ? 'Video' : 'Photo'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell py-3 px-3 font-mono-code text-xs text-muted-foreground tabular-nums">
                          {formatBytes(item.bytes)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMedia(item);
                            }}
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Live Photo / Video Preview */}
        <div className="lg:col-span-5 rounded-2xl border border-border/60 bg-card p-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-sm font-medium text-slate-900">
              {selectedMedia
                ? selectedMedia.resourceType === 'VIDEO'
                  ? 'Video Preview'
                  : 'Photo Preview'
                : 'Preview'}
            </h2>
            {selectedMedia && (
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-xs text-muted-foreground font-medium">
                  {selectedMedia.format.toUpperCase()} • {formatBytes(selectedMedia.bytes)}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl(selectedMedia.secureUrl)}
                  className="rounded-lg border border-border/60 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {copiedUrl ? 'Copied ✓' : 'Copy Link'}
                </button>
              </div>
            )}
          </div>

          {!selectedMedia ? (
            <div className="aspect-[4/3] rounded-xl border border-dashed border-border/60 bg-slate-50/60 flex items-center justify-center text-xs text-muted-foreground font-medium p-6 text-center">
              Select a photo or video from the table on the left to preview it here.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-950 overflow-hidden border border-border/60">
                {selectedMedia.resourceType === 'VIDEO' ? (
                  <video
                    key={selectedMedia.id}
                    src={selectedMedia.secureUrl}
                    poster={
                      selectedMedia.deliveryUrls?.posterUrl ||
                      buildCloudinaryVideoPosterUrl(selectedMedia.secureUrl, 720)
                    }
                    controls
                    playsInline
                    className="w-full max-h-[360px] object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buildCloudinaryImageUrl(selectedMedia.secureUrl, {
                      width: 1000,
                      crop: 'limit',
                    })}
                    alt={selectedMedia.caption || selectedMedia.altText || 'Gallery photo preview'}
                    className="w-full max-h-[360px] object-contain bg-slate-100"
                  />
                )}
              </div>

              <form onSubmit={handleSaveCaption} className="space-y-2">
                <label className="block text-xs text-muted-foreground font-medium">
                  Title / Label
                </label>
                <div className="flex gap-2">
                  <input
                    value={captionDraft ?? selectedMedia.caption ?? ''}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    placeholder="Add a short label..."
                    className="flex-1 rounded-xl border border-border/60 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-slate-50/60 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium block">Category</span>
                  <span className="font-semibold text-slate-900">
                    {selectedMedia.resourceType === 'VIDEO' ? 'Video' : 'Photo'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">
                    {selectedMedia.width && selectedMedia.height ? 'Dimensions' : 'Uploaded'}
                  </span>
                  <span className="font-mono-code font-medium text-slate-900">
                    {selectedMedia.width && selectedMedia.height
                      ? `${selectedMedia.width} × ${selectedMedia.height}`
                      : formatLocalDate(selectedMedia.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
