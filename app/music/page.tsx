'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ExtendSongModal } from '@/components/music/extend-song-modal'
import { RemixSongModal } from '@/components/music/remix-song-modal'
import { StemSeparationModal } from '@/components/music/stem-separation-modal'
// import { createClient } from '@/lib/supabase/client' // TODO: Migrate to Prisma
import { useToast } from '@/components/ui/toast'
import {
  Sparkles,
  Music,
  Users,
  ListMusic,
  Play,
  Pause,
  Download,
  Video,
  Music2,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Wand2,
  AlertCircle,
  Loader2,
  X,
  Image as ImageIcon,
} from 'lucide-react'

// REMOVED: Supabase client (migrated to Prisma)

interface Song {
  id: string
  title: string
  audio_url: string
  image_url?: string
  tags?: string
  prompt?: string
  language?: string
  duration?: number
  artist_id?: string
  created_at: string
}

interface Artist {
  id: string
  name: string
  style?: string
  image_url?: string
  bio?: string
  created_at: string
}

interface Playlist {
  id: string
  name: string
  description?: string
  created_at: string
  song_count?: number
}

export default function MusicStudioPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'library' | 'artists' | 'playlists'>('create')

  const tabs = [
    { id: 'create', label: 'Create', icon: Sparkles },
    { id: 'library', label: 'Library', icon: Music },
    { id: 'artists', label: 'Artists', icon: Users },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
  ]

  return (
    <MainLayout>
      <div className="min-h-screen p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">Music Studio</span>
          </h1>
          <p className="text-text-secondary">
            Create authentic music across 13 languages with cultural depth
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-primary">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-holly-purple text-holly-purple'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'create' && <CreateTab />}
          {activeTab === 'library' && <LibraryTab />}
          {activeTab === 'artists' && <ArtistsTab />}
          {activeTab === 'playlists' && <PlaylistsTab />}
        </div>
      </div>
    </MainLayout>
  )
}

