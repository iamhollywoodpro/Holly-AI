import { Sidebar2 } from '@/components/navigation/Sidebar2';
import { WorkspaceHeader } from '@/components/navigation/WorkspaceHeader';

export default function EvolutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar2 />
      <div className="flex flex-1 flex-col overflow-hidden">
        <WorkspaceHeader />
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
          {children}
        </main>
      </div>
    </div>
  );
}
