export type UserRole = 'OWNER' | 'COORDINATOR' | 'ACCOUNTANT' | 'STAFF';

export type AdvancePolicyType = 'NONE' | 'PERCENTAGE' | 'FIXED';

export type InquiryStatus = 'NEW' | 'QUALIFIED' | 'QUOTED' | 'CONVERTED' | 'CLOSED';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'SUPERSEDED' | 'EXPIRED' | 'CANCELLED';
export type QuoteVersionStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'SUPERSEDED';
export type AcceptanceChannel = 'PORTAL' | 'PHONE' | 'IN_PERSON' | 'EMAIL' | 'WHATSAPP';
export type BookingStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type ResourceType = 'CREW' | 'EQUIPMENT' | 'ROOM' | 'OTHER';
export type PaymentType = 'RECEIPT' | 'REFUND';
export type PaymentMethod = 'BKASH' | 'NAGAD' | 'BANK' | 'CASH' | 'OTHER';
export type VerificationState = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AdjustmentType = 'CREDIT_NOTE' | 'REVERSAL' | 'CHARGE_ADJUSTMENT';
export type AssignmentStatus = 'ASSIGNED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
export type DeliverableStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'DELIVERED';

export interface ThemeTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

export interface ContactDetails {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export interface PublicBranding {
  displayName: string;
  logoUrl: string | null;
  themeTokens: ThemeTokens;
  contactDetails: ContactDetails;
  timezone: string;
  currency: string;
}

export interface StudioSettings extends PublicBranding {
  advancePolicyType: AdvancePolicyType;
  advancePolicyValue: number;
  updatedAt: string;
}

export interface AuthUserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studioName: string;
  timezone: string;
  currency: string;
}

export interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  unitLabel: string;
  defaultUnitPricePoisha: number;
  isActive: boolean;
}

export interface PackageItem {
  id: string;
  serviceItemId: string | null;
  description: string;
  quantity: number;
  unitPricePoisha: number;
}

export interface StudioPackage {
  id: string;
  eventTypeId: string | null;
  eventType?: { id: string; name: string; slug: string };
  name: string;
  slug: string;
  description: string | null;
  basePricePoisha: number;
  isActive: boolean;
  isPublished: boolean;
  items?: PackageItem[];
}

export interface DeliverableLabelTemplate {
  id: string;
  eventTypeId: string | null;
  eventType?: { id: string; name: string; slug: string } | null;
  label: string;
  defaultDueDays: number;
  isActive: boolean;
}

export interface TaskTemplate {
  id: string;
  eventTypeId: string | null;
  eventType?: { id: string; name: string; slug: string } | null;
  title: string;
  roleLabel: string;
  defaultOffsetDays: number;
  isActive: boolean;
}

export interface PortfolioItem {
  id: string;
  eventTypeId: string | null;
  title: string;
  description: string | null;
  mediaUrl: string;
  sortOrder: number;
  isApproved?: boolean;
  isPublished?: boolean;
}

export type PortfolioEventStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PortfolioMediaType = 'IMAGE' | 'VIDEO';
export type PortfolioMediaStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface PortfolioMediaDeliveryUrls {
  coverUrl: string;
  thumbnailUrl: string;
  fullUrl: string;
  posterUrl: string | null;
}

export interface PortfolioMediaItem {
  id: string;
  eventId: string;
  assetId: string;
  publicId: string;
  resourceType: PortfolioMediaType;
  format: string;
  secureUrl: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  caption: string | null;
  altText: string | null;
  displayOrder: number;
  status: PortfolioMediaStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryUrls?: PortfolioMediaDeliveryUrls;
}

export interface PortfolioShowcaseEvent {
  id: string;
  eventTypeId: string | null;
  eventType?: { id: string; name: string; slug: string } | null;
  title: string;
  slug: string;
  eventDate: string | null;
  description: string | null;
  location: string | null;
  status: PortfolioEventStatus;
  coverMediaId: string | null;
  coverMedia: PortfolioMediaItem | null;
  media: PortfolioMediaItem[];
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts?: {
    photos: number;
    videos: number;
    totalReady: number;
  };
}

