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
import { Switch } from "@/components/ui/switch"
import { 
  FileText, 
  Plus, 
  Play,
  Download,
  Clock,
  Calendar,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Filter
} from "lucide-react"

interface Report {
  id: string
  name: string
  description?: string
  reportType: string
  category: string
  schedule?: string
  format: string
  isActive: boolean
  isScheduled: boolean
  lastRunAt?: string
  nextRunAt?: string
  status: string
  config?: any
  metrics?: any[]
  recipients?: string[]
  createdAt: string
  updatedAt: string
}

interface ReportStats {
  total: number
  active: number
  scheduled: number
  recentRuns: number
  categories: { category: string; count: number }[]
}

export default function CustomReportsBuilder() {
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Form state for creating new report
  const [newReport, setNewReport] = useState({
    name: "",
    description: "",
    reportType: "metrics",
    category: "business",
    schedule: "daily",
    format: "pdf",
    isActive: true,
    isScheduled: false,
    recipients: "",
    config: {}
  })

  useEffect(() => {
    fetchReports()
    fetchStats()
  }, [selectedCategory])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== "all") params.append("category", selectedCategory)

      const response = await fetch(`/api/admin/analytics/reports?action=list&${params}`)
      const data = await response.json()
      
      if (data.success) {
        setReports(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/analytics/reports?action=stats")
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleCreateReport = async () => {
    try {
      const reportData = {
        ...newReport,
        recipients: newReport.recipients.split(',').map(r => r.trim()).filter(Boolean)
      }

      const response = await fetch("/api/admin/analytics/reports?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateDialogOpen(false)
        setNewReport({
          name: "",
          description: "",
          reportType: "metrics",
          category: "business",
          schedule: "daily",
          format: "pdf",
          isActive: true,
          isScheduled: false,
          recipients: "",
          config: {}
        })
        fetchReports()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to create report:", error)
    }
  }

  const handleRunReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/analytics/reports?action=run&id=${reportId}`, {
        method: "POST"
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchReports()
      }
    } catch (error) {
      console.error("Failed to run report:", error)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return

    try {
      const response = await fetch(`/api/admin/analytics/reports?action=delete&id=${reportId}`, {
        method: "DELETE"
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchReports()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to delete report:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600"
      case "running": return "text-blue-600"
      case "failed": return "text-red-600"
      case "scheduled": return "text-orange-600"
      default: return "text-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />
      case "running": return <RefreshCw className="w-4 h-4 animate-spin" />
      case "failed": return <XCircle className="w-4 h-4" />
      case "scheduled": return <Clock className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Custom Reports</h2>
          <p className="text-muted-foreground">
            Create, schedule, and manage analytics reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Report</DialogTitle>
                <DialogDescription>
                  Build a custom analytics report with scheduling options
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Report Name</Label>
                    <Input 
                      value={newReport.name}
                      onChange={(e) => setNewReport({...newReport, name: e.target.value})}
                      placeholder="Monthly Revenue Report"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newReport.category} onValueChange={(value) => setNewReport({...newReport, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={newReport.description}
                    onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                    placeholder="Describe what this report includes..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select value={newReport.reportType} onValueChange={(value) => setNewReport({...newReport, reportType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metrics">Metrics</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="comparison">Comparison</SelectItem>
                        <SelectItem value="trend">Trend Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Select value={newReport.schedule} onValueChange={(value) => setNewReport({...newReport, schedule: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={newReport.format} onValueChange={(value) => setNewReport({...newReport, format: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recipients (comma-separated emails)</Label>
                  <Input 
                    value={newReport.recipients}
                    onChange={(e) => setNewReport({...newReport, recipients: e.target.value})}
                    placeholder="steve@nexamusicgroup.com, team@nexamusicgroup.com"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={newReport.isActive}
                      onCheckedChange={(checked) => setNewReport({...newReport, isActive: checked})}
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={newReport.isScheduled}
                      onCheckedChange={(checked) => setNewReport({...newReport, isScheduled: checked})}
                    />
                    <Label>Enable Scheduling</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateReport}>Create Report</Button>
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
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentRuns}</div>
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
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first custom report to start generating analytics
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{report.name}</CardTitle>
                      <Badge variant="outline">{report.category}</Badge>
                      <Badge variant="outline">{report.reportType}</Badge>
                      {report.isScheduled && <Badge variant="secondary">Scheduled</Badge>}
                      {!report.isActive && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    {report.description && (
                      <CardDescription>{report.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleRunReport(report.id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Run
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteReport(report.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Status</div>
                    <div className={`flex items-center gap-1 font-medium ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      {report.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Schedule</div>
                    <div className="font-medium">{report.schedule || 'Manual'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Format</div>
                    <div className="font-medium uppercase">{report.format}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Last Run</div>
                    <div className="font-medium">
                      {report.lastRunAt ? new Date(report.lastRunAt).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>
                {report.recipients && report.recipients.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Recipients:</div>
                    <div className="flex flex-wrap gap-2">
                      {report.recipients.map((email, i) => (
                        <Badge key={i} variant="secondary">{email}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {report.nextRunAt && (
                  <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                    Next scheduled run: {new Date(report.nextRunAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}