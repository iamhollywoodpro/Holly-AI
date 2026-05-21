import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function AssetsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return (
    <LibraryPage
      title="Assets"
      description="Generated images, videos, and music"
      icon="Image"
      emptyMessage="No assets yet"
      type="assets"
    />
  );
}
