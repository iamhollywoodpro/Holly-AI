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
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
        <Sparkles className="h-8 w-8 text-purple-400" />
        <span className="text-xl font-bold">HOLLY</span>
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
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
      <div className="border-t border-gray-800 p-4">
        <p className="text-xs text-gray-400">Holly AI Dashboard v1.0</p>
      </div>
    </div>
  );
}
