import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function ArchivedPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return (
    <LibraryPage
      title="Archived"
      description="Archived projects and assets"
      icon="Archive"
      emptyMessage="No archived items"
      type="archived"
    />
  );
}
