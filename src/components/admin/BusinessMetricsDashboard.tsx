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
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  BarChart3,
  RefreshCw,
  Plus,
  Eye,
  Download,
  Filter,
  Calendar
} from "lucide-react"

interface Metric {
  id: string
  category: string
  name: string
  description?: string
  value: number
  previousValue?: number
  unit: string
  format: string
  target?: number
  threshold?: number
  aggregationType: string
  timeGranularity: string
  isActive: boolean
  metadata?: any
  tags?: string[]
  createdAt: string
  updatedAt: string
}

interface MetricStats {
  total: number
  active: number
  categories: { category: string; count: number }[]
  recentUpdates: number
}

export default function BusinessMetricsDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [stats, setStats] = useState<MetricStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("24h")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Form state for adding new metric
  const [newMetric, setNewMetric] = useState({
    category: "business",
    name: "",
    description: "",
    value: 0,
    unit: "",
    format: "number",
    target: 0,
    aggregationType: "sum",
    timeGranularity: "hour"
  })

  useEffect(() => {
    fetchMetrics()
    fetchStats()
  }, [selectedCategory, selectedTimeRange])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== "all") params.append("category", selectedCategory)
      params.append("timeRange", selectedTimeRange)

      const response = await fetch(`/api/admin/analytics/metrics?action=list&${params}`)
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/analytics/metrics?action=stats")
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleAddMetric = async () => {
    try {
      const response = await fetch("/api/admin/analytics/metrics?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMetric)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsAddDialogOpen(false)
        setNewMetric({
          category: "business",
          name: "",
          description: "",
          value: 0,
          unit: "",
          format: "number",
          target: 0,
          aggregationType: "sum",
          timeGranularity: "hour"
        })
        fetchMetrics()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to add metric:", error)
    }
  }

  const calculateChange = (current: number, previous?: number) => {
    if (!previous) return 0
    return ((current - previous) / previous) * 100
  }

  const formatValue = (value: number, format: string, unit: string) => {
    switch (format) {
      case "currency":
        return `$${value.toLocaleString()}`
      case "percentage":
        return `${value.toFixed(2)}%`
      case "decimal":
        return value.toFixed(2)
      default:
        return `${value.toLocaleString()} ${unit}`
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "revenue": return <DollarSign className="w-4 h-4" />
      case "users": return <Users className="w-4 h-4" />
      case "engagement": return <Activity className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "revenue": return "text-green-600"
      case "users": return "text-blue-600"
      case "engagement": return "text-purple-600"
      case "performance": return "text-orange-600"
      default: return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Metrics</h2>
          <p className="text-muted-foreground">
            Monitor real-time business metrics and KPIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchMetrics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Metric
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Metric</DialogTitle>
                <DialogDescription>
                  Create a new business metric to track
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newMetric.category} onValueChange={(value) => setNewMetric({...newMetric, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input 
                      value={newMetric.name}
                      onChange={(e) => setNewMetric({...newMetric, name: e.target.value})}
                      placeholder="Metric name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={newMetric.description}
                    onChange={(e) => setNewMetric({...newMetric, description: e.target.value})}
                    placeholder="Describe what this metric measures..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input 
                      type="number"
                      value={newMetric.value}
                      onChange={(e) => setNewMetric({...newMetric, value: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input 
                      value={newMetric.unit}
                      onChange={(e) => setNewMetric({...newMetric, unit: e.target.value})}
                      placeholder="USD, users, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={newMetric.format} onValueChange={(value) => setNewMetric({...newMetric, format: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="currency">Currency</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="decimal">Decimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aggregation</Label>
                    <Select value={newMetric.aggregationType} onValueChange={(value) => setNewMetric({...newMetric, aggregationType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time Granularity</Label>
                    <Select value={newMetric.timeGranularity} onValueChange={(value) => setNewMetric({...newMetric, timeGranularity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minute">Minute</SelectItem>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddMetric}>Add Metric</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUpdates}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Grid */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      ) : metrics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Metrics Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first metric to start tracking business performance
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Metric
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const change = calculateChange(metric.value, metric.previousValue)
            const isPositive = change > 0
            const meetsTarget = metric.target ? metric.value >= metric.target : undefined

            return (
              <Card key={metric.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={getCategoryColor(metric.category)}>
                        {getCategoryIcon(metric.category)}
                      </div>
                      <Badge variant="outline">{metric.category}</Badge>
                    </div>
                    {!metric.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <CardTitle className="text-base">{metric.name}</CardTitle>
                  {metric.description && (
                    <CardDescription className="text-xs">{metric.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold">
                        {formatValue(metric.value, metric.format, metric.unit)}
                      </span>
                      {metric.previousValue && (
                        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {Math.abs(change).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    {metric.target && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Target: {formatValue(metric.target, metric.format, metric.unit)}</span>
                          <span>{meetsTarget ? '✓ Met' : '✗ Not met'}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${meetsTarget ? 'bg-green-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <span>{metric.aggregationType} • {metric.timeGranularity}</span>
                      <span>{new Date(metric.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}