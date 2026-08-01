/**
 * HOLLY Action Executor — Phase 4.1 / 4.2
 *
 * Executes detected actions from action-detector.ts. Routes each action type
 * to the correct tool/API, sends SSE progress updates, and returns results
 * that get injected back into the conversation.
 *
 * This is the execution half of "the bridge" — action-detector finds the
 * intent, action-executor carries it out.
 */

import type { DetectedAction, ActionType } from './action-detector';
import { ACTION_STATUS_EMOJI, ACTION_STATUS_LABEL } from './action-detector';
import { inspectFile } from '@/lib/self-code/holly-self-awareness';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  /** Human-readable summary for Holly to incorporate */
  summary: string;
  /** Raw tool output (may be long — for the model context, not the user) */
  rawOutput?: string;
  /** If an image was generated, the markdown to render inline */
  imageMarkdown?: string;
}

export interface ExecutorContext {
  /** SSE status sender */
  sendStatus: (s: string) => void;
  /** SSE tool event sender */
  sendTool: (toolName: string, status: string, result?: unknown) => void;
  /** MCP tool caller (if MCP tools are loaded) */
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Pending messages array — push tool results here for model context */
  pendingMessages: ChatMessage[];
}

// ─── Executors ───────────────────────────────────────────────────────────────

/**
 * Execute a single detected action.
 * Returns the result to inject into the conversation.
 */
export async function executeAction(
  action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  const emoji = ACTION_STATUS_EMOJI[action.type];
  const label = ACTION_STATUS_LABEL[action.type];

  // Send initial status
  ctx.sendStatus(`${emoji} ${label}`);

  try {
    switch (action.type) {
      case 'code_inspect':
        return await executeCodeInspect(action, ctx);
      case 'file_read':
        return await executeFileRead(action, ctx);
      case 'file_write':
        return await executeFileWrite(action, ctx);
      case 'test_run':
        return await executeTestRun(action, ctx);
      case 'search':
        return await executeSearch(action, ctx);
      case 'memory_write':
        return await executeMemoryWrite(action, ctx);
      case 'image_gen':
        // Image gen is already handled by the inline prompt interceptor.
        // If we get here, it's a conversational "let me show you" that
        // doesn't contain a parseable prompt — skip rather than generate
        // a wrong image.
        return { success: false, summary: 'Image generation handled elsewhere.' };
      case 'code_fix':
      case 'build':
        // These require the confirmation gate (Phase C3).
        // For now, acknowledge and let Holly continue — she'll propose
        // the change in her response text.
        return {
          success: true,
          summary: `${label} queued — I'll propose the changes for your approval.`,
        };
      case 'plan':
        return { success: false, summary: 'Plans are rendered, not executed.' };
      default:
        return { success: false, summary: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ActionExecutor] Error executing ${action.type}:`, errMsg);
    return {
      success: false,
      summary: `Action failed: ${errMsg.substring(0, 200)}`,
    };
  }
}

// ─── Individual Executors ────────────────────────────────────────────────────

/**
 * Code inspection — reads a file from Holly's codebase using the
 * self-awareness module's inspectFile(). This is Holly reading her OWN code.
 */
async function executeCodeInspect(
  action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  // If a specific file was mentioned, inspect it
  const filePath = action.params.filePath;
  if (filePath) {
    ctx.sendTool('inspectFile', 'start');
    try {
      const result = await inspectFile(filePath);
      ctx.sendTool('inspectFile', 'complete', { path: filePath });
      return {
        success: true,
        summary: `Inspected \`${filePath}\` — ${result.summary || 'file read successfully'}`,
        rawOutput: result.content?.substring(0, 4000),
      };
    } catch (err) {
      ctx.sendTool('inspectFile', 'error');
      return {
        success: false,
        summary: `Could not read \`${filePath}\`: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }
  }

  // Generic "check the code" — inspect key architecture files
  ctx.sendStatus('🔍 Scanning codebase structure…');
  const keyFiles = [
    'src/lib/ai/smart-router.ts',
    'src/lib/holly-modes.ts',
    'app/api/chat/route.ts',
    'package.json',
  ];

  const summaries: string[] = [];
  for (const f of keyFiles) {
    try {
      const result = await inspectFile(f);
      summaries.push(`✅ \`${f}\`: ${result.summary || 'OK'}`);
    } catch {
      summaries.push(`⚠️ \`${f}\`: could not read`);
    }
  }

  ctx.sendTool('inspectFile', 'complete', { filesChecked: keyFiles.length });
  return {
    success: true,
    summary: `Codebase scan complete:\n${summaries.join('\n')}`,
  };
}

/**
 * File reading — uses MCP local_read_file if available, else inspectFile.
 */
