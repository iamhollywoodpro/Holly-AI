import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import EvolutionDashboard from '@/components/evolution/EvolutionDashboard';

export const metadata = {
  title: 'HOLLY — Evolution Dashboard',
  description: 'Live view of HOLLY\'s growth, identity, and learning',
};

export default async function EvolutionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <EvolutionDashboard />;
}
