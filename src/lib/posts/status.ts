import { db } from "@/lib/db";
import {
  POST_STATUSES,
  type PostStatus,
  canTransitionToPublished,
  canTransitionToReview,
  canTransitionToReviewed,
  nextValidityDate,
} from "@/lib/posts/status-rules";

export {
  POST_STATUSES,
  type PostStatus,
  canTransitionToPublished,
  canTransitionToReview,
  canTransitionToReviewed,
  nextValidityDate,
};

export async function applyPostLifecycle() {
  // Auto-renew published listings that reached expiration.
  await db.$executeRaw`
    UPDATE "posts"
    SET "expires_at" = NOW() + INTERVAL '30 days',
        "updated_at" = NOW()
    WHERE "deleted_at" IS NULL
      AND "status" = 'PUBLISHED'
      AND "auto_renew" = true
      AND "expires_at" IS NOT NULL
      AND "expires_at" <= NOW()
  `;

  // Auto-cancel non-renewed published listings after their validity period.
  await db.posts.updateMany({
    where: {
      deleted_at: null,
      status: POST_STATUSES.PUBLISHED,
      auto_renew: false,
      expires_at: { lte: new Date() },
    },
    data: {
      status: POST_STATUSES.CANCELLED,
    },
  });
}

