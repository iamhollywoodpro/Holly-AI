import { Music } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';

export default function MusicGeneratorPage() {
  return (
    <ComingSoon
      icon={Music}
      title="Music Generator"
      description="Generate original music tracks from text prompts or reference tracks."
      features={[
        'Text-to-music generation',
        'Genre and style selection',
        'Custom instrumentation',
        'Stem separation',
        'Professional quality audio',
      ]}
    />
  );
}
