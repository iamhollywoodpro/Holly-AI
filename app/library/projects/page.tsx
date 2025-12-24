import { LibraryPage } from '@/components/library/LibraryPage';

export default function ProjectsPage() {
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
