import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  ABOUT_TEAM_SLUG,
  getHeroSlideImageUrl,
  getHeroSlideSrcSet,
  isSystemPortfolioEventSlug,
} from '@/lib/heroSlider';
import {
  buildCloudinaryImageUrl,
  buildCloudinarySrcSet,
  parseShowcaseMedia,
} from '@/lib/showcaseMedia';

export { ABOUT_TEAM_SLUG };

export interface StudioTeamMemberItem {
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
  defaultImageUrl?: string;
  mediaId?: string;
  isActive: boolean;
}

export interface AboutTeamSettings {
  storyEyebrow: string;
  storyTitle: string;
  storyLead: string;
  storyBody: string;
  members: StudioTeamMemberItem[];
}

export interface ResolvedTeamMember extends StudioTeamMemberItem {
  mediaItem?: PortfolioMediaItem;
  imageUrl: string | null;
  srcSet?: string;
  imageAlt: string;
  isCustomImage: boolean;
}

const ABOUT_CONFIG_OPEN = '<!-- WPA_ABOUT_TEAM_CONFIG:';
const ABOUT_CONFIG_CLOSE = ' -->';

export function buildDefaultAboutTeamSettings(studioName = 'Wedding PhotoArt'): AboutTeamSettings {
  return {
    storyEyebrow: 'Est. 2015 • Feni, Bangladesh',
    storyTitle: `Crafting Heirloom Wedding Stories Across Bangladesh`,
    storyLead: `${studioName} is a collective of dedicated photographers, cinematographers, and visual editors devoted to honest emotion, refined light, and true-to-life color.`,
    storyBody:
      'Founded in 2015 in Feni, our studio grew around a simple conviction: wedding photographs should feel effortless, dignified, and deeply personal decades after your celebration. From vibrant Holud evenings to quiet bridal portraits and 4K highlight cinema, our in-house crew works together with calm precision.',
    members: [
      {
        id: 'team-lead-photographer',
        name: 'Shahadat Hossain',
        subtitle: 'আলোকচিত্রকর • ফটো সাংবাদিক',
        role: 'Founder, Owner & Lead Photographer',
        specialty: 'Photographer • Cinematography • Photo Editor • Event Planner',
        bio: `Founder & principal storyteller at ${studioName} in Feni since 2015. Working as a photojournalist, photographer, cinematographer, and photo editor, personally directing bridal portraiture, soulful ceremonies, and heirloom wedding cinema across Bangladesh.`,
        quote:
          'Every photograph should feel as honest and moving thirty years from now as the day your vows were spoken.',
        phone: '+880 1855-585601',
        instagram: 'mdshahadathossainbhuiyan',
        location: 'Feni, Bangladesh',
        isFeatured: true,
        defaultImageUrl: '/brand/founder-portrait.jpg',
        isActive: true,
      },
      {
        id: 'team-lead-cinema',
        name: 'Director of Cinematography',
        role: 'Lead 4K Wedding Filmmaker',
        specialty: 'Multi-Camera Cinema & Audio Capture',
        bio: 'Directs stabilized gimbal movement, natural ceremony audio, and expressive narrative wedding highlight films crafted for lifelong viewing.',
        isActive: true,
      },
      {
        id: 'team-associate-photographer',
        name: 'Senior Ceremony Photographer',
        role: 'Associate Photographer • Holud & Portraits',
        specialty: 'Candid Rituals & Vibrant Event Color',
        bio: 'Specializes in spontaneous family warmth, vibrant Holud and Mehendi storytelling, and poised couple sessions outdoors and in studio.',
        isActive: true,
      },
      {
        id: 'team-post-production',
        name: 'Lead Film Editor & Colorist',
        role: 'Post-Production & Album Curator',
        specialty: 'True-to-Life Grading & Photo-Books',
        bio: 'Shapes cohesive film pacing, skin-tone color fidelity, and gallery-grade digital & print photo-book finishing for every delivered celebration.',
        isActive: true,
      },
    ],
  };
}

export const DEFAULT_ABOUT_TEAM_SETTINGS: AboutTeamSettings =
  buildDefaultAboutTeamSettings('Wedding PhotoArt');

