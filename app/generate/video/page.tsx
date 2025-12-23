import { Video } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';

export const dynamic = 'force-dynamic';

export default function VideoGeneratorPage() {
  return (
    <ComingSoon
      icon={Video}
      title="Video Generator"
      description="Create stunning videos from text descriptions, images, or music tracks."
      features={[
        'Text-to-video generation',
        'Image-to-video animation',
        'Music video creation',
        'Custom styles and effects',
        'HD and 4K export',
      ]}
    />
  );
}
