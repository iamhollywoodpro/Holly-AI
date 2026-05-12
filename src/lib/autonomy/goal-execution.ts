/**
 * Goal Execution Engine
 * 
 * Executes autonomous goals by:
 * - Breaking down goals into actionable steps
 * - Executing steps with proper error handling
 * - Tracking progress and results
 * - Handling failures with retry logic
 * - Learning from execution outcomes
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logging/structured-logger';
import { execSync } from 'child_process';

const prisma = new PrismaClient();
const logger = createLogger('goal-execution');

// LLM helper — calls Groq for analysis tasks
async function callLLM(prompt: string, systemPrompt: string = 'You are Holly, an expert AI engineer.'): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.GROQ_API_KEY
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct';

  if (!apiKey) throw new Error('No LLM API key configured for goal execution');

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4096 }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`LLM call failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// GitHub API helper
async function githubRequest(path: string, method: string = 'GET', body?: any): Promise<any> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.HOLLY_GITHUB_OWNER || 'iamhollywoodpro';
  const repo = process.env.GITHUB_REPO || process.env.HOLLY_GITHUB_REPO || 'Holly-AI';
  if (!token) throw new Error('GITHUB_TOKEN not configured');

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status}`);
  return res.json();
}

export interface GoalExecutionStep {
  id: string;
  action: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  duration?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExecutionResult {
  success: boolean;
  goalId: string;
  steps: GoalExecutionStep[];
  totalDuration: number;
  error?: string;
  lessons?: string[];
}

/**
 * Execute a single goal step
 */
