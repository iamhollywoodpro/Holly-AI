'use client';

import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Pause, XCircle, MoreVertical, ExternalLink } from 'lucide-react';
import { Project } from './ProjectTimeline';

interface ProjectCardProps {
  project: Project;
  onUpdate: () => void;
}

export default function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-purple-500/50 transition-all group"
      style={{ borderLeftColor: project.color, borderLeftWidth: '4px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
          )}
        </div>
        
        <button className="p-1 text-gray-400 hover:text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border mb-3 ${getStatusColor(project.status)}`}>
        {getStatusIcon(project.status)}
        <span className="capitalize">{project.status}</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Technologies */}
      {project.technologies && project.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.technologies.slice(0, 3).map((tech, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > 3 && (
            <span className="px-2 py-0.5 text-gray-400 text-xs">
              +{project.technologies.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-700">
        <div>
          <span>Started {formatDate(project.startDate)}</span>
        </div>
        <div className="flex items-center gap-3">
          {project._count && (
            <>
              <span>{project._count.milestones} milestones</span>
              <span>{project.conversationIds.length} chats</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
