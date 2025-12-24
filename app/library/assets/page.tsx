import { LibraryPage } from '@/components/library/LibraryPage';

export default function AssetsPage() {
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
