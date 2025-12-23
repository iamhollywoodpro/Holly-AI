import { Mic } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';
export const dynamic = 'force-dynamic';


export default function SongwritingPage() {
  return (
    <ComingSoon
      icon={Mic}
      title="Songwriting Assistant"
      description="AI-powered songwriting tools to help you craft perfect lyrics and melodies."
      features={[
        'Lyric generation and editing',
        'Rhyme and meter suggestions',
        'Song structure templates',
        'Melody composition',
        'Collaboration tools',
      ]}
    />
  );
}
