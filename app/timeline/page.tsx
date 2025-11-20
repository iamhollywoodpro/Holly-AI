import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProjectTimeline from '@/components/timeline/ProjectTimeline';

export default async function TimelinePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  return <ProjectTimeline />;
}
