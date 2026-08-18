import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ExtensionsStore from '@/components/extensions/ExtensionsStore';

export const dynamic = 'force-dynamic';

export default async function ExtensionsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }
  return <ExtensionsStore />;
}