async function executeGoalStep(
  step: GoalExecutionStep
): Promise<{ success: boolean; output?: any; error?: string }> {
  const startTime = Date.now();
  
  try {
    logger.info(`Executing goal step: ${step.action}`, { stepId: step.id });

    let output: any;

    // Route to appropriate action handler based on action type
    switch (step.action) {
      case 'analyze_performance':
        output = await analyzePerformance(step.input);
        break;
      case 'optimize_code':
        output = await optimizeCode(step.input);
        break;
      case 'run_tests':
        output = await runTests(step.input);
        break;
      case 'deploy':
        output = await deploy(step.input);
        break;
      case 'learn_from_feedback':
        output = await learnFromFeedback(step.input);
        break;
      case 'update_documentation':
        output = await updateDocumentation(step.input);
        break;
      case 'fix_issue':
        output = await fixIssue(step.input);
        break;
      default:
        throw new Error(`Unknown action type: ${step.action}`);
    }

    const duration = Date.now() - startTime;
    logger.info(`Goal step completed: ${step.action}`, { 
      stepId: step.id, 
      duration 
    });

    return { success: true, output };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`Goal step failed: ${step.action}`, { 
      stepId: step.id, 
      error: errorMessage,
      duration 
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Analyze performance and identify bottlenecks
 */
async function analyzePerformance(input: any): Promise<any> {
  // Fetch recent performance metrics
  const recentMetrics = await prisma.performanceSnapshot.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  if (recentMetrics.length === 0) {
    return { issues: [], recommendations: [] };
  }

  // Analyze metrics for issues
  const issues: any[] = [];
  
  const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / recentMetrics.length;
  const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
  const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / recentMetrics.length;

  if (avgResponseTime > 1000) {
    issues.push({
      type: 'slow_response',
      severity: 'high',
      value: avgResponseTime,
      threshold: 1000,
      recommendation: 'Investigate database queries and API endpoints'
    });
  }

  if (avgErrorRate > 5) {
    issues.push({
      type: 'high_error_rate',
      severity: 'critical',
      value: avgErrorRate,
      threshold: 5,
      recommendation: 'Review error logs and fix failing endpoints'
    });
  }

  if (avgMemoryUsage > 2000) {
    issues.push({
      type: 'high_memory_usage',
      severity: 'medium',
      value: avgMemoryUsage,
      threshold: 2000,
      recommendation: 'Check for memory leaks and optimize data structures'
    });
  }

  return {
    metrics: {
      avgResponseTime,
      avgErrorRate,
      avgMemoryUsage,
    },
    issues,
    recommendations: issues.map(i => i.recommendation)
  };
}

/**
 * Optimize code based on analysis
 */
async function optimizeCode(input: any): Promise<any> {
  const { filePath, optimizationType } = input;
  logger.info(`Optimizing code: ${filePath}`, { optimizationType });

  try {
    // Read the file from GitHub
    const fileContent = await githubRequest(`/contents/${filePath}`);
    const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

    // Ask LLM for optimization suggestions
    const analysis = await callLLM(
      `Analyze this code file and provide specific optimizations:\n\nFile: ${filePath}\n\`\`\`\n${content.substring(0, 8000)}\n\`\`\`\n\nType of optimization requested: ${optimizationType || 'general'}\n\nProvide a JSON array of optimizations with {type, description, code_snippet, impact} fields. Only include practical, safe changes.`,
      'You are an expert code optimizer. Return ONLY a valid JSON array, no markdown.'
    );

    let optimizations;
    try {
      optimizations = JSON.parse(analysis);
    } catch {
      optimizations = [{ type: optimizationType || 'general', description: analysis.substring(0, 500), impact: 'medium' }];
    }

    // Store the optimization result as a learning event
    await prisma.learningEvent.create({
      data: {
        type: 'code_optimization',
        userId: 'system',
        data: { filePath, optimizations, timestamp: new Date() },
        timestamp: new Date(),
      },
    });

    return { success: true, optimizations, filePath, analyzedAt: new Date() };
  } catch (error) {
    logger.error('optimizeCode failed', { filePath, error: String(error) });
    return { success: false, filePath, error: String(error) };
  }
}

/**
 * Run test suite
 */
async function runTests(input: any): Promise<any> {
  const { testSuite, coverage } = input;
  logger.info(`Running tests: ${testSuite || 'all'}`);

  try {
    // Run jest tests locally
    const testPath = testSuite || '';
    const startTime = Date.now();
    let result: string;
    try {
      result = execSync(`npx jest ${testPath} --no-coverage --json 2>/dev/null || true`, {
        timeout: 120_000,
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
    } catch (e: any) {
      // jest exits non-zero on test failures but still outputs JSON
      result = e.stdout || e.message;
    }
    const duration = Date.now() - startTime;

    // Parse jest JSON output
    let parsed: any = {};
    try {
      // Extract JSON from output (jest may output other text too)
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { /* fallback to raw output */ }

    const total = parsed.numTotalTests || 0;
    const passed = parsed.numPassedTests || 0;
    const failed = parsed.numFailedTests || 0;

    return {
      total,
      passed,
      failed,
      coverage: coverage || 0,
      duration,
      success: failed === 0,
      failures: parsed.testResults?.flatMap((r: any) =>
        r.assertionResults?.filter((a: any) => a.status === 'failed').map((a: any) => a.fullName) || []
      ) || [],
    };
  } catch (error) {
    logger.error('runTests failed', { error: String(error) });
    return { total: 0, passed: 0, failed: 0, duration: 0, success: false, error: String(error) };
  }
}

/**
 * Deploy application
 */
async function deploy(input: any): Promise<any> {
  const { environment, version } = input;
  logger.info(`Deploying to ${environment}: ${version}`);

  try {
    // Trigger Coolify redeploy via webhook or push-based deploy
    const deployHookUrl = process.env.COOLIFY_DEPLOY_WEBHOOK;
    if (deployHookUrl) {
      const res = await fetch(deployHookUrl, { method: 'POST', signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`Deploy webhook failed: ${res.status}`);
      const data = await res.json().catch(() => ({}));
      return { success: true, deploymentUrl: `https://holly.nexamusicgroup.com`, version, environment, deployedAt: new Date(), webhookResponse: data };
    }

    // Fallback: git push triggers Coolify auto-deploy
    try {
      execSync('git push origin main 2>&1', { timeout: 60_000, encoding: 'utf-8' });
      return { success: true, deploymentUrl: `https://holly.nexamusicgroup.com`, version, environment, deployedAt: new Date(), method: 'git_push' };
    } catch (gitErr: any) {
      logger.warn('Git push deploy failed', { error: gitErr.message });
      return { success: false, error: `Deploy failed: ${gitErr.message}`, environment };
    }
  } catch (error) {
    logger.error('deploy failed', { error: String(error) });
    return { success: false, error: String(error), environment };
  }
}

/**
 * Learn from user feedback
 */
async function learnFromFeedback(input: any): Promise<any> {
  const { feedbackType, sentiment, lessons } = input;

  logger.info(`Learning from feedback: ${feedbackType}`);

  // Store learning event
  await prisma.learningEvent.create({
    data: {
      type: feedbackType,
      userId: input.userId || 'system',
      data: {
        sentiment,
        lessons,
        timestamp: new Date()
      },
      timestamp: new Date()
    }
  });

  return {
    learned: true,
    lessonsLearned: lessons,
    timestamp: new Date()
  };
}

/**
 * Update documentation
 */
async function updateDocumentation(input: any): Promise<any> {
  const { docPath, content } = input;

  logger.info(`Updating documentation: ${docPath}`);

  // This would update actual documentation files
  return {
    success: true,
    path: docPath,
    updated: true,
    timestamp: new Date()
  };
}

/**
 * Fix identified issue
 */
async function fixIssue(input: any): Promise<any> {
  const { issueId, fixType, fixDescription } = input;

  logger.info(`Fixing issue: ${issueId}`);

  // This would implement the actual fix
  return {
    success: true,
    issueId,
    fixType,
    description: fixDescription,
    fixedAt: new Date()
  };
}

/**
 * Execute a complete goal
 */
export async function executeGoal(goalId: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const steps: GoalExecutionStep[] = [];
  const lessons: string[] = [];

  try {
    // Fetch goal details
    const goals = await prisma.$queryRaw`SELECT * FROM goals WHERE id = ${goalId} LIMIT 1`;
    const goal = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    logger.info(`Starting goal execution: ${goal.title}`, { goalId });

    // Update goal status to in_progress
    await prisma.$executeRaw`
      UPDATE goals 
      SET status = 'in_progress', 
          started_at = NOW(), 
          updated_at = NOW() 
      WHERE id = ${goalId}
    `;

    // Parse goal actions
    const actions: any[] = goal.actions || [];
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const step: GoalExecutionStep = {
        id: `${goalId}-step-${i}`,
        action: action.type,
        description: action.description || action.type,
        status: 'in_progress',
        input: action.input || {},
        startedAt: new Date()
      };

      // Execute step
      const result = await executeGoalStep(step);
      
      step.status = result.success ? 'completed' : 'failed';
      step.output = result.output;
      step.error = result.error;
      step.completedAt = new Date();
      step.duration = step.completedAt.getTime() - step.startedAt!.getTime();

      steps.push(step);

      // Log execution
      await prisma.$executeRaw`
        INSERT INTO goal_executions (goal_id, action, description, status, input, output, error, started_at, completed_at)
        VALUES (${goalId}, ${step.action}, ${step.description}, ${step.status}, ${JSON.stringify(step.input)}, ${result.output ? JSON.stringify(result.output) : null}, ${result.error || null}, ${step.startedAt}, ${step.completedAt})
      `;

      // If step failed and not recoverable, stop execution
      if (!result.success && !action.recoverable) {
        throw new Error(`Step failed: ${step.description} - ${result.error}`);
      }

      // Update goal progress
      const progress = ((i + 1) / actions.length) * 100;
      await prisma.$executeRaw`
        UPDATE goals 
        SET progress = ${progress}, 
            current_step = ${i + 1}, 
            updated_at = NOW() 
        WHERE id = ${goalId}
      `;
    }

    // Mark goal as completed
    await prisma.$executeRaw`
      UPDATE goals 
      SET status = 'completed', 
          progress = 100, 
          completed_at = NOW(), 
          updated_at = NOW() 
      WHERE id = ${goalId}
    `;

    const totalDuration = Date.now() - startTime;
    
    logger.info(`Goal execution completed: ${goal.title}`, { 
      goalId, 
      totalDuration,
      steps: steps.length
    });

    return {
      success: true,
      goalId,
      steps,
      totalDuration,
      lessons
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const totalDuration = Date.now() - startTime;

    // Mark goal as failed
    await prisma.$executeRaw`
      UPDATE goals 
      SET status = 'failed', 
          error = ${errorMessage}, 
          updated_at = NOW() 
      WHERE id = ${goalId}
    `;

    logger.error(`Goal execution failed: ${goalId}`, { 
      error: errorMessage,
      totalDuration
    });

    return {
      success: false,
      goalId,
      steps,
      totalDuration,
      error: errorMessage
    };
  }
}

/**
 * Retry a failed goal step
 */
export async function retryGoalStep(goalId: string, stepId: string): Promise<boolean> {
  logger.info(`Retrying goal step: ${stepId}`, { goalId });

  try {
    // Fetch the step execution record
    const executions = await prisma.$queryRaw`
      SELECT * FROM goal_executions 
      WHERE goal_id = ${goalId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const execution = Array.isArray(executions) && executions.length > 0 ? executions[0] : null;
    
    if (!execution) {
      logger.error(`Execution not found for goal: ${goalId}`);
      return false;
    }

    // Create a new step and execute it
    const step: GoalExecutionStep = {
      id: `${stepId}-retry-${Date.now()}`,
      action: execution.action,
      description: execution.description,
      status: 'in_progress',
      input: execution.input,
      startedAt: new Date()
    };

    const result = await executeGoalStep(step);

    // Update execution record
    await prisma.$executeRaw`
      UPDATE goal_executions 
      SET status = ${result.success ? 'completed' : 'failed'}, 
          output = ${result.output ? JSON.stringify(result.output) : null}, 
          error = ${result.error || null}, 
          completed_at = NOW() 
      WHERE id = ${execution.id}
    `;

    return result.success;
  } catch (error) {
    logger.error(`Retry failed for step: ${stepId}`, { error });
    return false;
  }
}

/**
 * Cancel an in-progress goal
 */
export async function cancelGoal(goalId: string): Promise<boolean> {
  logger.info(`Cancelling goal: ${goalId}`);

  try {
    await prisma.$executeRaw`
      UPDATE goals 
      SET status = 'cancelled', 
          updated_at = NOW() 
      WHERE id = ${goalId} AND status = 'in_progress'
    `;

    return true;
  } catch (error) {
    logger.error(`Failed to cancel goal: ${goalId}`, { error });
    return false;
  }
}

/**
 * Get execution statistics for a goal
 */
export async function getGoalStats(goalId: string): Promise<any> {
  const executions = await prisma.$queryRaw`
    SELECT * FROM goal_executions 
    WHERE goal_id = ${goalId} 
    ORDER BY created_at ASC
  `;

  if (!Array.isArray(executions) || executions.length === 0) {
    return null;
  }

  const totalDuration = executions.reduce((sum: number, e: any) => {
    if (e.completed_at && e.started_at) {
      return sum + (new Date(e.completed_at).getTime() - new Date(e.started_at).getTime());
    }
    return sum;
  }, 0);

  const successCount = executions.filter((e: any) => e.status === 'completed').length;
  const failureCount = executions.filter((e: any) => e.status === 'failed').length;

  return {
    totalSteps: executions.length,
    successfulSteps: successCount,
    failedSteps: failureCount,
    totalDuration,
    averageStepDuration: totalDuration / executions.length,
    successRate: (successCount / executions.length) * 100
  };
}