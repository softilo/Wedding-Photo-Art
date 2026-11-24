import { SignedCloudinaryUploadPayload } from '@/types/event-management';

export interface CloudinaryDirectResult {
  asset_id: string;
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  version?: number;
  signature?: string;
}

export function detectImageFormat(file: File): { valid: boolean; format: string } {
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name);
  if (!isImage) {
    return { valid: false, format: '' };
  }
  const extFromName = file.name.split('.').pop()?.toLowerCase() || '';
  const extFromMime = file.type.split('/').pop()?.toLowerCase() || '';
  const raw = extFromName || extFromMime || 'jpg';
  const format = raw === 'jpeg' ? 'jpg' : raw;
  return { valid: true, format };
}

export function measureImageDimensions(
  file: File,
): Promise<{ width?: number; height?: number }> {
  if (typeof window === 'undefined' || typeof URL === 'undefined') {
    return Promise.resolve({});
  }
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({});
    };
    img.src = objectUrl;
  });
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function uploadImageToCloudinary(
  file: File,
  signed: SignedCloudinaryUploadPayload,
  onProgress?: (pct: number) => void,
): Promise<CloudinaryDirectResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.uploadUrl, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(94, Math.max(12, Math.round((ev.loaded / ev.total) * 90)));
        onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && body.asset_id && body.public_id) {
          resolve(body as CloudinaryDirectResult);
        } else {
          reject(
            new Error(body?.error?.message || `Cloudinary upload failed (${xhr.status}).`),
          );
        }
      } catch {
        reject(new Error(`Cloudinary upload failed (${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary.'));

    const form = new FormData();
    form.append('file', file);
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
}
