import { LibraryPage } from '@/components/library/LibraryPage';

export default function CollectionsPage() {
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
