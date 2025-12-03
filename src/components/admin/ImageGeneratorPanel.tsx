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
  Image, 
  Wand2, 
  Download, 
  Trash2, 
  RefreshCw,
  Sparkles,
  FileImage,
  Grid3x3,
  Plus,
  Search,
  Filter
} from "lucide-react"

interface ImageAsset {
  id: string
  prompt: string
  style: string
  dimensions: string
  format: string
  url: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
  userId: string
  metadata?: Record<string, any>
}

interface ImageTemplate {
  id: string
  name: string
  prompt: string
  style: string
  dimensions: string
}

interface ImageStats {
  total: number
  completed: number
  pending: number
  failed: number
  totalSize: string
}

export default function ImageGeneratorPanel() {
  const [images, setImages] = useState<ImageAsset[]>([])
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [stats, setStats] = useState<ImageStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStyle, setFilterStyle] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  // Form state
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("photorealistic")
  const [dimensions, setDimensions] = useState("1024x1024")
  const [format, setFormat] = useState("png")

  useEffect(() => {
    fetchImages()
    fetchTemplates()
    fetchStats()
  }, [])

  const fetchImages = async () => {
    try {
      const params = new URLSearchParams({ action: 'list' })
      if (searchQuery) params.append('search', searchQuery)
      if (filterStyle !== 'all') params.append('style', filterStyle)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const res = await fetch(`/api/admin/creative/image?${params}`)
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/creative/image?action=templates')
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
      const res = await fetch('/api/admin/creative/image?action=stats')
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
      const res = await fetch('/api/admin/creative/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          dimensions,
          format
        })
      })

      if (res.ok) {
        await fetchImages()
        await fetchStats()
        setPrompt("")
        setActiveTab("gallery")
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = (template: ImageTemplate) => {
    setPrompt(template.prompt)
    setStyle(template.style)
    setDimensions(template.dimensions)
    setSelectedTemplate(template.id)
    setActiveTab("generate")
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/creative/image?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchImages()
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  }

  const filteredImages = images.filter(img => {
    const matchesSearch = !searchQuery || 
      img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStyle = filterStyle === 'all' || img.style === filterStyle
    const matchesStatus = filterStatus === 'all' || img.status === filterStatus
    return matchesSearch && matchesStyle && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Image className="w-6 h-6" />
            Image Generator
          </h2>
          <p className="text-muted-foreground">Generate AI images with custom prompts and styles</p>
        </div>
        <Button onClick={() => { fetchImages(); fetchStats(); }} variant="outline" size="sm">
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
                  <p className="text-sm text-muted-foreground">Total Images</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileImage className="w-8 h-8 text-blue-500" />
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
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-orange-500" />
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
                <Grid3x3 className="w-8 h-8 text-purple-500" />
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
          <TabsTrigger value="gallery">
            <Grid3x3 className="w-4 h-4 mr-2" />
            Gallery ({images.length})
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
              <CardTitle>Generate New Image</CardTitle>
              <CardDescription>Create AI-generated images with custom prompts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="A beautiful sunset over mountains..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photorealistic">Photorealistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="anime">Anime</SelectItem>
                      <SelectItem value="digital-art">Digital Art</SelectItem>
                      <SelectItem value="oil-painting">Oil Painting</SelectItem>
                      <SelectItem value="watercolor">Watercolor</SelectItem>
                      <SelectItem value="sketch">Sketch</SelectItem>
                      <SelectItem value="3d-render">3D Render</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Select value={dimensions} onValueChange={setDimensions}>
                    <SelectTrigger id="dimensions">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512x512">512x512 (Square)</SelectItem>
                      <SelectItem value="768x768">768x768 (Square)</SelectItem>
                      <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                      <SelectItem value="1024x768">1024x768 (Landscape)</SelectItem>
                      <SelectItem value="768x1024">768x1024 (Portrait)</SelectItem>
                      <SelectItem value="1920x1080">1920x1080 (HD)</SelectItem>
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
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
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
                    Generate Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4">
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
                      <SelectItem value="photorealistic">Photorealistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="anime">Anime</SelectItem>
                      <SelectItem value="digital-art">Digital Art</SelectItem>
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
              <Button onClick={fetchImages} variant="outline" className="w-full mt-4">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </CardContent>
          </Card>

          {/* Image Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((image) => (
              <Card key={image.id}>
                <CardContent className="pt-6">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {image.status === 'completed' && image.url ? (
                      <img src={image.url} alt={image.prompt} className="w-full h-full object-cover" />
                    ) : (
                      <FileImage className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2 mb-2">{image.prompt}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={
                      image.status === 'completed' ? 'default' :
                      image.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {image.status}
                    </Badge>
                    <Badge variant="outline">{image.style}</Badge>
                    <Badge variant="outline">{image.dimensions}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {image.status === 'completed' && (
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={image.url} download>
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(image.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredImages.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <FileImage className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No images found. Generate your first image!</p>
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
                  <div className="flex gap-2">
                    <Badge variant="outline">{template.style}</Badge>
                    <Badge variant="outline">{template.dimensions}</Badge>
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
