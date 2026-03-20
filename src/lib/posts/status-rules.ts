export const POST_STATUSES = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  REVIEWED: "REVIEWED",
  PUBLISHED: "PUBLISHED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export type PostStatus = (typeof POST_STATUSES)[keyof typeof POST_STATUSES];

export function canTransitionToReview(status: string) {
  return status === POST_STATUSES.DRAFT || status === POST_STATUSES.REVIEWED;
}

export function canTransitionToReviewed(status: string) {
  return status === POST_STATUSES.IN_REVIEW;
}

export function canTransitionToPublished(status: string) {
  return (
    status === POST_STATUSES.DRAFT ||
    status === POST_STATUSES.IN_REVIEW ||
    status === POST_STATUSES.REVIEWED
  );
}

export function nextValidityDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
}
