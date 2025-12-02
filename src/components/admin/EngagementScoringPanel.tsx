'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface EngagementScore {
  id: string;
  clerkUserId: string;
  overallScore: number;
  activityScore: number;
  frequencyScore: number;
  recencyScore: number;
  depthScore: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalEvents: number;
  featuresUsed: number;
  lastActive?: string;
  activeStreak: number;
  longestStreak: number;
  trend: string;
  riskLevel: string;
  churnProbability: number;
  calculatedAt: string;
}

export default function EngagementScoringPanel() {
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<EngagementScore[]>([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('overallScore');

  useEffect(() => {
    fetchEngagementScores();
  }, []);

  const fetchEngagementScores = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/personalization?action=engagement_scores');
      if (res.ok) {
        const data = await res.json();
        setScores(data.scores || []);
      }
    } catch (error) {
      console.error('Failed to fetch engagement scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculateScore = async (clerkUserId: string) => {
    try {
      await fetch('/api/user/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recalculate_engagement',
          clerkUserId,
        }),
      });
      fetchEngagementScores();
    } catch (error) {
      console.error('Failed to recalculate score:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'new':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    if (score >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 75) return 'bg-green-100';
    if (score >= 50) return 'bg-blue-100';
    if (score >= 25) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins > 0 ? `${mins}m` : `${seconds}s`;
  };

  const formatLastActive = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const filteredScores = scores.filter(score => {
    if (filter === 'all') return true;
    if (filter === 'high_risk') return score.riskLevel === 'high';
    if (filter === 'growing') return score.trend === 'growing';
    if (filter === 'declining') return score.trend === 'declining';
    return true;
  });

  const sortedScores = [...filteredScores].sort((a, b) => {
    if (sortBy === 'overallScore') return b.overallScore - a.overallScore;
    if (sortBy === 'churnRisk') return b.churnProbability - a.churnProbability;
    if (sortBy === 'activity') return b.totalSessions - a.totalSessions;
    return 0;
  });

  const stats = {
    avgScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length : 0,
    highRisk: scores.filter(s => s.riskLevel === 'high').length,
    growing: scores.filter(s => s.trend === 'growing').length,
    avgStreak: scores.length > 0 ? scores.reduce((sum, s) => sum + s.activeStreak, 0) / scores.length : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Engagement Scoring</h2>
          <p className="text-muted-foreground">Monitor user engagement and churn risk</p>
        </div>
        <Button onClick={fetchEngagementScores} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growing Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.growing}</div>
            <p className="text-xs text-muted-foreground">Improving engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Streak</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgStreak)}</div>
            <p className="text-xs text-muted-foreground">Days active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter:</span>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Users</option>
            <option value="high_risk">High Risk</option>
            <option value="growing">Growing</option>
            <option value="declining">Declining</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="overallScore">Overall Score</option>
            <option value="churnRisk">Churn Risk</option>
            <option value="activity">Activity Level</option>
          </select>
        </div>
      </div>

      {/* Scores List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading engagement scores...</div>
        ) : sortedScores.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No engagement scores found
            </CardContent>
          </Card>
        ) : (
          sortedScores.map(score => (
            <Card key={score.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold ${getScoreColor(score.overallScore)}`}>
                        {score.overallScore.toFixed(0)}
                      </div>
                      <div>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {score.clerkUserId.slice(0, 12)}...
                        </code>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {getTrendIcon(score.trend)}
                            <span className="text-sm capitalize">{score.trend}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getRiskIcon(score.riskLevel)}
                            <span className="text-sm capitalize">{score.riskLevel} Risk</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => recalculateScore(score.clerkUserId)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recalculate
                    </Button>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Activity</div>
                      <div className={`text-xl font-bold ${getScoreColor(score.activityScore)}`}>
                        {score.activityScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(score.activityScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${score.activityScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Frequency</div>
                      <div className={`text-xl font-bold ${getScoreColor(score.frequencyScore)}`}>
                        {score.frequencyScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(score.frequencyScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${score.frequencyScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Recency</div>
                      <div className={`text-xl font-bold ${getScoreColor(score.recencyScore)}`}>
                        {score.recencyScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(score.recencyScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${score.recencyScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Depth</div>
                      <div className={`text-xl font-bold ${getScoreColor(score.depthScore)}`}>
                        {score.depthScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(score.depthScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${score.depthScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-5 gap-4 text-sm border-t pt-4">
                    <div>
                      <div className="text-muted-foreground">Sessions</div>
                      <div className="font-semibold">{score.totalSessions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Duration</div>
                      <div className="font-semibold">{formatDuration(Math.round(score.avgSessionDuration))}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Events</div>
                      <div className="font-semibold">{score.totalEvents}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Features Used</div>
                      <div className="font-semibold">{score.featuresUsed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Active</div>
                      <div className="font-semibold">{formatLastActive(score.lastActive)}</div>
                    </div>
                  </div>

                  {/* Streaks & Churn */}
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <Zap className="h-4 w-4 inline mr-1 text-yellow-500" />
                        <span className="text-muted-foreground">Current Streak:</span>
                        <span className="ml-2 font-semibold">{score.activeStreak} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Best Streak:</span>
                        <span className="ml-2 font-semibold">{score.longestStreak} days</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Churn Risk:</span>
                      <Badge variant={score.churnProbability > 0.7 ? 'destructive' : 'secondary'}>
                        {(score.churnProbability * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
