import { LibraryPage } from '@/components/library/LibraryPage';

export default function FavoritesPage() {
  return (
    <LibraryPage
      title="Favorites"
      description="Your starred items"
      icon="Star"
      emptyMessage="No favorites yet"
      type="favorites"
    />
  );
}
