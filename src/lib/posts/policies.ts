export type ListingViewer = {
  id: string;
  role: string;
  status?: string;
  email_verified_at?: Date | null;
} | null;

export function canCreateListing(viewer: ListingViewer): boolean {
  if (!viewer) return false;
  if (viewer.status !== "ACTIVE") return false;
  if (!viewer.email_verified_at) return false;
  return true;
}

export function canEditListing(postCreatedBy: string, viewer: ListingViewer): boolean {
  if (!viewer) return false;
  const isStaff = viewer.role === "ADMIN" || viewer.role === "MODERATOR";
  const isOwner = viewer.id === postCreatedBy;
  return isOwner || isStaff;
}

export function ownerEditRequiresReview(postCreatedBy: string, viewer: ListingViewer): boolean {
  if (!viewer) return false;
  const isStaff = viewer.role === "ADMIN" || viewer.role === "MODERATOR";
  const isOwner = viewer.id === postCreatedBy;
  return isOwner && !isStaff;
}
