import {
  PublicAboutTeamResponse,
  StudioAboutProfileRecord,
  StudioTeamMemberRecord,
} from '@/types/event-management';
import { buildCloudinaryImageUrl, buildCloudinarySrcSet } from '@/lib/showcaseMedia';

export interface ResolvedTeamMember {
  id: string;
  name: string;
  subtitle?: string;
  role: string;
  specialty: string;
  bio: string;
  quote?: string;
  phone?: string;
  instagram?: string;
  location?: string;
  isFeatured?: boolean;
  isActive: boolean;
  imageUrl: string | null;
  srcSet?: string;
  imageAlt: string;
  isCustomImage: boolean;
}

function resolveMemberRecord(
  member: StudioTeamMemberRecord,
  brandingName: string,
): ResolvedTeamMember {
  const rawUrl = member.imageUrl?.trim() || null;
  const isLocalAsset = Boolean(rawUrl?.startsWith('/'));
  const resolvedUrl = rawUrl
    ? isLocalAsset
      ? rawUrl
      : member.deliveryUrls?.coverUrl ||
        buildCloudinaryImageUrl(rawUrl, {
          width: 1400,
          crop: 'limit',
          quality: 'auto:good',
        })
    : null;

  return {
    id: member.id,
    name: member.name,
    subtitle: member.subtitle ?? undefined,
    role: member.role,
    specialty: member.specialty,
    bio: member.bio,
    quote: member.quote ?? undefined,
    phone: member.phone ?? undefined,
    instagram: member.instagram ?? undefined,
    location: member.location ?? undefined,
    isFeatured: member.isFeatured,
    isActive: member.isActive,
    imageUrl: resolvedUrl,
    srcSet:
      rawUrl && !isLocalAsset
        ? buildCloudinarySrcSet(rawUrl, [800, 1400], 'auto:good')
        : undefined,
    imageAlt: `${member.name} — ${member.role || brandingName}`,
    isCustomImage: Boolean(resolvedUrl),
  };
}

/**
 * Resolves Studio Story & Creative Team strictly from the database (`/public/about-team`).
 * Team portraits never mix into Client Portfolios or Public Gallery walls.
 */
export function resolveAboutTeamFromDb(params: {
  aboutTeamShowcase?: PublicAboutTeamResponse | null;
  brandingName: string;
}): {
  profile: StudioAboutProfileRecord | null;
  activeMembers: ResolvedTeamMember[];
  featuredMember: ResolvedTeamMember | null;
  otherMembers: ResolvedTeamMember[];
} {
  const { aboutTeamShowcase, brandingName } = params;
  if (!aboutTeamShowcase) {
    return {
      profile: null,
      activeMembers: [],
      featuredMember: null,
      otherMembers: [],
    };
  }

  const activeMembers = (aboutTeamShowcase.members || [])
    .filter((m) => m.isActive)
    .map((m) => resolveMemberRecord(m, brandingName));

  const featuredMember =
    activeMembers.find((m) => m.isFeatured) ||
    activeMembers.find((m) => /founder|owner|principal|lead/i.test(`${m.role} ${m.name}`)) ||
    activeMembers[0] ||
    null;

  const otherMembers = featuredMember
    ? activeMembers.filter((m) => m.id !== featuredMember.id)
    : [];

  return {
    profile: aboutTeamShowcase.profile ?? null,
    activeMembers,
    featuredMember,
    otherMembers,
  };
}
