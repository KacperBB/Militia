import { CreatePostForm } from "@/components/posts/create-post-form";
import { getCreatePostPageData } from "@/lib/posts/create-post-page-data";

export default async function CreateListingPage() {
  const { categories, isEmailVerified } = await getCreatePostPageData();

  return (
    <main className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <CreatePostForm categories={categories} isEmailVerified={isEmailVerified} />
    </main>
  );
}