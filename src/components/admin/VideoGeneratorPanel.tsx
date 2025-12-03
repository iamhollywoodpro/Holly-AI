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
  Video, 
  Wand2, 
  Download, 
  Trash2, 
  RefreshCw,
  Sparkles,
  Film,
  Play,
  Plus,
  Search,
  Filter,
  Clock
} from "lucide-react"

interface VideoAsset {
  id: string
  prompt: string
  style: string
  duration: number
  resolution: string
  fps: number
  url: string
  thumbnailUrl?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  userId: string
  metadata?: Record<string, any>
}

interface VideoTemplate {
  id: string
  name: string
  prompt: string
  style: string
  duration: number
  resolution: string
}

interface VideoStats {
  total: number
  completed: number
  pending: number
  failed: number
  totalDuration: string
  totalSize: string
}

export default function VideoGeneratorPanel() {
  const [videos, setVideos] = useState<VideoAsset[]>([])
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  const [stats, setStats] = useState<VideoStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStyle, setFilterStyle] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  // Form state
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState("1920x1080")
  const [fps, setFps] = useState(30)

  useEffect(() => {
    fetchVideos()
    fetchTemplates()
    fetchStats()
  }, [])

  const fetchVideos = async () => {
    try {
      const params = new URLSearchParams({ action: 'list' })
      if (searchQuery) params.append('search', searchQuery)
      if (filterStyle !== 'all') params.append('style', filterStyle)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const res = await fetch(`/api/admin/creative/video?${params}`)
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos || [])
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/creative/video?action=templates')
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
      const res = await fetch('/api/admin/creative/video?action=stats')
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
      const res = await fetch('/api/admin/creative/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          duration,
          resolution,
          fps
        })
      })

      if (res.ok) {
        await fetchVideos()
        await fetchStats()
        setPrompt("")
        setActiveTab("library")
      }
    } catch (error) {
      console.error('Failed to generate video:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = (template: VideoTemplate) => {
    setPrompt(template.prompt)
    setStyle(template.style)
    setDuration(template.duration)
    setResolution(template.resolution)
    setSelectedTemplate(template.id)
    setActiveTab("generate")
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/creative/video?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchVideos()
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to delete video:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const filteredVideos = videos.filter(vid => {
    const matchesSearch = !searchQuery || 
      vid.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStyle = filterStyle === 'all' || vid.style === filterStyle
    const matchesStatus = filterStatus === 'all' || vid.status === filterStatus
    return matchesSearch && matchesStyle && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            Video Generator
          </h2>
          <p className="text-muted-foreground">Generate AI videos with custom prompts and styles</p>
        </div>
        <Button onClick={() => { fetchVideos(); fetchStats(); }} variant="outline" size="sm">
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
                  <p className="text-sm text-muted-foreground">Total Videos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Film className="w-8 h-8 text-blue-500" />
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
                <Video className="w-8 h-8 text-purple-500" />
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
            <Film className="w-4 h-4 mr-2" />
            Library ({videos.length})
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
              <CardTitle>Generate New Video</CardTitle>
              <CardDescription>Create AI-generated videos with custom prompts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="A timelapse of a sunset over the ocean..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="animated">Animated</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="timelapse">Timelapse</SelectItem>
                      <SelectItem value="slow-motion">Slow Motion</SelectItem>
                      <SelectItem value="drone">Drone Shot</SelectItem>
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
                      <SelectItem value="3">3 seconds</SelectItem>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger id="resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1280x720">720p HD</SelectItem>
                      <SelectItem value="1920x1080">1080p Full HD</SelectItem>
                      <SelectItem value="2560x1440">1440p 2K</SelectItem>
                      <SelectItem value="3840x2160">2160p 4K</SelectItem>
                      <SelectItem value="1080x1920">1080x1920 (Vertical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fps">Frame Rate</Label>
                  <Select value={fps.toString()} onValueChange={(v) => setFps(parseInt(v))}>
                    <SelectTrigger id="fps">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                      <SelectItem value="30">30 fps (Standard)</SelectItem>
                      <SelectItem value="60">60 fps (Smooth)</SelectItem>
                      <SelectItem value="120">120 fps (Slow-Mo)</SelectItem>
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
                    Generate Video
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
                  <Label htmlFor="filterStyle">Style</Label>
                  <Select value={filterStyle} onValueChange={setFilterStyle}>
                    <SelectTrigger id="filterStyle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Styles</SelectItem>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="animated">Animated</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
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
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={fetchVideos} variant="outline" className="w-full mt-4">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </CardContent>
          </Card>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <Card key={video.id}>
                <CardContent className="pt-6">
                  <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                    {video.status === 'completed' && video.url ? (
                      <>
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.prompt} className="w-full h-full object-cover" />
                        ) : (
                          <video src={video.url} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </>
                    ) : (
                      <Film className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2 mb-2">{video.prompt}</p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant={
                      video.status === 'completed' ? 'default' :
                      video.status === 'processing' ? 'secondary' :
                      video.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {video.status}
                    </Badge>
                    <Badge variant="outline">{video.style}</Badge>
                    <Badge variant="outline">{formatDuration(video.duration)}</Badge>
                    <Badge variant="outline">{video.resolution}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {video.status === 'completed' && (
                      <a href={video.url} download className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </a>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(video.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredVideos.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No videos found. Generate your first video!</p>
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
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.prompt}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{template.style}</Badge>
                    <Badge variant="outline">{formatDuration(template.duration)}</Badge>
                    <Badge variant="outline">{template.resolution}</Badge>
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
