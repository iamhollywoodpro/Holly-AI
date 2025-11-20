'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Filter,
  Download,
  Plus,
  Search,
  FolderOpen,
  Clock,
  CheckCircle2,
  Pause,
  XCircle,
} from 'lucide-react';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import { useDebug } from '@/contexts/DebugContext';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  category?: string;
  technologies: string[];
  color: string;
  icon?: string;
  progress: number;
  startDate: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  conversationIds: string[];
  fileUrls: string[];
  milestones: any[];
  activities: any[];
  _count?: {
    milestones: number;
    activities: number;
  };
}

export default function ProjectTimeline() {
  const { addLog } = useDebug();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [statusFilter, categoryFilter, searchQuery]);

  const loadProjects = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/projects?${params}`);
      const data = await response.json();

      if (data.success) {
        // Convert date strings to Date objects
        const projectsWithDates = data.projects.map((p: any) => ({
          ...p,
          startDate: new Date(p.startDate),
          targetEndDate: p.targetEndDate ? new Date(p.targetEndDate) : undefined,
          actualEndDate: p.actualEndDate ? new Date(p.actualEndDate) : undefined,
        }));

        setProjects(projectsWithDates);

        const duration = performance.now() - startTime;
        addLog({
          level: 'success',
          category: 'api',
          message: `Loaded ${data.total} projects`,
          duration,
        });
      }
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      addLog({
        level: 'error',
        category: 'api',
        message: 'Failed to load projects',
        details: { error: error.message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportTimeline = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalProjects: projects.length,
      projects: projects.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status,
        category: p.category,
        technologies: p.technologies,
        progress: `${p.progress}%`,
        startDate: p.startDate.toISOString(),
        duration: p.actualEndDate 
          ? `${Math.ceil((p.actualEndDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`
          : 'Ongoing',
        milestones: p.milestones?.length || 0,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-timeline-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog({
      level: 'success',
      category: 'system',
      message: 'Timeline exported',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  const statusCounts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    paused: projects.filter(p => p.status === 'paused').length,
  };

  // Group projects by month
  const projectsByMonth = projects.reduce((acc, project) => {
    const monthKey = new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long' 
    }).format(project.startDate);
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Project Timeline</h1>
              <p className="text-gray-400">Track and manage all your projects in one place</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportTimeline}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
              {(['all', 'active', 'completed', 'paused'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    statusFilter === status
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {getStatusIcon(status)}
                  <span className="capitalize">{status}</span>
                  <span className="text-xs opacity-75">({statusCounts[status]})</span>
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="web">Web Development</option>
              <option value="mobile">Mobile App</option>
              <option value="ai">AI/ML</option>
              <option value="design">Design</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Timeline Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your work by creating your first project</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(projectsByMonth).map(([month, monthProjects]) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-semibold text-gray-300 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  {month}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project}
                      onUpdate={loadProjects}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onCreated={loadProjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
