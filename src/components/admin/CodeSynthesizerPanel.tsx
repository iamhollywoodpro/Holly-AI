'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { 
  Code, 
  Sparkles, 
  FileCode, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Copy,
  RefreshCw,
  Play,
  Pause,
  Terminal,
  Shield,
  Zap,
  GitBranch,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

// Types
interface GeneratedCode {
  id: string;
  language: string;
  code: string;
  filePath: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  linesOfCode: number;
  complexity: number;
  testCoverage: number;
  securityScore: number;
  testsPass: boolean;
  securityIssues: number;
  lintErrors: number;
  createdAt: string;
  updatedAt: string;
}

interface GenerationJob {
  id: string;
  jobType: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  input: any;
  prompt: string;
  language: string;
  cognitiveContext: any;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  tokensUsed: number | null;
  cost: number;
  error: string | null;
  generatedCodeId: string | null;
}

interface CodePattern {
  id: string;
  name: string;
  patternType: 'DESIGN_PATTERN' | 'CODE_SMELL' | 'BEST_PRACTICE' | 'ANTI_PATTERN';
  language: string;
  pattern: string;
  confidence: number;
  occurrenceCount: number;
}

const CodeSynthesizerPanel: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'generate' | 'review' | 'jobs' | 'history'>('generate');
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [patterns, setPatterns] = useState<CodePattern[]>([]);
  const [selectedCode, setSelectedCode] = useState<GeneratedCode | null>(null);

  // Form State
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [framework, setFramework] = useState('nextjs');
  const [filePath, setFilePath] = useState('');
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    avgComplexity: 0,
    avgSecurityScore: 0
  });

  // Fetch data
  useEffect(() => {
    fetchGeneratedCodes();
    fetchJobs();
    fetchStats();
    fetchPatterns();
  }, []);

  const fetchGeneratedCodes = async () => {
    try {
      const res = await fetch('/api/admin/builder/generate?limit=50');
      const data = await res.json();
      setGeneratedCodes(data.codes || []);
    } catch (error) {
      console.error('Failed to fetch generated codes:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/admin/builder/generate?type=jobs&limit=20');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/builder/generate?type=stats');
      const data = await res.json();
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPatterns = async () => {
    try {
      const res = await fetch('/api/admin/builder/patterns?limit=10');
      const data = await res.json();
      setPatterns(data.patterns || []);
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
    }
  };

  // Generate Code
  const handleGenerate = async () => {
    if (!prompt || !language) {
      alert('Please provide prompt and language');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          language,
          framework,
          filePath: filePath || undefined,
          riskLevel,
          cognitiveContext: {
            framework,
            patterns: patterns.filter(p => p.language === language).map(p => p.name)
          }
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Code generation started!');
        setPrompt('');
        setFilePath('');
        fetchJobs();
        fetchGeneratedCodes();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  // Approve/Reject Code
  const handleApproval = async (codeId: string, approved: boolean, feedback?: string) => {
    try {
      const res = await fetch(`/api/admin/builder/generate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeId,
          approvalStatus: approved ? 'APPROVED' : 'REJECTED',
          feedback
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`Code ${approved ? 'approved' : 'rejected'} successfully!`);
        fetchGeneratedCodes();
        fetchStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to update approval:', error);
      alert('Failed to update approval');
    }
  };

  // Copy Code
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  // Download Code
  const downloadCode = (code: GeneratedCode) => {
    const blob = new Blob([code.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = code.filePath || `generated-${code.language}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Risk Badge
  const getRiskBadge = (risk: string) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[risk as keyof typeof colors]}>{risk}</Badge>;
  };

  // Status Badge
  const getStatusBadge = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      REVIEW: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      QUEUED: 'bg-purple-100 text-purple-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[status as keyof typeof colors]}>{status}</Badge>;
  };

  // Quality Score Color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Code className="w-8 h-8 text-purple-600" />
            Code Synthesizer
          </h2>
          <p className="text-gray-600 mt-1">
            AI-powered code generation with approval workflow
          </p>
        </div>
        <Button onClick={fetchGeneratedCodes} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Generated</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <FileCode className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Security Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(stats.avgSecurityScore)}`}>
                {stats.avgSecurityScore.toFixed(1)}
              </p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card className="p-6">
        <div className="flex border-b mb-6">
          {[
            { id: 'generate', label: 'Generate Code', icon: Sparkles },
            { id: 'review', label: 'Review Queue', icon: Eye },
            { id: 'jobs', label: 'Active Jobs', icon: Terminal },
            { id: 'history', label: 'History', icon: GitBranch }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generate Code Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Language *</Label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>

              <div>
                <Label>Framework/Context</Label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="nextjs">Next.js</option>
                  <option value="react">React</option>
                  <option value="express">Express</option>
                  <option value="fastapi">FastAPI</option>
                  <option value="django">Django</option>
                  <option value="prisma">Prisma</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>File Path (optional)</Label>
                <Input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g. src/components/MyComponent.tsx"
                />
              </div>

              <div>
                <Label>Risk Level</Label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as any)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="LOW">Low (Safe changes)</option>
                  <option value="MEDIUM">Medium (Requires review)</option>
                  <option value="HIGH">High (Critical changes)</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Code Generation Prompt *</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the code you want to generate... (e.g., 'Create a React hook for managing user authentication with JWT tokens')"
                rows={6}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt || !language}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Code
                </>
              )}
            </Button>

            {/* Learned Patterns */}
            {patterns.length > 0 && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Learned Patterns ({patterns.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {patterns.slice(0, 10).map((pattern) => (
                    <Badge key={pattern.id} className="bg-purple-100 text-purple-800">
                      {pattern.name} ({pattern.language})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Queue Tab */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {generatedCodes
              .filter(code => code.approvalStatus === 'PENDING')
              .map((code) => (
                <Card key={code.id} className="p-4 border-l-4 border-l-yellow-500">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{code.filePath || 'Untitled'}</h4>
                        {getRiskBadge(code.riskLevel)}
                        {getStatusBadge(code.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {code.language} • {code.linesOfCode} lines • 
                        Created {new Date(code.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproval(code.id, true)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApproval(code.id, false)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* Quality Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Complexity</p>
                      <p className={`font-semibold ${getScoreColor(100 - code.complexity)}`}>
                        {code.complexity}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Security</p>
                      <p className={`font-semibold ${getScoreColor(code.securityScore)}`}>
                        {code.securityScore}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Test Coverage</p>
                      <p className={`font-semibold ${getScoreColor(code.testCoverage)}`}>
                        {code.testCoverage}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Issues</p>
                      <p className="font-semibold text-red-600">
                        {code.securityIssues + code.lintErrors}
                      </p>
                    </div>
                  </div>

                  {/* Code Preview */}
                  <div className="bg-gray-900 text-white p-3 rounded-lg text-sm font-mono max-h-64 overflow-auto">
                    <pre>{code.code}</pre>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => copyToClipboard(code.code)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      onClick={() => downloadCode(code)}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>
              ))}

            {generatedCodes.filter(c => c.approvalStatus === 'PENDING').length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No code awaiting review</p>
              </div>
            )}
          </div>
        )}

        {/* Active Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-3">
            {jobs
              .filter(job => ['QUEUED', 'PROCESSING'].includes(job.status))
              .map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{job.jobType}</h4>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{job.prompt}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{job.language}</span>
                        <span>Priority: {job.priority}</span>
                        {job.startedAt && (
                          <span>Started: {new Date(job.startedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                    {job.status === 'PROCESSING' && (
                      <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                  </div>
                </Card>
              ))}

            {jobs.filter(j => ['QUEUED', 'PROCESSING'].includes(j.status)).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No active jobs</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {generatedCodes.map((code) => (
              <Card key={code.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{code.filePath || 'Untitled'}</h4>
                      {getRiskBadge(code.riskLevel)}
                      {getStatusBadge(code.approvalStatus)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {code.language} • {code.linesOfCode} lines • 
                      {new Date(code.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyToClipboard(code.code)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => downloadCode(code)}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {generatedCodes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No code generation history</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CodeSynthesizerPanel;
