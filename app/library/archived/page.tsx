import { LibraryPage } from '@/components/library/LibraryPage';

export default function ArchivedPage() {
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
