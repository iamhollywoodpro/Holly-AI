/**
 * HOLLY CAPABILITY MONITORING DASHBOARD
 * Real-time view of all HOLLY capabilities
 * Alerts when capabilities drop below threshold
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface ToolCategory {
  name: string;
  tools: string[];
  expected: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface CapabilityStatus {
  totalTools: number;
  expectedTools: number;
  coverage: number;
  categories: ToolCategory[];
  lastChecked: string;
  trend: 'up' | 'down' | 'stable';
}

export default function CapabilityMonitorDashboard() {
  const [status, setStatus] = useState<CapabilityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    fetchCapabilityStatus();
    const interval = setInterval(fetchCapabilityStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchCapabilityStatus = async () => {
    try {
      const response = await fetch('/api/admin/capability-monitor');
      const data = await response.json();
      
      setStatus(data);
      setHistory(prev => [...prev.slice(-9), data.totalTools]);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch capability status:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading capability status...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>Unable to load capability status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (coverage: number) => {
    if (coverage >= 95) return 'text-green-600';
    if (coverage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (categoryStatus: 'healthy' | 'warning' | 'critical') => {
    const variants = {
      healthy: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      critical: 'bg-red-100 text-red-700',
    };
    
    return <Badge className={variants[categoryStatus]}>{categoryStatus}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={status.coverage < 85 ? 'border-red-300' : 'border-green-300'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🛡️ HOLLY Capability Monitor
                {status.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
                {status.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Real-time monitoring of all AI capabilities
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getStatusColor(status.coverage)}`}>
                {status.coverage}%
              </div>
              <div className="text-sm text-muted-foreground">
                {status.totalTools}/{status.expectedTools} tools
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Alert Banner */}
            {status.coverage < 85 && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="font-semibold text-red-900">
                    CRITICAL: Capability Loss Detected
                  </div>
                  <div className="text-sm text-red-700">
                    HOLLY is missing {status.expectedTools - status.totalTools} capabilities. 
                    Core functionality may be impaired.
                  </div>
                </div>
              </div>
            )}

            {status.coverage >= 95 && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div className="text-green-900">
                  All systems operational. HOLLY is at full capacity.
                </div>
              </div>
            )}

            {/* Mini Chart */}
            <div className="flex items-end gap-1 h-20">
              {history.map((count, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    count >= 60 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${(count / status.expectedTools) * 100}%` }}
                  title={`${count} tools`}
                />
              ))}
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Last 10 checks (every minute)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {status.categories.map((category) => (
          <Card key={category.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{category.name}</CardTitle>
                {getStatusBadge(category.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tools:</span>
                  <span className="font-semibold">
                    {category.tools.length}/{category.expected}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {category.tools.map((tool) => (
                    <div key={tool} className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      {tool}
                    </div>
                  ))}
                </div>

                {category.tools.length < category.expected && (
                  <div className="text-xs text-red-600 flex items-center gap-1 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    Missing {category.expected - category.tools.length} tools
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Last checked: {new Date(status.lastChecked).toLocaleString()}</div>
            <div>Auto-refresh: Every 60 seconds</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
