import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function CollectionsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return (
    <LibraryPage
      title="Collections"
      description="Organized groups of items"
      icon="Layers"
      emptyMessage="No collections yet"
      type="collections"
    />
  );
}
