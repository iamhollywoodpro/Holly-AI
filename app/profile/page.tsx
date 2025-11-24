'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  PhotoIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

interface UserStats {
  totalConversations: number;
  totalMessages: number;
  activeRepos: number;
  driveFilesCount: number;
  lastActiveAt: string;
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        bio: user.unsafeMetadata?.bio as string || '',
      });
      
      // Fetch user stats
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await user.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          bio: formData.bio,
        },
      });
      
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Chat
            </a>
            <div className="h-6 w-px bg-gray-800" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Profile Settings
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Picture & Basic Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex flex-col items-center">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || 'User'}
                    className="w-32 h-32 rounded-full border-4 border-purple-500/30"
                  />
                ) : (
                  <UserCircleIcon className="w-32 h-32 text-gray-400" />
                )}
                
                <button
                  className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  <PhotoIcon className="w-4 h-4 inline mr-2" />
                  Change Photo
                </button>

                <div className="mt-6 w-full space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Member since</span>
                    <span className="text-white">
                      {user?.createdAt?.toLocaleDateString() ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Account ID</span>
                    <span className="text-white font-mono text-xs">
                      {user?.id.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats Card */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Your Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      <span className="text-sm">Conversations</span>
                    </div>
                    <span className="text-white font-semibold">{stats.totalConversations}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <ChartBarIcon className="w-4 h-4" />
                      <span className="text-sm">Messages</span>
                    </div>
                    <span className="text-white font-semibold">{stats.totalMessages}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <CodeBracketIcon className="w-4 h-4" />
                      <span className="text-sm">Active Repos</span>
                    </div>
                    <span className="text-white font-semibold">{stats.activeRepos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <CloudIcon className="w-4 h-4" />
                      <span className="text-sm">Drive Files</span>
                    </div>
                    <span className="text-white font-semibold">{stats.driveFilesCount}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <ClockIcon className="w-4 h-4" />
                      <span>Last active: {new Date(stats.lastActiveAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Editable Profile Info */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm text-white transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm text-white transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        disabled={!editing}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        disabled={!editing}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!editing}
                      className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={user?.primaryEmailAddress?.emailAddress || ''}
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 opacity-50"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed here. Manage in Account settings.</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bio
                  </label>
                  <div className="relative">
                    <DocumentTextIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={!editing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.bio.length}/500 characters
                  </p>
                </div>

                {/* Password Change Link */}
                <div className="pt-6 border-t border-gray-800">
                  <button
                    onClick={() => window.location.href = '/settings/security'}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <KeyIcon className="w-5 h-5" />
                    <span className="text-sm">Change Password</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
