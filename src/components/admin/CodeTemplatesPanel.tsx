'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  FileCode, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Copy, 
  Trash2, 
  Edit, 
  Star,
  RefreshCw,
  Code,
  Package,
  Tag,
  TrendingUp,
  Calendar,
  Eye,
  CheckCircle,
  Globe
} from 'lucide-react';

// Types
interface CodeTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  language: string;
  templateCode: string;
  variables: any;
  placeholders: any;
  isPublic: boolean;
  tags: string[];
  framework: string | null;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStats {
  total: number;
  byLanguage: { [key: string]: number };
  byCategory: { [key: string]: number };
  mostUsed: CodeTemplate[];
  recentlyCreated: CodeTemplate[];
}

const CodeTemplatesPanel: React.FC = () => {
  // State
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CodeTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CodeTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'COMPONENT',
    language: 'typescript',
    templateCode: '',
    variables: '{}',
    placeholders: '{}',
    isPublic: false,
    tags: '',
    framework: ''
  });

  // Fetch data
  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(t => t.language === languageFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, languageFilter, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/builder/templates?limit=100');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/builder/templates?type=stats');
      const data = await res.json();
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.templateCode) {
      alert('Please provide template name and code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/builder/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variables: JSON.parse(formData.variables || '{}'),
          placeholders: formData.placeholders ? JSON.parse(formData.placeholders) : null,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          framework: formData.framework || null
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Template created successfully!');
        resetForm();
        setIsCreating(false);
        fetchTemplates();
        fetchStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/builder/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          ...formData,
          variables: JSON.parse(formData.variables || '{}'),
          placeholders: formData.placeholders ? JSON.parse(formData.placeholders) : null,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          framework: formData.framework || null
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Template updated successfully!');
        resetForm();
        setIsEditing(false);
        setSelectedTemplate(null);
        fetchTemplates();
        fetchStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/admin/builder/templates?templateId=${templateId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Template deleted successfully!');
        fetchTemplates();
        fetchStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const res = await fetch('/api/admin/builder/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'use',
          templateId
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Template marked as used!');
        fetchTemplates();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  const editTemplate = (template: CodeTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      language: template.language,
      templateCode: template.templateCode,
      variables: JSON.stringify(template.variables, null, 2),
      placeholders: template.placeholders ? JSON.stringify(template.placeholders, null, 2) : '{}',
      isPublic: template.isPublic,
      tags: template.tags.join(', '),
      framework: template.framework || ''
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'COMPONENT',
      language: 'typescript',
      templateCode: '',
      variables: '{}',
      placeholders: '{}',
      isPublic: false,
      tags: '',
      framework: ''
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Template code copied to clipboard!');
  };

  const downloadTemplate = (template: CodeTemplate) => {
    const blob = new Blob([template.templateCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Code Templates
          </h2>
          <p className="text-gray-600 mt-1">
            Reusable code patterns and templates library
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTemplates} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setIsCreating(true); setIsEditing(false); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Templates</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileCode className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Languages</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byLanguage).length}</p>
              </div>
              <Code className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
              </div>
              <Tag className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Most Used</p>
                <p className="text-2xl font-bold">
                  {stats.mostUsed[0]?.usageCount || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || isEditing) && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {isEditing ? 'Edit Template' : 'Create New Template'}
            </h3>
            <Button
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
                setSelectedTemplate(null);
                resetForm();
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. React Hook Template"
                />
              </div>

              <div>
                <Label>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="COMPONENT">Component</option>
                  <option value="FUNCTION">Function</option>
                  <option value="CLASS">Class</option>
                  <option value="HOOK">Hook</option>
                  <option value="API">API</option>
                  <option value="DATABASE">Database</option>
                  <option value="UTIL">Utility</option>
                  <option value="TEST">Test</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Language *</Label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
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
                <Label>Framework (optional)</Label>
                <Input
                  value={formData.framework}
                  onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                  placeholder="e.g. Next.js, React, FastAPI"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>

            <div>
              <Label>Template Code *</Label>
              <Textarea
                value={formData.templateCode}
                onChange={(e) => setFormData({ ...formData, templateCode: e.target.value })}
                placeholder="// Your template code here..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Variables (JSON)</Label>
                <Textarea
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  placeholder='{"key": "value"}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label>Placeholders (JSON, optional)</Label>
                <Textarea
                  value={formData.placeholders}
                  onChange={(e) => setFormData({ ...formData, placeholders: e.target.value })}
                  placeholder='{"VAR_NAME": "description"}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="react, hooks, authentication"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isPublic" className="cursor-pointer">
                  Make this template public
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={isEditing ? handleUpdateTemplate : handleCreateTemplate}
                disabled={loading || !formData.name || !formData.templateCode}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update Template' : 'Create Template'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      {!isCreating && !isEditing && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-48">
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="all">All Languages</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
              </select>
            </div>

            <div className="w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="all">All Categories</option>
                <option value="COMPONENT">Component</option>
                <option value="FUNCTION">Function</option>
                <option value="HOOK">Hook</option>
                <option value="API">API</option>
                <option value="DATABASE">Database</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Templates Grid */}
      {!isCreating && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    {template.name}
                    {template.isPublic && <Globe className="w-3 h-3 text-blue-500" />}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {template.description || 'No description'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {template.language}
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  {template.category}
                </Badge>
                {template.framework && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {template.framework}
                  </Badge>
                )}
              </div>

              {template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {template.usageCount} uses
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(template.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleUseTemplate(template.id)}
                  size="sm"
                  className="flex-1"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Use
                </Button>
                <Button
                  onClick={() => copyToClipboard(template.templateCode)}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => downloadTemplate(template)}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => editTemplate(template)}
                  size="sm"
                  variant="outline"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => handleDeleteTemplate(template.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isCreating && !isEditing && filteredTemplates.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <FileCode className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {searchQuery || languageFilter !== 'all' || categoryFilter !== 'all'
                ? 'No templates match your filters'
                : 'No templates yet'}
            </p>
            {!searchQuery && languageFilter === 'all' && categoryFilter === 'all' && (
              <Button onClick={() => { resetForm(); setIsCreating(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CodeTemplatesPanel;
