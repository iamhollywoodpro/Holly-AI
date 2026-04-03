import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import EvolutionDashboard from '@/components/evolution/EvolutionDashboard';
import FeaturePageShell from '@/components/layout/FeaturePageShell';

export const metadata = {
  title: 'HOLLY — Evolution Dashboard',
  description: "Live view of HOLLY's growth, identity, and learning",
};

export default async function EvolutionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <FeaturePageShell
      title="Evolution"
      description="Live view of HOLLY's growth, identity, and learning"
      icon={<span className="text-sm">🧬</span>}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <EvolutionDashboard />
      </div>
    </FeaturePageShell>
  );
}
