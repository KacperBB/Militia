import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getCurrentSession } from "@/lib/auth/session";

const f = createUploadthing();

const authMiddleware = async () => {
  const session = await getCurrentSession();

  if (!session) {
    throw new UploadThingError("Unauthorized");
  }

  return {
    userId: session.user.id,
    role: session.user.role,
  };
};

export const uploadRouter = {
  avatarUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        role: metadata.role,
        fileKey: file.key,
        fileUrl: file.ufsUrl,
      };
    }),
  bannerUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        role: metadata.role,
        fileKey: file.key,
        fileUrl: file.ufsUrl,
      };
    }),
  listingImageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 10,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        role: metadata.role,
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
