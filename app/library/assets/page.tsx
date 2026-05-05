import { auth } from '@clerk/nextjs/server';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function AssetsPage() {
  await (await auth()).protect();
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
