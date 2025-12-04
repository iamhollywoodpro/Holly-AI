'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function StatusPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  async function checkHealth() {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setLastCheck(new Date());
    } catch (error) {
      setHealth({ status: 'error', message: 'Failed to fetch health status' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">HOLLY System Status</h1>
        <p className="text-gray-600">Real-time health monitoring for all services</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Overall Status</CardTitle>
            <CardDescription>
              Last checked: {lastCheck.toLocaleTimeString()}
            </CardDescription>
          </div>
          <Button 
            onClick={checkHealth} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!health ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(health.status)}`}>
              <div className="text-2xl font-bold flex items-center gap-2">
                {getStatusEmoji(health.status)}
                <span className="capitalize">{health.status}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {health?.services && (
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
            <CardDescription>Individual component health checks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(health.services).map(([service, details]: [string, any]) => (
                <div 
                  key={service}
                  className={`p-4 rounded-lg border ${getStatusColor(details.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusEmoji(details.status)}</span>
                      <span className="font-semibold capitalize">{service}</span>
                    </div>
                    <span className="text-sm font-medium capitalize">{details.status}</span>
                  </div>
                  {details.message && (
                    <div className="mt-2 text-sm opacity-80">
                      {details.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm">📊 What This Monitors</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>✅ Database connectivity (Prisma + NeonDB)</div>
          <div>✅ Environment variables (API keys, tokens)</div>
          <div>✅ External API health (HuggingFace)</div>
          <div>✅ System readiness for image/video/music generation</div>
        </CardContent>
      </Card>
    </div>
  );
}