export interface SignedCloudinaryUploadPayload {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  allowedFormats: string[];
  context: string;
  uploadPreset: string | null;
  resourceType: PortfolioMediaType;
  maxBytes: number;
}

export interface CloudinaryStatusSummary {
  configured: boolean;
  missingVariables: string[];
  cloudName: string | null;
  folderPrefix: string;
  allowedImageFormats: string[];
  allowedVideoFormats: string[];
  maxImageBytes: number;
  maxVideoBytes: number;
}

export interface GalleryMediaListResponse {
  data: PortfolioMediaItem[];
  counts: {
    total: number;
    photos: number;
    videos: number;
  };
}

export interface Inquiry {
  id: string;
  reference: string;
  eventTypeId: string | null;
  packageId: string | null;
  eventTitle: string;
  requestedDate: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  notes: string | null;
  metadata?: Record<string, unknown> | null;
  source: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface QuoteLineItem {
  id: string;
  packageId: string | null;
  serviceItemId: string | null;
  description: string;
  quantity: number;
  unitPricePoisha: number;
  lineTotalPoisha: number;
  sortOrder: number;
}

export interface QuoteVersion {
  id: string;
  quoteId: string;
  versionNumber: number;
  subtotalPoisha: number;
  discountPoisha: number;
  totalPoisha: number;
  terms: string | null;
  validUntil: string | null;
  status: QuoteVersionStatus;
  acceptedAt: string | null;
  acceptedBy: string | null;
  acceptedChannel: AcceptanceChannel | null;
  createdAt: string;
  items?: QuoteLineItem[];
}

export interface Quote {
  id: string;
  inquiryId: string | null;
  reference: string;
  eventTypeId: string | null;
  eventTitle: string;
  requestedDate: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  currency: string;
  status: QuoteStatus;
  currentVersionId: string | null;
  createdAt: string;
  versions?: QuoteVersion[];
  currentVersion?: QuoteVersion;
}

export interface BookingLedgerSummary {
  bookingId: string;
  currency: string;
  agreedTotalPoisha: number;
  approvedCreditNotesPoisha: number;
  effectiveAgreedChargePoisha: number;
  verifiedReceiptsPoisha: number;
  pendingReceiptsPoisha: number;
  completedRefundsPoisha: number;
  outstandingDuePoisha: number;
  customerCreditPoisha: number;
  requiredAdvancePoisha: number;
  isAdvanceMet: boolean;
}

export interface PaymentEntry {
  id: string;
  bookingId: string;
  type: PaymentType;
  method: PaymentMethod;
  amountPoisha: number;
  currency: string;
  transactionRef: string | null;
  verificationState: VerificationState;
  idempotencyKey: string | null;
  recordedById: string;
  verifiedById: string | null;
  verifiedAt: string | null;
  reason: string | null;
  createdAt: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  userId: string | null;
  isActive: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive?: boolean;
  } | null;
}

export interface StudioMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  resources?: Resource[];
  openAssignmentsCount?: number;
}

export interface ResourceAvailabilityItem extends Resource {
  available: boolean;
  conflict: {
    sessionId: string;
    title: string;
    startAt: string;
    endAt: string;
    bookingReference: string | null;
    eventTitle: string | null;
  } | null;
}

export interface CalendarSubscriptionInfo {
  studioName: string;
  timezone: string;
  feedPath: string;
}

export interface EventSession {
  id: string;
  bookingId: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
  status: SessionStatus;
  notes: string | null;
  agencyLocalDate?: string;
  booking?: {
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
    clientPhone?: string;
    eventDate?: string | null;
    status: BookingStatus;
  };
  reservations?: Array<{
    id: string;
    resourceId: string;
    startAt: string;
    endAt: string;
    resource?: {
      id: string;
      name: string;
      type: ResourceType;
      userId?: string | null;
    };
  }>;
}

