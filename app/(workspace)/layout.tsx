'use client';

import { Sidebar2 } from '@/components/navigation/Sidebar2';
import { WorkspaceHeader } from '@/components/navigation/WorkspaceHeader';
import { HollyEmotionProvider, useHollyEmotion } from '@/components/holly/HollyEmotionContext';
import { LivingBackground } from '@/components/holly/LivingBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

function WorkspaceInner({ children }: { children: React.ReactNode }) {
  const { emotion } = useHollyEmotion();
  const pathname = usePathname();

  return (
    <LivingBackground emotion={emotion} intensity={0.25}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground sdi-window-drag">
        
        {/* Navigation Sidebar */}
        <div className="sdi-window-no-drag max-h-screen">
          <Sidebar2 />
        </div>

        {/* Essential Content Container */}
        <div className="flex flex-1 flex-col overflow-hidden relative sdi-window-no-drag">
          <WorkspaceHeader />
          
          <main className="flex-1 overflow-hidden relative bg-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </LivingBackground>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HollyEmotionProvider>
      <WorkspaceInner>{children}</WorkspaceInner>
    </HollyEmotionProvider>
  );
}
