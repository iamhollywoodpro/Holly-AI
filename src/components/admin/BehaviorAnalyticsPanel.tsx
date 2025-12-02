'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  MousePointer, 
  Eye, 
  Clock, 
  TrendingUp,
  Users,
  Map,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface Session {
  id: string;
  sessionId: string;
  clerkUserId: string;
  device?: string;
  browser?: string;
  country?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  pageViews: number;
  eventsCount: number;
  converted: boolean;
  landingPage?: string;
  exitPage?: string;
}

interface Event {
  id: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  page: string;
  timestamp: string;
  eventCategory?: string;
}

interface Journey {
  id: string;
  journeyName: string;
  status: string;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export default function BehaviorAnalyticsPanel() {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgDuration: 0,
    totalEvents: 0,
    conversionRate: 0,
  });
  const [timeRange, setTimeRange] = useState('7d');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchBehaviorData();
  }, [timeRange]);

  const fetchBehaviorData = async () => {
    setLoading(true);
    try {
      // Fetch sessions
      const sessionsRes = await fetch(`/api/user/behavior?action=sessions&range=${timeRange}`);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
        
        // Calculate stats
        const totalSessions = data.sessions?.length || 0;
        const avgDuration = totalSessions > 0 
          ? data.sessions.reduce((sum: number, s: Session) => sum + (s.duration || 0), 0) / totalSessions
          : 0;
        const totalEvents = data.sessions?.reduce((sum: number, s: Session) => sum + s.eventsCount, 0) || 0;
        const conversions = data.sessions?.filter((s: Session) => s.converted).length || 0;
        const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

        setStats({
          totalSessions,
          avgDuration: Math.round(avgDuration),
          totalEvents,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
        });
      }

      // Fetch recent events
      const eventsRes = await fetch(`/api/user/behavior?action=events&limit=50`);
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }

      // Fetch journeys
      const journeysRes = await fetch(`/api/user/behavior?action=journeys&range=${timeRange}`);
      if (journeysRes.ok) {
        const data = await journeysRes.json();
        setJourneys(data.journeys || []);
      }
    } catch (error) {
      console.error('Failed to fetch behavior data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  const filteredSessions = sessions.filter(s => 
    !filter || 
    s.sessionId.includes(filter) || 
    s.device?.toLowerCase().includes(filter.toLowerCase()) ||
    s.country?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Behavior Analytics</h2>
          <p className="text-muted-foreground">Track user sessions, events, and journeys</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button onClick={fetchBehaviorData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active user sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">User interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Sessions converted</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">
            <Eye className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="events">
            <MousePointer className="h-4 w-4 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="journeys">
            <Map className="h-4 w-4 mr-2" />
            Journeys
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Sessions</CardTitle>
              <CardDescription>Active and completed user sessions</CardDescription>
              <div className="flex items-center gap-2 mt-4">
                <Input 
                  placeholder="Filter by session ID, device, country..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="max-w-sm"
                />
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No sessions found</div>
                ) : (
                  filteredSessions.map(session => (
                    <div key={session.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">{session.sessionId.slice(0, 8)}...</code>
                          {session.converted && (
                            <Badge className="bg-green-500">Converted</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(session.startedAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Device:</span>
                          <span className="ml-2 font-medium">{session.device || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Browser:</span>
                          <span className="ml-2 font-medium">{session.browser || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <span className="ml-2 font-medium">{session.country || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-2 font-medium">{formatDuration(session.duration)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <Activity className="h-4 w-4 inline mr-1" />
                          <span>{session.eventsCount} events</span>
                        </div>
                        <div>
                          <Eye className="h-4 w-4 inline mr-1" />
                          <span>{session.pageViews} page views</span>
                        </div>
                      </div>

                      {session.landingPage && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Landing:</span>
                          <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{session.landingPage}</code>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest user interactions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No events found</div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{event.eventType}</Badge>
                        <div>
                          <div className="font-medium">{event.eventName}</div>
                          <div className="text-sm text-muted-foreground">{event.page}</div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journeys Tab */}
        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Journeys</CardTitle>
              <CardDescription>Track user progression through key workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading journeys...</div>
                ) : journeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No journeys found</div>
                ) : (
                  journeys.map(journey => (
                    <div key={journey.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{journey.journeyName}</h4>
                          <Badge className={getStatusColor(journey.status)}>
                            {journey.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(journey.startedAt)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress:</span>
                          <span className="font-medium">
                            {journey.completedSteps} / {journey.totalSteps} steps
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(journey.completedSteps / journey.totalSteps) * 100}%` }}
                          />
                        </div>

                        <div className="text-sm">
                          <span className="text-muted-foreground">Current Step:</span>
                          <span className="ml-2 font-medium">{journey.currentStep}</span>
                        </div>

                        {journey.duration && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="ml-2 font-medium">{formatDuration(journey.duration)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