export interface MyCrewWorkspaceData {
  assignments: Assignment[];
  upcomingShoots: EventSession[];
}

export interface StudioDispatchMemberSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  crewResources: Resource[];
  openTasksCount: number;
  upcomingShootsCount: number;
}

export interface StudioDispatchData {
  assignments: Assignment[];
  upcomingSessions: EventSession[];
  crewSummary: StudioDispatchMemberSummary[];
}

export type NotificationCategory =
  | 'INQUIRY'
  | 'PAYMENT'
  | 'BOOKING'
  | 'SCHEDULE'
  | 'TASK'
  | 'DELIVERABLE';

export type NotificationSeverity = 'INFO' | 'ACTION' | 'URGENT' | 'SUCCESS';

export interface StudioNotification {
  id: string;
  recipientUserId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsFeed {
  unreadCount: number;
  urgentUnreadCount: number;
  items: StudioNotification[];
}

export interface Assignment {
  id: string;
  bookingId: string;
  sessionId: string | null;
  assigneeUserId: string;
  roleLabel: string;
  notes: string | null;
  status: AssignmentStatus;
  createdAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  booking?: {
    id: string;
    reference: string;
    eventTitle: string;
    eventDate: string | null;
    clientName: string;
    clientPhone: string;
    status: BookingStatus;
  };
  session?: {
    id: string;
    title: string;
    startAt?: string;
    endAt?: string;
    location?: string | null;
    status?: SessionStatus;
  } | null;
}

export interface Deliverable {
  id: string;
  bookingId: string;
  label: string;
  assigneeUserId: string | null;
  assigneeName?: string | null;
  dueAt: string | null;
  reviewStatus: DeliverableStatus;
  deliveredAt: string | null;
  deliveryUrl: string | null;
  notes: string | null;
}

export interface ScheduleAuditEntry {
  id: string;
  bookingId: string;
  sessionId: string | null;
  action: string;
  reason: string;
  changedById: string;
  previousStartAt: string | null;
  previousEndAt: string | null;
  newStartAt: string | null;
  newEndAt: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  quoteId: string;
  acceptedQuoteVersionId: string;
  eventTypeId: string | null;
  eventType?: { id: string; name: string; slug: string } | null;
  quote?: { id: string; reference: string } | null;
  acceptedQuoteVersion?: QuoteVersion;
  eventTitle: string;
  eventDate: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  currency: string;
  agreedTotalPoisha: number;
  status: BookingStatus;
  confirmedAt: string | null;
  version: number;
  createdAt: string;
  ledger?: BookingLedgerSummary;
  sessions?: EventSession[];
  deliverables?: Deliverable[];
  assignments?: Assignment[];
  scheduleAuditLogs?: ScheduleAuditEntry[];
}

export interface AutomationAlerts {
  currency: string;
  timezone: string;
  pendingPayments: Array<{
    id: string;
    bookingId: string;
    method: PaymentMethod;
    amountPoisha: number;
    currency: string;
    transactionRef: string | null;
    createdAt: string;
    booking: {
      id: string;
      reference: string;
      eventTitle: string;
      clientName: string;
      status: BookingStatus;
    };
  }>;
  readyToConfirmBookings: Array<{
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
    eventDate: string | null;
    agreedTotalPoisha: number;
    verifiedReceiptsPoisha: number;
    requiredAdvancePoisha: number;
  }>;
  awaitingAdvanceBookings: Array<{
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
    eventDate: string | null;
    agreedTotalPoisha: number;
    verifiedReceiptsPoisha: number;
    requiredAdvancePoisha: number;
  }>;
  unscheduledConfirmedBookings: Array<{
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
    eventDate: string | null;
  }>;
  unassignedConfirmedBookings: Array<{
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
    eventDate: string | null;
  }>;
  urgentDeliverables: Array<{
    id: string;
    bookingId: string;
    label: string;
    dueAt: string | null;
    reviewStatus: DeliverableStatus;
    isOverdue: boolean;
    booking: {
      id: string;
      reference: string;
      eventTitle: string;
      clientName: string;
    };
  }>;
  counts: {
    pendingPayments: number;
    readyToConfirm: number;
    awaitingAdvance: number;
    unscheduledConfirmed: number;
    unassignedConfirmed: number;
    urgentDeliverables: number;
  };
}

export interface BookingReceipt {
  studio: PublicBranding;
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    eventTitle: string;
    eventTypeName: string | null;
    eventDate: string | null;
    clientName: string;
    clientPhone: string;
    clientEmail: string | null;
    currency: string;
    agreedTotalPoisha: number;
    confirmedAt: string | null;
    createdAt: string;
  };
  quote: {
    reference: string;
    versionNumber: number;
    acceptedAt: string | null;
    acceptedBy: string | null;
    acceptedChannel: AcceptanceChannel | null;
    terms: string | null;
    subtotalPoisha: number;
    discountPoisha: number;
    totalPoisha: number;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPricePoisha: number;
      lineTotalPoisha: number;
    }>;
  };
  ledger: BookingLedgerSummary;
  payments: Array<{
    id: string;
    type: PaymentType;
    method: PaymentMethod;
    amountPoisha: number;
    currency: string;
    transactionRef: string | null;
    verifiedAt: string | null;
    reason: string | null;
    createdAt: string;
  }>;
  adjustments: Array<{
    id: string;
    type: AdjustmentType;
    amountPoisha: number;
    reason: string;
    createdAt: string;
  }>;
  generatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export type ExpenseCategory =
  | 'CREW_PAYOUT'
  | 'EQUIPMENT_RENTAL'
  | 'ALBUM_PRINTING'
  | 'TRANSPORT_FOOD'
  | 'VENUE_DECOR'
  | 'STUDIO_OVERHEAD'
  | 'MARKETING'
  | 'OTHER';

