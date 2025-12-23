import { Film } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';
export const dynamic = 'force-dynamic';


export default function ScreenwritingPage() {
  return (
    <ComingSoon
      icon={Film}
      title="Screenwriting Assistant"
      description="Professional screenwriting tools for film, TV, and video content."
      features={[
        'Industry-standard formatting',
        'Character development tools',
        'Scene breakdown and analysis',
        'Dialogue enhancement',
        'Export to Final Draft and PDF',
      ]}
    />
  );
}
