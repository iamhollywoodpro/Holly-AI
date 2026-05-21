import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return (
    <LibraryPage
      title="Projects"
      description="All your creative projects"
      icon="FolderOpen"
      emptyMessage="No projects yet"
      type="projects"
    />
  );
}