export interface FinancialReportSummary {
  totalContractedPoisha: number;
  effectiveContractedPoisha: number;
  verifiedReceiptsPoisha: number;
  pendingVerificationPoisha: number;
  completedRefundsPoisha: number;
  netCollectedRevenuePoisha: number;
  totalCreditNotesPoisha: number;
  totalChargeAdjustmentsPoisha: number;
  totalOutstandingDuePoisha: number;
  totalCustomerCreditPoisha: number;
  totalExpensesPoisha: number;
  directBookingExpensesPoisha: number;
  generalOverheadExpensesPoisha: number;
  netCashProfitPoisha: number;
  projectedNetProfitPoisha: number;
  profitMarginPercent: number;
  expensesCount: number;
  collectionRatePercent: number;
  activeBookingsCount: number;
  completedBookingsCount: number;
  cancelledBookingsCount: number;
  fullyPaidBookingsCount: number;
  bookingsWithDueCount: number;
  pendingReceiptsCount: number;
}

export interface FinancialMethodBreakdown {
  method: PaymentMethod;
  verifiedReceiptsPoisha: number;
  pendingReceiptsPoisha: number;
  refundsPoisha: number;
  netCollectedPoisha: number;
  transactionCount: number;
  sharePercent: number;
}

export interface FinancialExpenseCategoryBreakdown {
  category: ExpenseCategory;
  amountPoisha: number;
  count: number;
  sharePercent: number;
}

export interface FinancialMonthBreakdown {
  month: string;
  bookingsCount: number;
  contractedPoisha: number;
  collectedPoisha: number;
  refundedPoisha: number;
  netCollectedPoisha: number;
  expensesPoisha: number;
  netCashProfitPoisha: number;
}

export interface FinancialEventTypeBreakdown {
  eventTypeId: string;
  eventTypeName: string;
  bookingsCount: number;
  agreedTotalPoisha: number;
  collectedPoisha: number;
  outstandingDuePoisha: number;
}

