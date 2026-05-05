'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Map,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Filter
} from 'lucide-react';

interface Journey {
  id: string;
  journeyName: string;
  clerkUserId: string;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  status: string;
  completed: boolean;
  abandoned: boolean;
  startedAt: string;
  completedAt?: string;
  abandonedAt?: string;
  duration?: number;
  steps: any;
  dropOffStep?: string;
  dropOffReason?: string;
}

interface JourneyStats {
  journeyName: string;
  total: number;
  completed: number;
  abandoned: number;
  inProgress: number;
  completionRate: number;
  avgDuration: number;
  commonDropOff?: string;
}

export default function UserJourneyPanel() {
  const [loading, setLoading] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [stats, setStats] = useState<JourneyStats[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchJourneys();
    fetchJourneyStats();
  }, []);

  const fetchJourneys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/behavior?action=journeys&limit=100');
      if (res.ok) {
        const data = await res.json();
        setJourneys(data.journeys || []);
      }
    } catch (error) {
      console.error('Failed to fetch journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJourneyStats = async () => {
    try {
      const res = await fetch('/api/user/behavior?action=journey_stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Failed to fetch journey stats:', error);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'abandoned': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'abandoned':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredJourneys = journeys.filter(j => {
    if (selectedJourney !== 'all' && j.journeyName !== selectedJourney) return false;
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    return true;
  });

  const uniqueJourneyNames = Array.from(new Set(journeys.map(j => j.journeyName)));

  const overallStats = {
    total: journeys.length,
    completed: journeys.filter(j => j.completed).length,
    abandoned: journeys.filter(j => j.abandoned).length,
    inProgress: journeys.filter(j => j.status === 'in_progress').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Journeys</h2>
          <p className="text-muted-foreground">Track user progression through workflows</p>
        </div>
        <Button onClick={fetchJourneys} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Journeys</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total}</div>
            <p className="text-xs text-muted-foreground">All tracked journeys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.total > 0 ? `${((overallStats.completed / overallStats.total) * 100).toFixed(1)}%` : '0%'} completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.abandoned}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.total > 0 ? `${((overallStats.abandoned / overallStats.total) * 100).toFixed(1)}%` : '0%'} drop-off
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>
      </div>

      {/* Journey Type Stats */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Journey Performance</CardTitle>
            <CardDescription>Completion rates by journey type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Map className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">{stat.journeyName}</div>
                        <div className="text-sm text-muted-foreground">
                          {stat.total} journeys • Avg {formatDuration(stat.avgDuration)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stat.completionRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">completion</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{stat.completed} completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{stat.abandoned} abandoned</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>{stat.inProgress} in progress</span>
                    </div>
                    {stat.commonDropOff && (
                      <div className="ml-auto text-muted-foreground">
                        Drop-off: {stat.commonDropOff}
                      </div>
                    )}
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" 
                      style={{ width: `${stat.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Journey:</span>
          <select 
            value={selectedJourney}
            onChange={(e) => setSelectedJourney(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Journeys</option>
            {uniqueJourneyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {/* Journeys List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading journeys...</div>
        ) : filteredJourneys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No journeys found
            </CardContent>
          </Card>
        ) : (
          filteredJourneys.map(journey => (
            <Card key={journey.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(journey.status)}
                      <div>
                        <div className="font-semibold">{journey.journeyName}</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {journey.clerkUserId.slice(0, 12)}...
                        </code>
                      </div>
                    </div>
                    <Badge className={getStatusColor(journey.status)}>
                      {journey.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Step {journey.completedSteps} of {journey.totalSteps}
                      </span>
                      <span className="font-medium">
                        {((journey.completedSteps / journey.totalSteps) * 100).toFixed(0)}% complete
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          journey.completed ? 'bg-green-500' : 
                          journey.abandoned ? 'bg-red-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${(journey.completedSteps / journey.totalSteps) * 100}%` }}
                      />
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Current Step:</span>
                      <span className="ml-2 font-medium">{journey.currentStep}</span>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div className="font-medium">{formatTimestamp(journey.startedAt)}</div>
                    </div>
                    {journey.completedAt && (
                      <div>
                        <div className="text-muted-foreground">Completed</div>
                        <div className="font-medium">{formatTimestamp(journey.completedAt)}</div>
                      </div>
                    )}
                    {journey.abandonedAt && (
                      <div>
                        <div className="text-muted-foreground">Abandoned</div>
                        <div className="font-medium">{formatTimestamp(journey.abandonedAt)}</div>
                      </div>
                    )}
                    {journey.duration && (
                      <div>
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">{formatDuration(journey.duration)}</div>
                      </div>
                    )}
                  </div>

                  {/* Drop-off Info */}
                  {journey.dropOffStep && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-semibold text-red-700">Drop-off Point</div>
                          <div className="text-red-600">
                            Step: {journey.dropOffStep}
                            {journey.dropOffReason && ` • Reason: ${journey.dropOffReason}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
