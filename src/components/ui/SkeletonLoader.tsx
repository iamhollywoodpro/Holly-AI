'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button';
  count?: number;
}

export function SkeletonLoader({ 
  className = '', 
  variant = 'text',
  count = 1 
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded';
  
  const variantClasses = {
    text: 'h-4 w-full',
    card: 'h-32 w-full',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24',
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 0.05 }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        animation: 'shimmer 2s infinite',
      }}
    />
  ));

  return count === 1 ? elements[0] : <div className="space-y-3">{elements}</div>;
}

export function SettingsSkeletonLoader() {
  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="space-y-2">
        <SkeletonLoader variant="text" className="w-1/3 h-8" />
        <SkeletonLoader variant="text" className="w-2/3 h-4" />
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonLoader variant="text" className="w-1/4" />
            <SkeletonLoader variant="card" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConversationSkeletonLoader() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30">
          <SkeletonLoader variant="avatar" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" className="w-3/4" />
            <SkeletonLoader variant="text" className="w-1/2 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RepoSkeletonLoader() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-lg bg-gray-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLoader variant="text" className="w-1/3" />
            <SkeletonLoader variant="button" className="w-16 h-6" />
          </div>
          <SkeletonLoader variant="text" className="w-full h-3" />
          <SkeletonLoader variant="text" className="w-2/3 h-3" />
        </div>
      ))}
    </div>
  );
}
