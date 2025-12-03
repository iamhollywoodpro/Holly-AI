"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  LayoutDashboard
} from "lucide-react"

interface Dashboard {
  id: string
  name: string
  description?: string
  category: string
  layout?: any
  widgets?: any[]
  isDefault: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

interface DashboardStats {
  total: number
  public: number
  default: number
  categories: { category: string; count: number }[]
}

export default function AnalyticsDashboardPanel() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    fetchDashboards()
    fetchStats()
  }, [selectedCategory])

  const fetchDashboards = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== "all") params.append("category", selectedCategory)

      const response = await fetch(`/api/admin/analytics/dashboards?action=list&${params}`)
      const data = await response.json()
      
      if (data.success) {
        const dashboardList = data.data || []
        setDashboards(dashboardList)
        
        // Set first dashboard as selected if none selected
        if (dashboardList.length > 0 && !selectedDashboard) {
          setSelectedDashboard(dashboardList[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboards:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/analytics/dashboards?action=stats")
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!confirm("Are you sure you want to delete this dashboard?")) return

    try {
      const response = await fetch(`/api/admin/analytics/dashboards?action=delete&id=${dashboardId}`, {
        method: "DELETE"
      })
      
      const data = await response.json()
      
      if (data.success) {
        if (selectedDashboard?.id === dashboardId) {
          setSelectedDashboard(null)
        }
        fetchDashboards()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to delete dashboard:", error)
    }
  }

  // Sample widget rendering for demonstration
  const renderWidget = (widget: any) => {
    return (
      <Card key={widget.id}>
        <CardHeader>
          <CardTitle className="text-base">{widget.title || 'Widget'}</CardTitle>
          {widget.description && (
            <CardDescription>{widget.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center bg-secondary/20 rounded-lg">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboards</h2>
          <p className="text-muted-foreground">
            Create and manage custom analytics visualization dashboards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchDashboards}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Dashboard
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dashboards</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.public}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Default</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.default}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Selector & Filters */}
      <div className="flex items-center gap-4">
        <Select 
          value={selectedDashboard?.id || ""} 
          onValueChange={(value) => {
            const dashboard = dashboards.find(d => d.id === value)
            if (dashboard) setSelectedDashboard(dashboard)
          }}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a dashboard" />
          </SelectTrigger>
          <SelectContent>
            {dashboards.map((dashboard) => (
              <SelectItem key={dashboard.id} value={dashboard.id}>
                {dashboard.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Dashboard View */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboards...</p>
        </div>
      ) : !selectedDashboard ? (
        <Card>
          <CardContent className="text-center py-12">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Dashboard Selected</h3>
            <p className="text-muted-foreground mb-4">
              Select a dashboard from the dropdown or create a new one
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create First Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Selected Dashboard Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{selectedDashboard.name}</CardTitle>
                    <Badge variant="outline">{selectedDashboard.category}</Badge>
                    {selectedDashboard.isDefault && <Badge variant="secondary">Default</Badge>}
                    {selectedDashboard.isPublic && <Badge>Public</Badge>}
                  </div>
                  {selectedDashboard.description && (
                    <CardDescription>{selectedDashboard.description}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteDashboard(selectedDashboard.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Dashboard Widgets Grid */}
          {selectedDashboard.widgets && selectedDashboard.widgets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {selectedDashboard.widgets.map((widget) => renderWidget(widget))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Widgets Added</h3>
                <p className="text-muted-foreground mb-4">
                  Add widgets to visualize your data on this dashboard
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Widget
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sample Metrics Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Analytics Preview</CardTitle>
              <CardDescription>
                This is a placeholder for your actual dashboard visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold">$124,592</div>
                  <div className="text-xs text-green-600 mt-1">+12.5% from last month</div>
                </div>
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Active Users</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold">8,234</div>
                  <div className="text-xs text-green-600 mt-1">+18.2% from last month</div>
                </div>
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold">3.42%</div>
                  <div className="text-xs text-red-600 mt-1">-2.1% from last month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dashboard Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Created</div>
                  <div className="font-medium">
                    {new Date(selectedDashboard.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Last Updated</div>
                  <div className="font-medium">
                    {new Date(selectedDashboard.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Widgets</div>
                  <div className="font-medium">
                    {selectedDashboard.widgets?.length || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Dashboards List */}
      {dashboards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Dashboards</CardTitle>
            <CardDescription>
              Manage and switch between your analytics dashboards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboards.map((dashboard) => (
                <div 
                  key={dashboard.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer"
                  onClick={() => setSelectedDashboard(dashboard)}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dashboard.name}</span>
                        <Badge variant="outline" className="text-xs">{dashboard.category}</Badge>
                        {dashboard.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </div>
                      {dashboard.description && (
                        <p className="text-sm text-muted-foreground">{dashboard.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation()
                      setSelectedDashboard(dashboard)
                    }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteDashboard(dashboard.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}