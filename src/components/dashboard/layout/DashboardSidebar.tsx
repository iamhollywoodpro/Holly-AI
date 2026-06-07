'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Palette,
  BarChart3,
  Shield,
  Network,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Creative Studio', href: '/dashboard/creative', icon: Palette },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Security', href: '/dashboard/security', icon: Shield },
  { name: 'Orchestration', href: '/dashboard/orchestration', icon: Network },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-[#141210] text-[#F5F0E8]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-white/5">
        <Sparkles className="h-8 w-8 text-[#66CCCC]" />
        <span className="text-xl font-bold tracking-tight">HOLLY</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-colors duration-200
                ${
                  isActive
                    ? 'bg-[#66CCCC]/20 text-[#3DAF76] border border-[#66CCCC]/30'
                    : 'text-[#8C8476] hover:bg-white/5 hover:text-[#F5F0E8]'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4">
        <p className="text-xs text-[#5C564D]">Holly AI Dashboard v1.0</p>
      </div>
    </div>
  );
}
