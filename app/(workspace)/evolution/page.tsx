import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import EvolutionDashboard from '@/components/evolution/EvolutionDashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'HOLLY — Evolution Dashboard',
  description: "Live view of HOLLY's growth, identity, and learning",
};

export default async function EvolutionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <EvolutionDashboard />
    </div>
  );
}
