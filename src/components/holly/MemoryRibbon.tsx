'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Star, Target, Lightbulb, Music, Code2, Heart, Sparkles } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface MemoryChip {
  key: string;
  value: string;
  category?: string;
}

const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  experience:  { icon: Sparkles,   color: 'text-holly-gold bg-holly-gold/10 border-holly-gold/20' },
  goal:        { icon: Target,     color: 'text-holly-gold/80 bg-holly-gold/5 border-holly-gold/20' },
  learned:     { icon: Lightbulb,  color: 'text-holly-gold/90 bg-holly-gold/10 border-holly-gold/20' },
  preference:  { icon: Heart,      color: 'text-holly-crimson bg-holly-crimson/10 border-holly-crimson/20' },
  music:       { icon: Music,      color: 'text-holly-gold bg-holly-gold/10 border-holly-gold/30' },
  code:        { icon: Code2,      color: 'text-holly-gold/70 bg-holly-gold/5 border-holly-gold/10' },
  taste:       { icon: Star,       color: 'text-holly-gold bg-holly-gold/15 border-holly-gold/25' },
};

function getCategoryMeta(key: string) {
  const lower = key.toLowerCase();
  for (const [cat, meta] of Object.entries(CATEGORY_META)) {
    if (lower.includes(cat)) return meta;
  }
  return { icon: Brain, color: 'text-holly-ivory/40 bg-holly-ivory/5 border-holly-ivory/10' };
}

export function MemoryRibbon({ memories, className = '' }: { memories: Array<{ key: string; value: string }>; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [memories]);

  if (memories.length === 0) return null;

  const chips = memories.slice(0, 12);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-holly-void to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-holly-void to-transparent z-10 pointer-events-none" />
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-6 py-2 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-1 mr-1 flex-shrink-0">
          <Brain className="w-3 h-3 text-holly-gold" />
          <span className="text-[9px] font-semibold text-holly-gold uppercase tracking-wider">Memory</span>
        </div>
        <AnimatePresence>
          {chips.map((mem, i) => {
            const meta = getCategoryMeta(mem.key);
            const Icon = meta.icon;
            return (
              <motion.div
                key={`${mem.key}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border flex-shrink-0 cursor-default ${meta.color}`}
                title={`${mem.key}: ${mem.value}`}
              >
                <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="text-[9px] font-medium max-w-[120px] truncate">{mem.value || mem.key}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
