import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { BuilderWorkspace } from '@/components/builder/BuilderWorkspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Builder — HOLLY',
  description: 'Build any app, website, or tool from plain English. Powered by HOLLY.',
};

export default async function BuilderPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return <BuilderWorkspace />;
}
