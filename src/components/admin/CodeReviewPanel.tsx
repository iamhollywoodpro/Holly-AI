'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Shield,
  Zap,
  RefreshCw,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface CodeReview {
  id: string;
  commitSha: string;
  branch: string;
  author: string;
  status: string;
  overallScore: number;
  qualityScore: number;
  securityScore: number;
  performanceScore: number;
  maintainabilityScore: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  suggestions: number;
  autoApproved: boolean;
  createdAt: string;
  pullRequestUrl?: string;
}

export default function CodeReviewPanel() {
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, changesRequested: 0, avgScore: 0 });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/code-review'
        : `/api/admin/code-review?status=${statusFilter}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats || { total: 0, pending: 0, approved: 0, changesRequested: 0, avgScore: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch code reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveReview = async (reviewId: string) => {
    try {
      const res = await fetch('/api/admin/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reviewId }),
      });
      
      if (res.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to approve review:', error);
    }
  };

  const rejectReview = async (reviewId: string) => {
    const reason = prompt('Reason for requesting changes:');
    if (!reason) return;
    
    try {
      const res = await fetch('/api/admin/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reviewId, reason }),
      });
      
      if (res.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to reject review:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'changes_requested': return 'bg-red-500';
      case 'commented': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Code Review</h2>
          <p className="text-muted-foreground">Automated code quality and security analysis</p>
        </div>
        <Button onClick={fetchReviews} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.approved / stats.total) * 100).toFixed(1)}%` : '0%'} approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Changes Requested</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.changesRequested}</div>
            <p className="text-xs text-muted-foreground">Need revisions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {stats.avgScore.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="commented">Commented</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading code reviews...</div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No code reviews found
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold ${getScoreColor(review.overallScore)}`}>
                        {review.overallScore.toFixed(0)}
                      </div>
                      <div>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {review.commitSha.substring(0, 8)}
                        </code>
                        <div className="text-sm text-muted-foreground mt-1">
                          {review.branch} • {review.author}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.autoApproved && (
                        <Badge variant="outline" className="bg-green-50">
                          Auto-approved
                        </Badge>
                      )}
                      <Badge className={getStatusColor(review.status)}>
                        {review.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Code2 className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Quality</span>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(review.qualityScore)}`}>
                        {review.qualityScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(review.qualityScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${review.qualityScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Security</span>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(review.securityScore)}`}>
                        {review.securityScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(review.securityScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${review.securityScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Performance</span>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(review.performanceScore)}`}>
                        {review.performanceScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(review.performanceScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${review.performanceScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Code2 className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Maintainability</span>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(review.maintainabilityScore)}`}>
                        {review.maintainabilityScore.toFixed(0)}
                      </div>
                      <div className={`h-2 rounded-full ${getScoreBackground(review.maintainabilityScore)} mt-1`}>
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${review.maintainabilityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Issues Summary */}
                  <div className="flex items-center gap-6 text-sm border-t pt-4">
                    {review.criticalIssues > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="font-semibold">{review.criticalIssues} Critical</span>
                      </div>
                    )}
                    {review.majorIssues > 0 && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-semibold">{review.majorIssues} Major</span>
                      </div>
                    )}
                    {review.minorIssues > 0 && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{review.minorIssues} Minor</span>
                      </div>
                    )}
                    {review.suggestions > 0 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Zap className="h-4 w-4" />
                        <span>{review.suggestions} Suggestions</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {review.pullRequestUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(review.pullRequestUrl, '_blank')}
                      >
                        View PR
                      </Button>
                    )}
                    {review.status === 'pending' || review.status === 'commented' ? (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => approveReview(review.id)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => rejectReview(review.id)}
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Request Changes
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline">
                        Review {review.status}
                      </Badge>
                    )}
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
