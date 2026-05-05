import { VideoStudio } from '@/components/capabilities/video-studio';

export const dynamic = 'force-dynamic';

export default function VideoGeneratorPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <VideoStudio />
    </div>
  );
}