function sanitizeTeamMember(raw: unknown, idx: number): StudioTeamMemberItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 80) : '';
  if (!name) return null;

  const idRaw = typeof obj.id === 'string' ? obj.id.trim() : '';
  const id = idRaw || `team-${idx + 1}`;
  const subtitle =
    typeof obj.subtitle === 'string' && obj.subtitle.trim().length > 0
      ? obj.subtitle.trim().slice(0, 90)
      : undefined;
  const role = typeof obj.role === 'string' ? obj.role.trim().slice(0, 90) : '';
  const specialty = typeof obj.specialty === 'string' ? obj.specialty.trim().slice(0, 120) : '';
  const bio = typeof obj.bio === 'string' ? obj.bio.trim().slice(0, 420) : '';
  const quote =
    typeof obj.quote === 'string' && obj.quote.trim().length > 0
      ? obj.quote.trim().slice(0, 220)
      : undefined;
  const phone =
    typeof obj.phone === 'string' && obj.phone.trim().length > 0
      ? obj.phone.trim().slice(0, 40)
      : undefined;
  const instagram =
    typeof obj.instagram === 'string' && obj.instagram.trim().length > 0
      ? obj.instagram.trim().replace(/^@+/, '').slice(0, 80)
      : undefined;
  const location =
    typeof obj.location === 'string' && obj.location.trim().length > 0
      ? obj.location.trim().slice(0, 80)
      : undefined;
  const isFeatured = typeof obj.isFeatured === 'boolean' ? obj.isFeatured : undefined;
  const defaultImageUrl =
    typeof obj.defaultImageUrl === 'string' && obj.defaultImageUrl.trim().length > 0
      ? obj.defaultImageUrl.trim()
      : id === 'team-lead-photographer'
        ? '/brand/founder-portrait.jpg'
        : undefined;
  const mediaId =
    typeof obj.mediaId === 'string' && obj.mediaId.trim().length > 0
      ? obj.mediaId.trim()
      : undefined;
  const isActive = typeof obj.isActive === 'boolean' ? obj.isActive : true;

  return {
    id,
    name,
    subtitle,
    role,
    specialty,
    bio,
    quote,
    phone,
    instagram,
    location,
    isFeatured,
    defaultImageUrl,
    mediaId,
    isActive,
  };
}

export function parseAboutTeamSettings(
  description?: string | null,
  studioName = 'Wedding PhotoArt',
): AboutTeamSettings {
  const defaults = buildDefaultAboutTeamSettings(studioName);
  if (!description) return defaults;

  const start = description.indexOf(ABOUT_CONFIG_OPEN);
  if (start === -1) return defaults;
  const jsonStart = start + ABOUT_CONFIG_OPEN.length;
  const end = description.indexOf(ABOUT_CONFIG_CLOSE, jsonStart);
  if (end === -1) return defaults;

  try {
    const parsed = JSON.parse(description.slice(jsonStart, end)) as Record<string, unknown>;
    const rawMembers = Array.isArray(parsed.members) ? parsed.members : [];
    const members = rawMembers
      .map((m, idx) => sanitizeTeamMember(m, idx))
      .filter((m): m is StudioTeamMemberItem => m !== null);

    return {
      storyEyebrow:
        typeof parsed.storyEyebrow === 'string' && parsed.storyEyebrow.trim()
          ? parsed.storyEyebrow.trim().slice(0, 90)
          : defaults.storyEyebrow,
      storyTitle:
        typeof parsed.storyTitle === 'string' && parsed.storyTitle.trim()
          ? parsed.storyTitle.trim().slice(0, 140)
          : defaults.storyTitle,
      storyLead:
        typeof parsed.storyLead === 'string' && parsed.storyLead.trim()
          ? parsed.storyLead.trim().slice(0, 280)
          : defaults.storyLead,
      storyBody:
        typeof parsed.storyBody === 'string' && parsed.storyBody.trim()
          ? parsed.storyBody.trim().slice(0, 900)
          : defaults.storyBody,
      members: members.length > 0 ? members : defaults.members,
    };
  } catch {
    return defaults;
  }
}

export function serializeAboutTeamDescription(settings: AboutTeamSettings): string {
  const cleanMembers = settings.members
    .map((m, idx) => sanitizeTeamMember(m, idx))
    .filter((m): m is StudioTeamMemberItem => m !== null);

  const normalized: AboutTeamSettings = {
    storyEyebrow: settings.storyEyebrow.trim().slice(0, 90),
    storyTitle: settings.storyTitle.trim().slice(0, 140),
    storyLead: settings.storyLead.trim().slice(0, 280),
    storyBody: settings.storyBody.trim().slice(0, 900),
    members: cleanMembers,
  };

  return `Managed Studio About & Team Showcase\n${ABOUT_CONFIG_OPEN}${JSON.stringify(normalized)}${ABOUT_CONFIG_CLOSE}`;
}

