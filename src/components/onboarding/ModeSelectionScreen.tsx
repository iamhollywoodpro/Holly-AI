'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Music, 
  Code, 
  Sparkles,
  ArrowRight,
  Check,
  Loader2
} from 'lucide-react';

interface ModeSelectionScreenProps {
  onComplete: (mode: UserMode, preferences: ModePreferences) => void;
  onSkip?: () => void;
}

export type UserMode = 'general' | 'music' | 'dev' | 'all-access';

export interface ModePreferences {
  mode: UserMode;
  // Music preferences
  musicRoles?: string[];
  musicGenres?: string[];
  // Dev preferences
  devRoles?: string[];
  devLanguages?: string[];
}

const MODES = [
  {
    id: 'general' as const,
    icon: MessageSquare,
    title: 'General Assistant',
    subtitle: 'Chat, Research & Everyday Help',
    description: 'Perfect for conversations, research, writing, brainstorming, and general productivity.',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    features: ['Natural conversation', 'Research & analysis', 'Writing assistance', 'Task planning'],
  },
  {
    id: 'music' as const,
    icon: Music,
    title: 'Music Industry Pro',
    subtitle: 'Artists, Producers, A&R & Management',
    description: 'Everything for music professionals - songwriting, A&R analysis, artist management, and social media.',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/30',
    features: ['Songwriting & lyrics', 'A&R hit prediction', 'Artist management', 'Social media for artists'],
  },
  {
    id: 'dev' as const,
    icon: Code,
    title: 'Development & Tech',
    subtitle: 'Code, Apps, Web & Deployment',
    description: 'Full-stack development partner - code generation, debugging, GitHub integration, and deployment.',
    color: 'from-green-500 to-emerald-500',
    borderColor: 'border-green-500/30',
    features: ['Code generation', 'GitHub integration', 'Deployment automation', 'Architecture design'],
  },
];

const MUSIC_ROLES = [
  { id: 'artist', label: 'Recording Artist' },
  { id: 'producer', label: 'Music Producer' },
  { id: 'ar', label: 'A&R / Talent Scout' },
  { id: 'manager', label: 'Artist Manager' },
  { id: 'songwriter', label: 'Songwriter' },
  { id: 'label', label: 'Label / Publishing' },
  { id: 'social', label: 'Social Media Manager' },
];

const MUSIC_GENRES = [
  'Pop', 'Hip-Hop', 'R&B', 'Electronic', 'Rock', 'Country', 
  'Latin', 'Afrobeats', 'Indie', 'Jazz', 'Classical', 'Other'
];

const DEV_ROLES = [
  { id: 'frontend', label: 'Frontend Developer' },
  { id: 'backend', label: 'Backend Developer' },
  { id: 'fullstack', label: 'Full-Stack Developer' },
  { id: 'devops', label: 'DevOps Engineer' },
  { id: 'founder', label: 'Technical Founder' },
  { id: 'student', label: 'Student / Learner' },
];

const DEV_LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'React', 'Next.js', 
  'Node.js', 'Go', 'Rust', 'Java', 'Other'
];