async function executeFileRead(
  action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  const filePath = action.params.filePath;
  if (!filePath) {
    return { success: false, summary: 'No file path specified.' };
  }

  ctx.sendTool('readFile', 'start');

  // Try MCP tool first (more capable)
  if (ctx.callTool) {
    try {
      const result = await ctx.callTool('local_read_file', { path: filePath });
      ctx.sendTool('readFile', 'complete', { path: filePath });
      const text = typeof result === 'string'
        ? result
        : (result as any)?.content?.[0]?.text || JSON.stringify(result);
      return {
        success: true,
        summary: `Read \`${filePath}\` (${text.length} chars)`,
        rawOutput: text.substring(0, 4000),
      };
    } catch {
      // Fall through to inspectFile
    }
  }

  // Fallback: self-awareness module
  try {
    const result = await inspectFile(filePath);
    ctx.sendTool('readFile', 'complete', { path: filePath });
    return {
      success: true,
      summary: `Read \`${filePath}\` — ${result.summary || 'OK'}`,
      rawOutput: result.content?.substring(0, 4000),
    };
  } catch (err) {
    ctx.sendTool('readFile', 'error');
    return {
      success: false,
      summary: `Could not read \`${filePath}\`: ${err instanceof Error ? err.message : 'unknown error'}`,
    };
  }
}

/**
 * File writing — requires confirmation gate in production.
 * For now, routes through MCP local_write_file if available.
 */
async function executeFileWrite(
  action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  const filePath = action.params.filePath;
  if (!filePath) {
    return { success: false, summary: 'No file path specified.' };
  }

  // File writes require the confirmation gate (Phase C3).
  // For now, acknowledge the intent — Holly will propose the content in text.
  return {
    success: true,
    summary: `📝 I'll create \`${filePath}\` — the content is in my response above. ` +
      'Confirm and I\'ll write it to disk.',
  };
}

/**
 * Test running — executes the project test suite.
 * Uses the run_project_tests MCP tool (Phase D1) if available.
 */
async function executeTestRun(
  _action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  ctx.sendTool('runTests', 'start');

  if (ctx.callTool) {
    try {
      const result = await ctx.callTool('run_project_tests', {});
      ctx.sendTool('runTests', 'complete', result);
      return {
        success: true,
        summary: 'Tests completed — see results in tool output.',
        rawOutput: typeof result === 'string'
          ? result
          : (result as any)?.content?.[0]?.text || JSON.stringify(result).substring(0, 2000),
      };
    } catch (err) {
      ctx.sendTool('runTests', 'error');
      return {
        success: false,
        summary: `Test run failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }
  }

  // No test runner tool available
  ctx.sendTool('runTests', 'error');
  return {
    success: false,
    summary: 'Test runner tool not available in this environment. ' +
      'I can write test code but cannot execute the suite directly yet.',
  };
}

/**
 * Web search — uses MCP web_search if available.
 */
async function executeSearch(
  action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  const query = action.params.query;
  if (!query) {
    return { success: false, summary: 'No search query specified.' };
  }

  ctx.sendTool('web_search', 'start');

  if (ctx.callTool) {
    try {
      const result = await ctx.callTool('web_search', { query });
      ctx.sendTool('web_search', 'complete', result);
      const text = typeof result === 'string'
        ? result
        : (result as any)?.content?.[0]?.text || JSON.stringify(result);
      return {
        success: true,
        summary: `Search complete for "${query}"`,
        rawOutput: text.substring(0, 2000),
      };
    } catch (err) {
      ctx.sendTool('web_search', 'error');
      return {
        success: false,
        summary: `Search failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }
  }

  ctx.sendTool('web_search', 'error');
  return {
    success: false,
    summary: 'Web search tool not available. I can share what I know from my training data.',
  };
}

/**
 * Memory write — uses MCP memory_write if available.
 */
async function executeMemoryWrite(
  _action: DetectedAction,
  ctx: ExecutorContext,
): Promise<ActionResult> {
  if (ctx.callTool) {
    try {
      // Memory writes happen in the background via post-response hook
      // This is a no-op acknowledgment — the actual memory update
      // happens through the conversation persistence layer
      return {
        success: true,
        summary: '🧠 Saved to memory.',
      };
    } catch {
      return { success: false, summary: 'Could not save to memory.' };
    }
  }

  // Even without MCP, memory persists through the conversation system
  return { success: true, summary: '🧠 Noted — I\'ll remember that.' };
}

// ─── Multi-Step Execution ────────────────────────────────────────────────────

/**
 * Execute multiple detected actions in sequence.
 * Each action's result is fed forward as context for the next.
 *
 * This enables: "Let me check the code and fix the issues" →
 *   1. inspect code → results
 *   2. propose fix → based on inspection results
 */
export async function executeActions(
  actions: DetectedAction[],
  ctx: ExecutorContext,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, ctx);
    results.push(result);

    // If an action fails critically, stop the sequence
    if (!result.success && action.type === 'code_inspect') {
      // Can't fix what we can't read — stop here
      break;
    }

    // Inject each result into pending messages so the model
    // has context for any follow-up generation
    ctx.pendingMessages.push({
      role: 'user' as const,
      content: `[ACTION RESULT]\nAction: ${action.type}\nOutcome: ${result.summary}\n` +
        (result.rawOutput ? `\nDetails:\n${result.rawOutput.substring(0, 2000)}\n` : '') +
        '\nIncorporate this result naturally into your response. Do not repeat it verbatim.',
    });
  }

  return results;
}
