/**
 * HOLLY AI - Autonomous Dashboard Page
 * 
 * Route: /dashboard/autonomous
 * 
 * Real-time monitoring of HOLLY's self-improvement systems
 */

import { Metadata } from 'next';
import { HollyAutonomousDashboard } from '@/components/dashboard/HollyAutonomousDashboard';

export const metadata: Metadata = {
  title: 'HOLLY Autonomous Dashboard',
  description: 'Real-time monitoring of HOLLY\'s self-improvement and evolution systems',
};

export default function AutonomousDashboardPage() {
  return (
    <main className="min-h-screen">
      <HollyAutonomousDashboard />
    </main>
  );
}
