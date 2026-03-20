import { CreatePostForm } from "@/components/posts/create-post-form";
import { getCurrentSession } from "@/lib/auth/session";
import { getEditPostPageData } from "@/lib/posts/edit-post-page-data";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await getCurrentSession();
  const { postId } = await params;
  const { categories, isEmailVerified, currentUser, initialData } = await getEditPostPageData(postId);

  const successRedirectPath = ["ADMIN", "MODERATOR"].includes(session?.user.role ?? "")
    ? "/dashboard/moderator/listings"
    : "/dashboard/user/listings";

  return (
    <main className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <CreatePostForm
        categories={categories}
        isEmailVerified={isEmailVerified}
        currentUser={currentUser}
        initialData={initialData}
        successRedirectPath={successRedirectPath}
      />
    </main>
  );
}