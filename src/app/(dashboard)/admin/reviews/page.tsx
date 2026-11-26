import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { listGalleryMedia } from '@/service/catalog/catalog.service';
import {
  getReviewUploadStatus,
  listAdminReviews,
} from '@/service/reviews/reviews.service';
import { ReviewsManager } from '@/components/module/admin/ReviewsManager';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function AdminReviewsContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF' || session.role === 'ACCOUNTANT') redirect('/admin');

  const [reviewsRes, uploadStatusRes, galleryRes] = await Promise.all([
    listAdminReviews('all'),
    getReviewUploadStatus(),
    listGalleryMedia('IMAGE'),
  ]);

  const initialReviews =
    reviewsRes.ok && reviewsRes.data ? reviewsRes.data.data : [];

  const uploadStatus =
    uploadStatusRes.ok && uploadStatusRes.data
      ? uploadStatusRes.data
      : reviewsRes.ok && reviewsRes.data
        ? reviewsRes.data.uploadStatus
        : null;

  const galleryImages =
    galleryRes.ok && galleryRes.data
      ? galleryRes.data.data.filter(
          (item) => item.resourceType === 'IMAGE' && item.status === 'READY',
        )
      : [];

  let initialError: string | null = null;
  if (!reviewsRes.ok) {
    const rawMsg = reviewsRes.message || 'Unable to load client reviews from backend.';
    if (
      reviewsRes.status === 404 ||
      rawMsg.toLowerCase().includes('cannot get /reviews')
    ) {
      initialError =
        'Reviews API route (/reviews) is not active on the running backend server yet. Restart or redeploy wedding-photoart-server so ReviewsModule is loaded.';
    } else {
      initialError = rawMsg;
    }
  }

  return (
    <ReviewsManager
      initialReviews={initialReviews}
      initialUploadStatus={uploadStatus}
      galleryImages={galleryImages}
      initialError={initialError}
    />
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton variant="admin-gallery" label="Loading client reviews..." />
      }
    >
      <AdminReviewsContent />
    </Suspense>
  );
}
