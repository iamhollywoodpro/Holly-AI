import { auth } from '@clerk/nextjs/server';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function CollectionsPage() {
  await (await auth()).protect();
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
