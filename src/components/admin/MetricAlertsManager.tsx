"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  Bell, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react"

interface Alert {
  id: string
  metricId: string
  metricName?: string
  name: string
  description?: string
  alertType: string
  condition: string
  threshold: number
  severity: string
  isActive: boolean
  notificationChannels?: string[]
  recipients?: string[]
  cooldownMinutes?: number
  lastTriggeredAt?: string
  triggerCount: number
  createdAt: string
  updatedAt: string
}

interface AlertStats {
  total: number
  active: number
  triggered: number
  severityBreakdown: { severity: string; count: number }[]
}

export default function MetricAlertsManager() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Form state for creating new alert
  const [newAlert, setNewAlert] = useState({
    metricId: "",
    name: "",
    description: "",
    alertType: "threshold",
    condition: "greater_than",
    threshold: 0,
    severity: "warning",
    isActive: true,
    notificationChannels: ["web"],
    recipients: "",
    cooldownMinutes: 60
  })

  useEffect(() => {
    fetchAlerts()
    fetchStats()
  }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/analytics/alerts?action=list")
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/analytics/alerts?action=stats")
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleCreateAlert = async () => {
    try {
      const alertData = {
        ...newAlert,
        recipients: newAlert.recipients.split(',').map(r => r.trim()).filter(Boolean)
      }

      const response = await fetch("/api/admin/analytics/alerts?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateDialogOpen(false)
        setNewAlert({
          metricId: "",
          name: "",
          description: "",
          alertType: "threshold",
          condition: "greater_than",
          threshold: 0,
          severity: "warning",
          isActive: true,
          notificationChannels: ["web"],
          recipients: "",
          cooldownMinutes: 60
        })
        fetchAlerts()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to create alert:", error)
    }
  }

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/analytics/alerts?action=update&id=${alertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchAlerts()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to toggle alert:", error)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return

    try {
      const response = await fetch(`/api/admin/analytics/alerts?action=delete&id=${alertId}`, {
        method: "DELETE"
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchAlerts()
        fetchStats()
      }
    } catch (error) {
      console.error("Failed to delete alert:", error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-600 bg-red-100"
      case "high": return "text-orange-600 bg-orange-100"
      case "warning": return "text-yellow-600 bg-yellow-100"
      case "info": return "text-blue-600 bg-blue-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4" />
      case "high": return <AlertTriangle className="w-4 h-4" />
      case "warning": return <AlertTriangle className="w-4 h-4" />
      case "info": return <CheckCircle className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getConditionDisplay = (condition: string) => {
    switch (condition) {
      case "greater_than": return ">"
      case "less_than": return "<"
      case "equals": return "="
      case "not_equals": return "≠"
      case "greater_than_or_equal": return "≥"
      case "less_than_or_equal": return "≤"
      default: return condition
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Metric Alerts</h2>
          <p className="text-muted-foreground">
            Configure threshold alerts and notifications for business metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAlerts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Alert</DialogTitle>
                <DialogDescription>
                  Configure threshold-based alerts for your business metrics
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Name</Label>
                    <Input 
                      value={newAlert.name}
                      onChange={(e) => setNewAlert({...newAlert, name: e.target.value})}
                      placeholder="High Revenue Alert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Metric ID</Label>
                    <Input 
                      value={newAlert.metricId}
                      onChange={(e) => setNewAlert({...newAlert, metricId: e.target.value})}
                      placeholder="metric_123"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                    placeholder="Describe when this alert should trigger..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select value={newAlert.alertType} onValueChange={(value) => setNewAlert({...newAlert, alertType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="threshold">Threshold</SelectItem>
                        <SelectItem value="anomaly">Anomaly</SelectItem>
                        <SelectItem value="trend">Trend</SelectItem>
                        <SelectItem value="change">Change Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={newAlert.condition} onValueChange={(value) => setNewAlert({...newAlert, condition: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="greater_than_or_equal">Greater or Equal</SelectItem>
                        <SelectItem value="less_than_or_equal">Less or Equal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Threshold</Label>
                    <Input 
                      type="number"
                      value={newAlert.threshold}
                      onChange={(e) => setNewAlert({...newAlert, threshold: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={newAlert.severity} onValueChange={(value) => setNewAlert({...newAlert, severity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cooldown (minutes)</Label>
                    <Input 
                      type="number"
                      value={newAlert.cooldownMinutes}
                      onChange={(e) => setNewAlert({...newAlert, cooldownMinutes: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recipients (comma-separated emails)</Label>
                  <Input 
                    value={newAlert.recipients}
                    onChange={(e) => setNewAlert({...newAlert, recipients: e.target.value})}
                    placeholder="steve@nexamusicgroup.com, team@nexamusicgroup.com"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={newAlert.isActive}
                    onCheckedChange={(checked) => setNewAlert({...newAlert, isActive: checked})}
                  />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAlert}>Create Alert</Button>
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
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Triggered</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.triggered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.severityBreakdown.find(s => s.severity === 'critical')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Alerts Configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first alert to monitor business metrics
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{alert.name}</CardTitle>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {getSeverityIcon(alert.severity)}
                        <span className="ml-1">{alert.severity}</span>
                      </Badge>
                      <Badge variant="outline">{alert.alertType}</Badge>
                      {!alert.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {alert.description && (
                      <CardDescription>{alert.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={alert.isActive}
                      onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                    />
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteAlert(alert.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Condition:</span>
                      <code className="px-2 py-1 bg-secondary rounded text-sm font-mono">
                        Metric {getConditionDisplay(alert.condition)} {alert.threshold}
                      </code>
                    </div>
                    {alert.cooldownMinutes && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Cooldown:</span>
                        <span className="font-medium">{alert.cooldownMinutes} min</span>
                      </div>
                    )}
                  </div>
                  {alert.notificationChannels && alert.notificationChannels.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Channels:</span>
                      <div className="flex gap-2">
                        {alert.notificationChannels.map((channel, i) => (
                          <Badge key={i} variant="secondary">{channel}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {alert.recipients && alert.recipients.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Recipients:</span>
                      <div className="flex flex-wrap gap-2">
                        {alert.recipients.map((email, i) => (
                          <Badge key={i} variant="outline">{email}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
                    <div>
                      Triggered {alert.triggerCount} times
                      {alert.lastTriggeredAt && (
                        <span> • Last: {new Date(alert.lastTriggeredAt).toLocaleString()}</span>
                      )}
                    </div>
                    <div>Created {new Date(alert.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}