export function resolveAboutTeam(params: {
  aboutEvent?: PortfolioShowcaseEvent | null;
  brandingName: string;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}): {
  settings: AboutTeamSettings;
  activeMembers: ResolvedTeamMember[];
  featuredMember: ResolvedTeamMember | null;
  otherMembers: ResolvedTeamMember[];
  hasCustomConfig: boolean;
} {
  const { aboutEvent, brandingName, portfolioEvents, galleryImages, legacyPortfolio } = params;
  const hasCustomConfig = Boolean(aboutEvent?.description?.includes(ABOUT_CONFIG_OPEN));
  const settings = parseAboutTeamSettings(aboutEvent?.description, brandingName);

  const readyMediaById = new Map<string, PortfolioMediaItem>();
  if (aboutEvent && aboutEvent.status === 'PUBLISHED') {
    for (const m of aboutEvent.media || []) {
      if (m.resourceType === 'IMAGE' && m.status === 'READY' && m.secureUrl) {
        readyMediaById.set(m.id, m);
      }
    }
  }

  const seenUrls = new Set<string>();
  for (const member of settings.members) {
    const custom = member.mediaId ? readyMediaById.get(member.mediaId) : undefined;
    if (custom) {
      seenUrls.add(getHeroSlideImageUrl(custom));
    }
  }

  const fallbackPool: Array<{
    imageUrl: string;
    srcSet?: string;
    mediaItem?: PortfolioMediaItem;
    isPortrait: boolean;
  }> = [];

  const pushFallback = (img: PortfolioMediaItem) => {
    if (img.resourceType !== 'IMAGE' || img.status !== 'READY' || !img.secureUrl) return;
    const url = getHeroSlideImageUrl(img);
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    const isPortrait = Boolean(img.width && img.height && img.height >= img.width);
    fallbackPool.push({
      imageUrl: url,
      srcSet: getHeroSlideSrcSet(img),
      mediaItem: img,
      isPortrait,
    });
  };

  for (const img of galleryImages) {
    pushFallback(img);
  }
  for (const ev of portfolioEvents) {
    if (isSystemPortfolioEventSlug(ev.slug)) continue;
    if (ev.coverMedia) pushFallback(ev.coverMedia);
  }
  for (const item of legacyPortfolio) {
    const parsed = parseShowcaseMedia(item.mediaUrl);
    if (parsed.kind !== 'photo' || !parsed.coverUrl) continue;
    const url = buildCloudinaryImageUrl(parsed.coverUrl, {
      width: 1400,
      crop: 'limit',
      quality: '100',
    });
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    fallbackPool.push({
      imageUrl: url,
      srcSet: buildCloudinarySrcSet(parsed.coverUrl, [800, 1400], '100'),
      isPortrait: false,
    });
  }

  const orderedFallbacks = [
    ...fallbackPool.filter((f) => f.isPortrait),
    ...fallbackPool.filter((f) => !f.isPortrait),
  ];
  let fbCursor = 0;

  const activeMembers: ResolvedTeamMember[] = settings.members
    .filter((m) => m.isActive)
    .map((member) => {
      const customMedia = member.mediaId ? readyMediaById.get(member.mediaId) : undefined;
      if (customMedia) {
        return {
          ...member,
          mediaItem: customMedia,
          imageUrl: getHeroSlideImageUrl(customMedia),
          srcSet: getHeroSlideSrcSet(customMedia),
          imageAlt: customMedia.altText || `${member.name} — ${member.role || brandingName}`,
          isCustomImage: true,
        };
      }

      if (member.defaultImageUrl) {
        return {
          ...member,
          imageUrl: member.defaultImageUrl,
          imageAlt: `${member.name} — ${member.role || brandingName}`,
          isCustomImage: false,
        };
      }

      const fb =
        orderedFallbacks.length > 0
          ? orderedFallbacks[fbCursor++ % orderedFallbacks.length]
          : null;
      return {
        ...member,
        mediaItem: fb?.mediaItem,
        imageUrl: fb?.imageUrl ?? null,
        srcSet: fb?.srcSet,
        imageAlt: `${member.name} — ${brandingName}`,
        isCustomImage: false,
      };
    });

  const featuredMember =
    activeMembers.find((m) => m.isFeatured) ||
    activeMembers.find((m) => /founder|owner|principal|lead/i.test(`${m.role} ${m.name}`)) ||
    activeMembers[0] ||
    null;

  const otherMembers = featuredMember
    ? activeMembers.filter((m) => m.id !== featuredMember.id)
    : [];

  return {
    settings,
    activeMembers,
    featuredMember,
    otherMembers,
    hasCustomConfig,
  };
}
