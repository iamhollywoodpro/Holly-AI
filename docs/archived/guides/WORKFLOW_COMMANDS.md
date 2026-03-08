# GitHub Actions Workflow Commands

## Command Integration for CommandHandler.tsx

Add these commands to the existing CommandHandler component:

### New Commands:

```typescript
// In CommandHandler.tsx, add these state variables:
const [showWorkflowsPanel, setShowWorkflowsPanel] = useState(false);
const [showWorkflowRunDialog, setShowWorkflowRunDialog] = useState(false);
const [showWorkflowLogsViewer, setShowWorkflowLogsViewer] = useState(false);
const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: number; name: string } | null>(null);
const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
```

### Command Handlers:

```typescript
// Add to command parsing logic:

if (command === '/workflows') {
  setShowWorkflowsPanel(true);
  return;
}

if (command.startsWith('/workflow run ')) {
  const workflowName = command.substring(14).trim();
  // Find workflow by name from active repo
  const { owner, repo } = activeRepo;
  
  // Fetch workflows and find matching name
  const response = await fetch(`/api/github/workflows?owner=${owner}&repo=${repo}`);
  const data = await response.json();
  const workflow = data.workflows.find((w: any) => 
    w.name.toLowerCase() === workflowName.toLowerCase()
  );
  
  if (workflow) {
    setSelectedWorkflow({ id: workflow.id, name: workflow.name });
    setShowWorkflowRunDialog(true);
  } else {
    // Show error message
    console.error('Workflow not found:', workflowName);
  }
  return;
}

if (command.startsWith('/workflow logs ')) {
  const runId = parseInt(command.substring(15).trim());
  if (!isNaN(runId)) {
    setSelectedRunId(runId);
    setShowWorkflowLogsViewer(true);
  }
  return;
}
```

### Component Rendering:

```typescript
// Add to JSX return:

{/* Workflows Panel */}
{showWorkflowsPanel && activeRepo && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div className="w-full max-w-4xl max-h-[80vh] overflow-auto bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">GitHub Actions Workflows</h2>
        <button
          onClick={() => setShowWorkflowsPanel(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      <WorkflowsPanel
        owner={activeRepo.owner}
        repo={activeRepo.repo}
        onTriggerWorkflow={(id, name) => {
          setSelectedWorkflow({ id, name });
          setShowWorkflowRunDialog(true);
        }}
        onViewRun={(runId) => {
          setSelectedRunId(runId);
          setShowWorkflowLogsViewer(true);
        }}
      />
    </div>
  </div>
)}

{/* Workflow Run Dialog */}
{showWorkflowRunDialog && selectedWorkflow && activeRepo && (
  <WorkflowRunDialog
    isOpen={showWorkflowRunDialog}
    onClose={() => {
      setShowWorkflowRunDialog(false);
      setSelectedWorkflow(null);
    }}
    owner={activeRepo.owner}
    repo={activeRepo.repo}
    workflowId={selectedWorkflow.id}
    workflowName={selectedWorkflow.name}
    defaultBranch={activeRepo.branch}
  />
)}

{/* Workflow Logs Viewer */}
{showWorkflowLogsViewer && selectedRunId && activeRepo && (
  <WorkflowLogsViewer
    isOpen={showWorkflowLogsViewer}
    onClose={() => {
      setShowWorkflowLogsViewer(false);
      setSelectedRunId(null);
    }}
    owner={activeRepo.owner}
    repo={activeRepo.repo}
    runId={selectedRunId}
  />
)}
```

### Import Statements:

```typescript
import WorkflowsPanel from '@/components/chat/WorkflowsPanel';
import WorkflowRunDialog from '@/components/chat/WorkflowRunDialog';
import WorkflowLogsViewer from '@/components/chat/WorkflowLogsViewer';
```

## Available Commands:

1. `/workflows` - Open workflows dashboard
2. `/workflow run <name>` - Trigger a workflow by name
3. `/workflow logs <run_id>` - View logs for a specific run

## Usage Examples:

```
/workflows
/workflow run Deploy Production
/workflow logs 12345678
```
