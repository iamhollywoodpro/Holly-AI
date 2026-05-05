'use client';

import Link from 'next/link';
import { LucideIcon, ArrowLeft } from 'lucide-react';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
}

export function ComingSoon({ icon: Icon, title, description, features }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
          <Icon className="w-10 h-10 text-purple-400" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
        
        {/* Description */}
        <p className="text-xl text-gray-400 mb-8">{description}</p>

        {/* Features */}
        {features && features.length > 0 && (
          <div className="mb-8 p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Coming Features:</h2>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="text-gray-300 flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Badge */}
        <div className="inline-block px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-8">
          Coming Soon
        </div>

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
