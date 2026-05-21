/**
 * AgentOrchestrator — Phase 6: Collaborative Sense
 *
 * Re-export from the canonical location for backward compatibility.
 * The API route imports from '@/lib/collaborative/agent-orchestrator'.
 */
export { AgentOrchestrator } from '@/lib/collaborative/agent-orchestrator';
export type {
  OrchestratorResult,
  CreateSessionOpts,
  SpawnAgentOpts,
  CreateTaskOpts,
  UpdateAgentStatusOpts,
  UpdateTaskStatusOpts,
  SendMessageOpts,
  GetMessagesOpts,
  GetSessionHistoryOpts,
} from '@/lib/collaborative/agent-orchestrator';
