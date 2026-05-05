import { auth } from '@clerk/nextjs/server';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function FavoritesPage() {
  await (await auth()).protect();
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