export default function ModeSelectionScreen({ onComplete, onSkip }: ModeSelectionScreenProps) {
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null);
  const [step, setStep] = useState<'mode' | 'preferences' | 'complete'>('mode');
  const [preferences, setPreferences] = useState<ModePreferences>({
    mode: 'general',
    musicRoles: [],
    musicGenres: [],
    devRoles: [],
    devLanguages: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleModeSelect = (mode: UserMode) => {
    setSelectedMode(mode);
    setPreferences(prev => ({ ...prev, mode }));
  };

  const handleContinue = () => {
    if (!selectedMode) return;

    if (step === 'mode') {
      if (selectedMode === 'all-access' || selectedMode === 'general') {
        // Skip preferences for all-access or general
        handleComplete();
      } else {
        // Show preferences screen
        setStep('preferences');
      }
    } else if (step === 'preferences') {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!selectedMode) return;
    
    setIsLoading(true);
    
    try {
      // Save preferences to API
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryMode: selectedMode,
          ...preferences,
        }),
      });

      if (response.ok) {
        setStep('complete');
        setTimeout(() => {
          onComplete(selectedMode, preferences);
        }, 1500);
      } else {
        // Still complete even if save fails
        onComplete(selectedMode, preferences);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      onComplete(selectedMode, preferences);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <AnimatePresence mode="wait">
          {/* Step 1: Mode Selection */}
          {step === 'mode' && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="text-center"
            >
              {/* Header */}
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome to HOLLY
                </h1>
                <p className="text-gray-400 text-lg">
                  I'm HOLLY, your AI Life Partner. What kind of work do you want to do together?
                </p>
              </div>

              {/* Mode Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedMode === mode.id;

                  return (
                    <motion.button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative p-6 rounded-2xl border-2 text-left transition-all
                        ${isSelected 
                          ? `${mode.borderColor} bg-gradient-to-br ${mode.color} bg-opacity-10`
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }
                      `}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                      
                      <div className={`
                        w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} 
                        flex items-center justify-center mb-4
                      `}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {mode.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        {mode.subtitle}
                      </p>
                      
                      <ul className="space-y-1">
                        {mode.features.map((feature, i) => (
                          <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                            <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${mode.color}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.button>
                  );
                })}
              </div>

              {/* All Access Option */}
              <motion.button
                onClick={() => handleModeSelect('all-access')}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`
                  w-full p-4 rounded-xl border-2 mb-8 transition-all
                  ${selectedMode === 'all-access'
                    ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span className="text-white font-medium">
                    🔮 All-Access Mode - Everything unlocked
                  </span>
                </div>
              </motion.button>

              {/* Continue Button */}
              <div className="flex items-center justify-center gap-4">
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="text-gray-500 hover:text-gray-400 text-sm"
                  >
                    Skip for now
                  </button>
                )}
                <motion.button
                  onClick={handleContinue}
                  disabled={!selectedMode || isLoading}
                  whileHover={{ scale: selectedMode ? 1.02 : 1 }}
                  whileTap={{ scale: selectedMode ? 0.98 : 1 }}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-xl font-medium
                    transition-all
                    ${selectedMode
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Preferences */}
          {step === 'preferences' && selectedMode && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              {/* Header */}
              <div className="mb-8">
                <div className={`
                  w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br 
                  ${MODES.find(m => m.id === selectedMode)?.color || 'from-gray-500 to-gray-600'}
                  flex items-center justify-center
                `}>
                  {selectedMode === 'music' ? (
                    <Music className="w-8 h-8 text-white" />
                  ) : (
                    <Code className="w-8 h-8 text-white" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedMode === 'music' ? '🎵 Music Industry Setup' : '💻 Developer Setup'}
                </h2>
                <p className="text-gray-400">
                  Help me personalize your experience (select all that apply)
                </p>
              </div>

              {/* Music Preferences */}
              {selectedMode === 'music' && (
                <div className="space-y-6 mb-8">
                  <div>
                    <h3 className="text-left text-sm font-medium text-gray-300 mb-3">
                      What best describes you?
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {MUSIC_ROLES.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => setPreferences(prev => ({
                            ...prev,
                            musicRoles: toggleArrayItem(prev.musicRoles || [], role.id)
                          }))}
                          className={`
                            px-4 py-2 rounded-lg text-sm transition-all
                            ${preferences.musicRoles?.includes(role.id)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }
                          `}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-left text-sm font-medium text-gray-300 mb-3">
                      Your primary genres
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {MUSIC_GENRES.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => setPreferences(prev => ({
                            ...prev,
                            musicGenres: toggleArrayItem(prev.musicGenres || [], genre)
                          }))}
                          className={`
                            px-4 py-2 rounded-lg text-sm transition-all
                            ${preferences.musicGenres?.includes(genre)
                              ? 'bg-pink-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }
                          `}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Dev Preferences */}
              {selectedMode === 'dev' && (
                <div className="space-y-6 mb-8">
                  <div>
                    <h3 className="text-left text-sm font-medium text-gray-300 mb-3">
                      What best describes you?
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {DEV_ROLES.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => setPreferences(prev => ({
                            ...prev,
                            devRoles: toggleArrayItem(prev.devRoles || [], role.id)
                          }))}
                          className={`
                            px-4 py-2 rounded-lg text-sm transition-all
                            ${preferences.devRoles?.includes(role.id)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }
                          `}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-left text-sm font-medium text-gray-300 mb-3">
                      Your primary languages/frameworks
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {DEV_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setPreferences(prev => ({
                            ...prev,
                            devLanguages: toggleArrayItem(prev.devLanguages || [], lang)
                          }))}
                          className={`
                            px-4 py-2 rounded-lg text-sm transition-all
                            ${preferences.devLanguages?.includes(lang)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }
                          `}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStep('mode')}
                  className="text-gray-500 hover:text-gray-400"
                >
                  ← Back
                </button>
                <motion.button
                  onClick={handleContinue}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                You're all set! 🎉
              </h2>
              <p className="text-gray-400">
                HOLLY is now configured for {selectedMode === 'music' ? 'Music Industry' : selectedMode === 'dev' ? 'Development' : 'General'} mode
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
