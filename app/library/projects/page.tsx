import { auth } from '@clerk/nextjs/server';
import { LibraryPage } from '@/components/library/LibraryPage';

export default async function ProjectsPage() {
  await (await auth()).protect();
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
