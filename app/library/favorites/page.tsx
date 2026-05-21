import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function FavoritesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
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