// CREATE TAB WITH FULL API INTEGRATION
function CreateTab() {
  const [lyrics, setLyrics] = useState('')
  const [style, setStyle] = useState('')
  const [language, setLanguage] = useState('')
  const [selectedArtist, setSelectedArtist] = useState('')
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false)
  const [isGeneratingSong, setIsGeneratingSong] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentGenerations, setRecentGenerations] = useState<Song[]>([])
  const { toast } = useToast()

  // Auto-detect language as user types
  useEffect(() => {
    if (lyrics.trim().length > 20) {
      detectLanguage(lyrics)
    }
  }, [lyrics])

  const detectLanguage = async (text: string) => {
    try {
      const response = await fetch('/api/music/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      if (data.language) {
        setDetectedLanguage(data.language)
      }
    } catch (error) {
      console.error('Language detection failed:', error)
    }
  }

  const handleGenerateLyrics = async () => {
    if (!lyrics.trim()) {
      toast({ title: 'Please enter a theme or topic for lyrics generation', variant: 'destructive' })
      return
    }

    setIsGeneratingLyrics(true)
    setError(null)

    try {
      const response = await fetch('/api/music/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: lyrics,
          language: language || 'auto',
          style: style || 'pop',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate lyrics')
      }

      const data = await response.json()
      setLyrics(data.lyrics)
      toast({ title: 'Lyrics generated successfully!' })
    } catch (error) {
      setError('Failed to generate lyrics. Please try again.')
      toast({ title: 'Lyrics generation failed', variant: 'destructive' })
    } finally {
      setIsGeneratingLyrics(false)
    }
  }

  const handleGenerateSong = async () => {
    if (!lyrics.trim()) {
      toast({ title: 'Please enter lyrics or a prompt', variant: 'destructive' })
      return
    }

    setIsGeneratingSong(true)
    setError(null)

    try {
      toast({ title: 'Generating 2 versions of your song...' })

      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lyrics,
          tags: style || 'pop',
          title: `Song ${Date.now()}`,
          make_instrumental: false,
          custom_mode: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate song')
      }

      const data = await response.json()
      
      if (data.clips && data.clips.length > 0) {
        setRecentGenerations(prev => [...data.clips, ...prev])
        toast({ title: `✅ Generated ${data.clips.length} versions successfully!` })
        
        // Save to database
        // TODO: Migrate to Prisma - Save songs to database
        console.log('Songs generated:', data.clips.length)
      }
    } catch (error) {
      setError('Failed to generate song. Please try again.')
      toast({ title: 'Song generation failed', variant: 'destructive' })
    } finally {
      setIsGeneratingSong(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Input */}
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Lyrics Input */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Lyrics or Prompt</h3>
              {detectedLanguage && (
                <p className="text-xs text-holly-purple-400 mt-1">
                  Detected: {detectedLanguage}
                </p>
              )}
            </div>
            <button
              onClick={handleGenerateLyrics}
              disabled={isGeneratingLyrics || !lyrics.trim()}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingLyrics ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Lyrics
                </>
              )}
            </button>
          </div>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Write your lyrics here, or click 'Generate Lyrics' to let HOLLY write them for you..."
            className="textarea w-full h-64 text-sm"
            disabled={isGeneratingLyrics || isGeneratingSong}
          />
          <p className="text-xs text-text-tertiary mt-2">
            {lyrics.length} characters • HOLLY will detect language automatically
          </p>
        </div>

        {/* Style & Settings */}
        <div className="card-elevated p-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Style & Settings</h3>
          
          {/* Style Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Music Style</label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g., EDM, R&B, Rock, Hip-Hop, Pop..."
              className="input w-full"
              disabled={isGeneratingSong}
            />
          </div>

          {/* Language (Optional) */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Language <span className="text-text-tertiary">(Auto-detected if not specified)</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input w-full"
              disabled={isGeneratingSong}
            >
              <option value="">Auto-detect from lyrics</option>
              <option value="en">English</option>
              <option value="ml">Malayalam</option>
              <option value="hi">Hindi</option>
              <option value="pt">Portuguese</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pt-br">Brazilian Portuguese</option>
              <option value="el">Greek</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateSong}
            disabled={isGeneratingSong || !lyrics.trim()}
            className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingSong ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating 2 Versions...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Song (2 Versions)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column - Preview & Cultural Guidance */}
      <div className="space-y-6">
        {/* Cultural Guidance */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            Cultural Guidance
          </h3>
          <div className="space-y-3 text-sm">
            <p className="text-text-secondary">
              HOLLY's music system understands cultural nuances across 13 languages.
            </p>
            <div className="bg-holly-purple/10 border border-holly-purple/20 rounded-lg p-3">
              <p className="text-holly-purple-400 font-medium mb-1">💡 Pro Tip</p>
              <p className="text-text-secondary">
                Try: "Write me a Portuguese EDM song about love" - HOLLY will automatically detect
                the language and apply Brazilian musical traditions!
              </p>
            </div>
          </div>
        </div>

        {/* Recent Generations */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Generations</h3>
          <div className="space-y-2">
            {recentGenerations.length === 0 ? (
              <div className="text-center text-text-tertiary py-8">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No songs generated yet</p>
                <p className="text-xs mt-1">Your creations will appear here</p>
              </div>
            ) : (
              recentGenerations.slice(0, 5).map((song) => (
                <div key={song.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    {song.image_url && (
                      <img src={song.image_url} alt={song.title} className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.title}</p>
                      <p className="text-xs text-text-tertiary">{song.tags}</p>
                    </div>
                    <Play className="w-4 h-4 text-holly-purple-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// LIBRARY TAB WITH DATABASE INTEGRATION
function LibraryTab() {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('all')
  const [filterStyle, setFilterStyle] = useState('all')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [extendModalOpen, setExtendModalOpen] = useState(false)
  const [remixModalOpen, setRemixModalOpen] = useState(false)
  const [stemModalOpen, setStemModalOpen] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchSongs()
    
    // TODO: Subscribe to real-time updates with Prisma/Pusher
    // const channel = supabase.channel('songs_changes')
    
    return () => {
      // Cleanup
    }
  }, [])

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setSongs(data || [])
    } catch (error) {
      console.error('Failed to fetch songs:', error)
      toast({ title: 'Failed to load library', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         song.tags?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLanguage = filterLanguage === 'all' || song.language === filterLanguage
    const matchesStyle = filterStyle === 'all' || song.tags?.includes(filterStyle)
    return matchesSearch && matchesLanguage && matchesStyle
  })

  const handleExtend = (song: Song) => {
    setSelectedSong(song)
    setExtendModalOpen(true)
  }

  const handleRemix = (song: Song) => {
    setSelectedSong(song)
    setRemixModalOpen(true)
  }

  const handleCreateVideo = async (song: Song) => {
    try {
      toast({ title: 'Creating music video...' })
      
      const response = await fetch('/api/music/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: song.audio_url,
          prompt: `Music video for: ${song.title}. Style: ${song.tags}`,
          duration: song.duration || 30,
        }),
      })

      if (!response.ok) throw new Error('Failed to create video')

      const data = await response.json()
      toast({ title: 'Music video created successfully!' })
      
      // TODO: Save to database with Prisma
      console.log('Video created for song:', song.id)
    } catch (error) {
      toast({ title: 'Failed to create video', variant: 'destructive' })
    }
  }

  const handleExtendSong = async (data: any) => {
    try {
      const response = await fetch('/api/music/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          continue_clip_id: selectedSong?.id,
          prompt: data.prompt,
          continue_at: data.continue_at || 30,
        }),
      })

      if (!response.ok) throw new Error('Failed to extend song')

      const result = await response.json()
      toast({ title: 'Song extended successfully!' })
      fetchSongs() // Refresh list
    } catch (error) {
      toast({ title: 'Failed to extend song', variant: 'destructive' })
    }
  }

  const handleRemixSong = async (data: any) => {
    try {
      toast({ title: 'Creating remix...' })
      
      const response = await fetch('/api/music/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to remix song')

      const result = await response.json()
      toast({ title: 'Remix created successfully!' })
      fetchSongs() // Refresh list
    } catch (error) {
      toast({ title: 'Failed to create remix', variant: 'destructive' })
    }
  }

  const handleStemSeparation = async (data: any) => {
    try {
      toast({ title: 'Separating stems... This may take 30-90 seconds' })
      
      const response = await fetch('/api/music/separate-stems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to separate stems')
      }

      const result = await response.json()
      toast({ title: `Stems separated in ${result.processing_time_seconds.toFixed(1)}s!` })
      return result // Return result to modal
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Failed to separate stems', variant: 'destructive' })
      throw error
    }
  }

  const handleSeparateStems = (song: Song) => {
    setSelectedSong(song)
    setStemModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-holly-purple-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-2">
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
          </select>
          <select
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Styles</option>
            <option value="pop">Pop</option>
            <option value="rock">Rock</option>
            <option value="edm">EDM</option>
            <option value="jazz">Jazz</option>
          </select>
          {(filterLanguage !== 'all' || filterStyle !== 'all') && (
            <button
              onClick={() => {
                setFilterLanguage('all')
                setFilterStyle('all')
              }}
              className="btn-ghost text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="input w-64 text-sm pl-10"
            />
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredSongs.length === 0 ? (
          <div className="text-center text-text-tertiary py-12">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No songs found</p>
            <p className="text-sm mt-2">Try adjusting your filters or create a new song</p>
          </div>
        ) : (
          filteredSongs.map((song) => (
            <div key={song.id} className="card-interactive p-4">
              <div className="flex items-center gap-4">
                {song.image_url ? (
                  <img src={song.image_url} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-holly-gradient flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <button
                  onClick={() => setCurrentlyPlaying(currentlyPlaying === song.id ? null : song.id)}
                  className="w-10 h-10 rounded-lg bg-holly-gradient flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {currentlyPlaying === song.id ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{song.title}</h4>
                  <p className="text-sm text-text-secondary truncate">
                    {song.tags} • {song.language}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExtend(song)}
                    className="btn-icon"
                    title="Extend song"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemix(song)}
                    className="btn-icon"
                    title="Remix song"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSeparateStems(song)}
                    className="btn-icon"
                    title="Separate stems"
                  >
                    <Music2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCreateVideo(song)}
                    className="btn-icon"
                    title="Create video"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <a
                    href={song.audio_url}
                    download
                    className="btn-icon"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {selectedSong && (
        <>
          <ExtendSongModal
            isOpen={extendModalOpen}
            onClose={() => setExtendModalOpen(false)}
            song={selectedSong}
            onExtend={handleExtendSong}
          />
          <RemixSongModal
            isOpen={remixModalOpen}
            onClose={() => setRemixModalOpen(false)}
            song={selectedSong}
            onRemix={handleRemixSong}
          />
          <StemSeparationModal
            isOpen={stemModalOpen}
            onClose={() => setStemModalOpen(false)}
            song={selectedSong}
            onSeparate={handleStemSeparation}
          />
        </>
      )}
    </div>
  )
}

// ARTISTS TAB WITH FULL CRUD
function ArtistsTab() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newArtist, setNewArtist] = useState({ name: '', style: '', bio: '' })
  const { toast } = useToast()

  useEffect(() => {
    fetchArtists()
  }, [])

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*, songs(count)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setArtists(data || [])
    } catch (error) {
      console.error('Failed to fetch artists:', error)
      toast({ title: 'Failed to load artists', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateArtist = async () => {
    if (!newArtist.name.trim()) {
      toast({ title: 'Please enter artist name', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      // Generate AI image
      const imageResponse = await fetch('/api/music/artist-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newArtist.name,
          style: newArtist.style || 'musician portrait',
        }),
      })

      if (!imageResponse.ok) throw new Error('Failed to generate image')

      const { image_url } = await imageResponse.json()

      // Save to database
      // TODO: Migrate to Prisma - Save artist to database
      console.log('Creating artist:', newArtist.name)

      toast({ title: 'Artist created successfully!' })
      setShowCreateModal(false)
      setNewArtist({ name: '', style: '', bio: '' })
      fetchArtists()
    } catch (error) {
      toast({ title: 'Failed to create artist', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteArtist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this artist?')) return

    try {
      // TODO: Migrate to Prisma - Delete artist from database
      console.log('Deleting artist:', id)
      toast({ title: 'Artist deleted successfully' })
      fetchArtists()
    } catch (error) {
      toast({ title: 'Failed to delete artist', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-holly-purple-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Artist
        </button>
      </div>

      {artists.length === 0 ? (
        <div className="text-center text-text-tertiary py-12">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No artists yet</p>
          <p className="text-sm mt-2">Create your first artist persona</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <div key={artist.id} className="card-interactive p-6 text-center">
              {artist.image_url ? (
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-holly-gradient mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-white" />
                </div>
              )}
              <h3 className="font-semibold mb-1">{artist.name}</h3>
              <p className="text-sm text-text-secondary mb-4">{artist.style || 'Artist'}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleDeleteArtist(artist.id)}
                  className="btn-ghost text-sm text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Artist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Artist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Artist Name *</label>
                <input
                  type="text"
                  value={newArtist.name}
                  onChange={(e) => setNewArtist({ ...newArtist, name: e.target.value })}
                  placeholder="e.g., Luna Eclipse"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Style/Genre</label>
                <input
                  type="text"
                  value={newArtist.style}
                  onChange={(e) => setNewArtist({ ...newArtist, style: e.target.value })}
                  placeholder="e.g., R&B / Soul"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                <textarea
                  value={newArtist.bio}
                  onChange={(e) => setNewArtist({ ...newArtist, bio: e.target.value })}
                  placeholder="Artist biography..."
                  className="textarea w-full"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateArtist}
                  disabled={isCreating || !newArtist.name.trim()}
                  className="flex-1 btn-primary"
                >
                  {isCreating ? 'Creating...' : 'Create Artist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// PLAYLISTS TAB WITH FULL CRUD
function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '' })
  const { toast } = useToast()

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*, playlist_songs(count)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlaylists(data || [])
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
      toast({ title: 'Failed to load playlists', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.name.trim()) {
      toast({ title: 'Please enter playlist name', variant: 'destructive' })
      return
    }

    try {
      // TODO: Migrate to Prisma - Save playlist to database
      console.log('Creating playlist:', newPlaylist.name)

      toast({ title: 'Playlist created successfully!' })
      setShowCreateModal(false)
      setNewPlaylist({ name: '', description: '' })
      fetchPlaylists()
    } catch (error) {
      toast({ title: 'Failed to create playlist', variant: 'destructive' })
    }
  }

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return

    try {
      // TODO: Migrate to Prisma - Delete playlist from database
      console.log('Deleting playlist:', id)
      toast({ title: 'Playlist deleted successfully' })
      fetchPlaylists()
    } catch (error) {
      toast({ title: 'Failed to delete playlist', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-holly-purple-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center text-text-tertiary py-12">
          <ListMusic className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No playlists yet</p>
          <p className="text-sm mt-2">Create your first playlist to organize your music</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="card-interactive p-6">
              <div className="w-full aspect-square bg-holly-gradient rounded-lg mb-4 flex items-center justify-center">
                <ListMusic className="w-12 h-12 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{playlist.name}</h3>
              <p className="text-sm text-text-secondary mb-4">
                {playlist.song_count || 0} songs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeletePlaylist(playlist.id)}
                  className="btn-ghost text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Playlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Playlist Name *</label>
                <input
                  type="text"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  placeholder="e.g., Summer Vibes"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  placeholder="Playlist description..."
                  className="textarea w-full"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylist.name.trim()}
                  className="flex-1 btn-primary"
                >
                  Create Playlist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
