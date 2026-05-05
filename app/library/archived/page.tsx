import { auth } from '@clerk/nextjs/server';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function ArchivedPage() {
  await (await auth()).protect();
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