export interface FinancialBookingReceivable {
  bookingId: string;
  reference: string;
  eventTitle: string;
  eventTypeName: string | null;
  clientName: string;
  clientPhone: string;
  eventDate: string | null;
  status: BookingStatus;
  createdAt: string;
  agreedTotalPoisha: number;
  effectiveAgreedChargePoisha: number;
  verifiedReceiptsPoisha: number;
  pendingReceiptsPoisha: number;
  completedRefundsPoisha: number;
  creditNotesPoisha: number;
  outstandingDuePoisha: number;
  customerCreditPoisha: number;
  directExpensesPoisha: number;
  bookingNetProfitPoisha: number;
  requiredAdvancePoisha: number;
  isAdvanceMet: boolean;
}

export interface FinancialTransactionRow extends PaymentEntry {
  booking: {
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
    clientPhone: string;
    status: BookingStatus;
  };
}

export interface FinancialExpenseRow {
  id: string;
  bookingId: string | null;
  category: ExpenseCategory;
  title: string;
  vendorOrPayee: string | null;
  amountPoisha: number;
  currency: string;
  method: PaymentMethod;
  reference: string | null;
  incurredOn: string;
  notes: string | null;
  recordedById: string;
  createdAt: string;
  booking?: {
    id: string;
    reference: string;
    eventTitle: string;
    clientName: string;
  } | null;
}

export interface FinancialReportData {
  currency: string;
  timezone: string;
  generatedAt: string;
  filters: {
    from: string | null;
    to: string | null;
    method: PaymentMethod | null;
    bookingStatus: BookingStatus | null;
  };
  summary: FinancialReportSummary;
  byMethod: FinancialMethodBreakdown[];
  byExpenseCategory: FinancialExpenseCategoryBreakdown[];
  byMonth: FinancialMonthBreakdown[];
  byEventType: FinancialEventTypeBreakdown[];
  receivables: FinancialBookingReceivable[];
  transactions: FinancialTransactionRow[];
  expenses: FinancialExpenseRow[];
}

export interface ClientReview {
  id: string;
  clientName: string;
  quote: string;
  rating: number;
  eventTitle: string | null;
  sourceLabel: string | null;
  imageUrl: string;
  imageAssetId: string | null;
  imagePublicId: string | null;
  imageFormat: string | null;
  imageBytes: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  deliveryUrls: PortfolioMediaDeliveryUrls;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewsListResponse {
  data: ClientReview[];
  uploadStatus: CloudinaryStatusSummary;
}

export interface StudioServiceRecord {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAssetId: string | null;
  imagePublicId: string | null;
  imageFormat: string | null;
  imageBytes: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  deliveryUrls: PortfolioMediaDeliveryUrls | null;
  showOnHome: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicServicesResponse {
  enabled: boolean;
  items: StudioServiceRecord[];
}

export interface AdminServicesResponse extends PublicServicesResponse {
  uploadStatus: CloudinaryStatusSummary;
}

export interface StudioAboutProfileRecord {
  storyEyebrow: string;
  storyTitle: string;
  storyLead: string;
  storyBody: string;
  servicesSectionEnabled?: boolean;
  updatedAt?: string;
}

export interface StudioTeamMemberRecord {
  id: string;
  name: string;
  subtitle: string | null;
  role: string;
  specialty: string;
  bio: string;
  quote: string | null;
  phone: string | null;
  instagram: string | null;
  location: string | null;
  isFeatured: boolean;
  imageUrl: string | null;
  imageAssetId: string | null;
  imagePublicId: string | null;
  imageFormat: string | null;
  imageBytes: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  deliveryUrls: PortfolioMediaDeliveryUrls | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAboutTeamResponse {
  profile: StudioAboutProfileRecord;
  members: StudioTeamMemberRecord[];
}

export interface AdminAboutTeamResponse extends PublicAboutTeamResponse {
  uploadStatus: CloudinaryStatusSummary;
}

