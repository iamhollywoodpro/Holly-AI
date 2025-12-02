// Phase 4D - Documentation Generator Panel
// Hollywood Phase 4D: Automated documentation generation and management

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  RefreshCw, 
  Download, 
  BookOpen,
  Code,
  FileCode,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2
} from "lucide-react";

interface DocTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  sections: string[];
}

interface Documentation {
  id: string;
  title: string;
  type: string;
  version: string;
  status: string;
  lastGenerated: string;
  sections: number;
  wordCount: number;
  format: string;
}

interface DocStats {
  totalDocs: number;
  upToDate: number;
  outdated: number;
  avgWordCount: number;
  lastGenerated: string;
  coverage: number;
}

export default function DocsGeneratorPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [stats, setStats] = useState<DocStats>({
    totalDocs: 0,
    upToDate: 0,
    outdated: 0,
    avgWordCount: 0,
    lastGenerated: '',
    coverage: 0
  });

  const [docs, setDocs] = useState<Documentation[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);

  // Fetch documentation stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/docs?action=stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch docs stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all documentation
  const fetchDocs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/docs?action=list');
      const data = await response.json();
      setDocs(data.docs);
    } catch (error) {
      console.error('Failed to fetch docs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/docs?action=templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  // Generate documentation
  const generateDocs = async (templateId: string, config: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          templateId,
          config
        })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchDocs();
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to generate docs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update documentation
  const updateDocs = async (docId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/docs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          docId
        })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchDocs();
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to update docs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete documentation
  const deleteDocs = async (docId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/docs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          docId
        })
      });
      
      if (response.ok) {
        await fetchDocs();
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete docs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDocs();
    fetchTemplates();
  }, []);

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Documentation Generator</h2>
          <p className="text-muted-foreground">
            Automated documentation generation and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Docs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.upToDate} up to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outdated</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outdated}</div>
            <p className="text-xs text-muted-foreground">
              Need regeneration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Word Count</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWordCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per document
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coverage}%</div>
            <p className="text-xs text-muted-foreground">
              Code documented
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Documentation</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search docs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="api">API</option>
                    <option value="component">Component</option>
                    <option value="guide">Guide</option>
                    <option value="readme">README</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredDocs.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <FileCode className="h-4 w-4" />
                              <h4 className="font-semibold">{doc.title}</h4>
                              <Badge variant={doc.status === 'up-to-date' ? 'default' : 'secondary'}>
                                {doc.status}
                              </Badge>
                              <Badge variant="outline">{doc.type}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>v{doc.version}</span>
                              <span>{doc.sections} sections</span>
                              <span>{doc.wordCount.toLocaleString()} words</span>
                              <span>{doc.format.toUpperCase()}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(doc.lastGenerated).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateDocs(doc.id)}
                              disabled={loading}
                            >
                              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteDocs(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documentation Templates</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge>{template.type}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {template.sections.length} sections
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => generateDocs(template.id, {})}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Documentation</CardTitle>
              <CardDescription>
                Create new documentation from templates or custom configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Documentation Type</label>
                  <select className="w-full border rounded-md px-3 py-2 mt-1">
                    <option>API Documentation</option>
                    <option>Component Documentation</option>
                    <option>User Guide</option>
                    <option>README</option>
                    <option>Technical Spec</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Source Path</label>
                  <Input placeholder="/src/components" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-medium">Output Format</label>
                  <select className="w-full border rounded-md px-3 py-2 mt-1">
                    <option>Markdown</option>
                    <option>HTML</option>
                    <option>PDF</option>
                    <option>Docx</option>
                  </select>
                </div>

                <Button className="w-full" disabled={loading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}