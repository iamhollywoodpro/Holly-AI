/**
 * GitHub Actions Workflow Types
 * Used for CI/CD integration in HOLLY
 */

export interface Workflow {
  id: number;
  node_id: string;
  name: string;
  path: string;
  state: 'active' | 'deleted' | 'disabled_fork' | 'disabled_inactivity' | 'disabled_manually';
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  workflow_url: string;
  actor: {
    login: string;
    id: number;
    avatar_url: string;
  };
  triggering_actor: {
    login: string;
    id: number;
    avatar_url: string;
  };
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  run_url: string;
  node_id: string;
  head_sha: string;
  url: string;
  html_url: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  started_at: string;
  completed_at: string | null;
  name: string;
  steps: WorkflowStep[];
  check_run_url: string;
  labels: string[];
  runner_id: number | null;
  runner_name: string | null;
  runner_group_id: number | null;
  runner_group_name: string | null;
}

export interface WorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowTriggerInput {
  ref: string; // Branch or tag name
  inputs?: Record<string, any>; // Workflow-specific inputs
}

export interface WorkflowRunsResponse {
  total_count: number;
  workflow_runs: WorkflowRun[];
}

export interface WorkflowJobsResponse {
  total_count: number;
  jobs: WorkflowJob[];
}

export type WorkflowStatus = 'success' | 'failure' | 'in_progress' | 'queued' | 'cancelled' | 'skipped' | 'unknown';

export interface WorkflowStatusSummary {
  total: number;
  success: number;
  failure: number;
  in_progress: number;
  queued: number;
  cancelled: number;
  skipped: number;
}
