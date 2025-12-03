"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  Music, 
  Wand2, 
  Download, 
  Trash2, 
  RefreshCw,
  Sparkles,
  Mic,
  Volume2,
  Plus,
  Search,
  Filter,
  Clock,
  Play,
  Pause
} from "lucide-react"

interface AudioAsset {
  id: string
  prompt: string
  audioType: 'music' | 'speech' | 'sound_effect'
  duration: number
  format: string
  url: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
  userId: string
  metadata?: Record<string, any>
}

interface AudioTemplate {
  id: string
  name: string
  prompt: string
  audioType: 'music' | 'speech' | 'sound_effect'
  duration: number
}

interface AudioStats {
  total: number
  completed: number
  pending: number
  failed: number
  totalDuration: string
  totalSize: string
}

export default function AudioGeneratorPanel() {
  const [audios, setAudios] = useState<AudioAsset[]>([])
  const [templates, setTemplates] = useState<AudioTemplate[]>([])
  const [stats, setStats] = useState<AudioStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  // Form state
  const [prompt, setPrompt] = useState("")
  const [audioType, setAudioType] = useState<'music' | 'speech' | 'sound_effect'>("music")
  const [duration, setDuration] = useState(30)
  const [format, setFormat] = useState("mp3")

  useEffect(() => {
    fetchAudios()
    fetchTemplates()
    fetchStats()
  }, [])

  const fetchAudios = async () => {
    try {
      const params = new URLSearchParams({ action: 'list' })
      if (searchQuery) params.append('search', searchQuery)
      if (filterType !== 'all') params.append('type', filterType)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const res = await fetch(`/api/admin/creative/audio?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAudios(data.audios || [])
      }
    } catch (error) {
      console.error('Failed to fetch audios:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/creative/audio?action=templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/creative/audio?action=stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin/creative/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          audioType,
          duration,
          format
        })
      })

      if (res.ok) {
        await fetchAudios()
        await fetchStats()
        setPrompt("")
        setActiveTab("library")
      }
    } catch (error) {
      console.error('Failed to generate audio:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = (template: AudioTemplate) => {
    setPrompt(template.prompt)
    setAudioType(template.audioType)
    setDuration(template.duration)
    setSelectedTemplate(template.id)
    setActiveTab("generate")
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/creative/audio?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchAudios()
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to delete audio:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const getAudioTypeIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music className="w-4 h-4" />
      case 'speech': return <Mic className="w-4 h-4" />
      case 'sound_effect': return <Volume2 className="w-4 h-4" />
      default: return <Music className="w-4 h-4" />
    }
  }

  const filteredAudios = audios.filter(audio => {
    const matchesSearch = !searchQuery || 
      audio.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || audio.audioType === filterType
    const matchesStatus = filterStatus === 'all' || audio.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6" />
            Audio Generator
          </h2>
          <p className="text-muted-foreground">Generate AI audio: music, speech, and sound effects</p>
        </div>
        <Button onClick={() => { fetchAudios(); fetchStats(); }} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Audio</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Music className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <Sparkles className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                  <p className="text-2xl font-bold">{stats.totalDuration}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">{stats.totalSize}</p>
                </div>
                <Volume2 className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">
            <Wand2 className="w-4 h-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="library">
            <Music className="w-4 h-4 mr-2" />
            Library ({audios.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="w-4 h-4 mr-2" />
            Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Audio</CardTitle>
              <CardDescription>Create AI-generated audio: music, speech, or sound effects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Upbeat electronic music with energetic beats..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audioType">Audio Type</Label>
                  <Select value={audioType} onValueChange={(v: any) => setAudioType(v)}>
                    <SelectTrigger id="audioType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          Music
                        </div>
                      </SelectItem>
                      <SelectItem value="speech">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4" />
                          Speech
                        </div>
                      </SelectItem>
                      <SelectItem value="sound_effect">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          Sound Effect
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="180">3 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                      <SelectItem value="ogg">OGG</SelectItem>
                      <SelectItem value="flac">FLAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Audio
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search prompts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterType">Audio Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="filterType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="speech">Speech</SelectItem>
                      <SelectItem value="sound_effect">Sound Effect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterStatus">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filterStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={fetchAudios} variant="outline" className="w-full mt-4">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </CardContent>
          </Card>

          {/* Audio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAudios.map((audio) => (
              <Card key={audio.id}>
                <CardContent className="pt-6">
                  <div className="aspect-video bg-muted rounded-lg mb-3 flex flex-col items-center justify-center p-4">
                    {audio.status === 'completed' && audio.url ? (
                      <>
                        <Volume2 className="w-16 h-16 text-primary mb-4" />
                        <audio 
                          controls 
                          className="w-full"
                          src={audio.url}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </>
                    ) : (
                      <Music className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2 mb-2">{audio.prompt}</p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant={
                      audio.status === 'completed' ? 'default' :
                      audio.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {audio.status}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getAudioTypeIcon(audio.audioType)}
                      {audio.audioType.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">{formatDuration(audio.duration)}</Badge>
                    <Badge variant="outline">{audio.format.toUpperCase()}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {audio.status === 'completed' && (
                      <a href={audio.url} download className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </a>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(audio.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAudios.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No audio found. Generate your first audio!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getAudioTypeIcon(template.audioType)}
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.prompt}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{template.audioType.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{formatDuration(template.duration)}</Badge>
                  </div>
                  <Button 
                    onClick={() => handleUseTemplate(template)}
                    className="w-full"
                    variant="secondary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates available yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
