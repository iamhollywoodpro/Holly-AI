/**
 * HOLLY TASK INTELLIGENCE
 * 
 * Task analysis and planning system that allows HOLLY to:
 * 1. Analyze task complexity and requirements
 * 2. Estimate time and resources needed
 * 3. Break down complex tasks into subtasks
 * 4. Track task success patterns
 * 
 * Uses: TaskAnalysis (Prisma model)
 * 
 * ACTUAL PRISMA FIELDS:
 * - taskDescription, complexity, estimatedTime (Int?), requiredSkills, dependencies, risks, approach (Json)
 * - status, actualTime (Int?), outcome (Json?), learnings (String[])
 * - createdAt, completedAt
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface TaskInput {
  taskDescription: string;
  context?: Record<string, any>;
}

export interface TaskAnalysisResult {
  id: string;
  taskDescription: string;
  complexity: string;
  estimatedTime?: number;
  requiredSkills: string[];
  dependencies: string[];
  risks: string[];
  approach: Record<string, any>;
  status: string;
  createdAt: Date;
}

export interface TaskBreakdown {
  mainTask: string;
  subtasks: Array<{
    description: string;
    order: number;
    estimatedTime: number;
    dependencies: string[];
  }>;
  totalEstimate: number;
}

export interface TaskMetrics {
  totalTasks: number;
  averageTime: number;
  byComplexity: Record<string, number>;
  byStatus: Record<string, number>;
  completionRate: number;
}

// ================== TASK INTELLIGENCE ==================

/**
 * Analyze a new task
 */
export async function analyzeTask(input: TaskInput): Promise<{
  success: boolean;
  analysis?: TaskAnalysisResult;
  error?: string;
}> {
  try {
    // Simple complexity estimation based on description length and keywords
    const complexity = estimateComplexity(input.taskDescription);
    const estimatedTime = estimateTime(input.taskDescription, complexity);
    
    // Identify required skills
    const requiredSkills = identifySkills(input.taskDescription);
    
    // Identify dependencies
    const dependencies = identifyDependencies(input.taskDescription);
    
    // Predict potential risks
    const risks = predictRisks(complexity, input.taskDescription);

    // Generate suggested approach
    const approach = generateApproach(input.taskDescription, complexity);

    const analysis = await prisma.taskAnalysis.create({
      data: {
        taskDescription: input.taskDescription,
        complexity,
        estimatedTime,
        requiredSkills,
        dependencies,
        risks,
        approach,
        status: 'pending',
        actualTime: null,
        outcome: null,
        learnings: []
      }
    });

    return {
      success: true,
      analysis: {
        id: analysis.id,
        taskDescription: analysis.taskDescription,
        complexity: analysis.complexity,
        estimatedTime: analysis.estimatedTime || undefined,
        requiredSkills: analysis.requiredSkills,
        dependencies: analysis.dependencies,
        risks: analysis.risks,
        approach: analysis.approach as Record<string, any>,
        status: analysis.status,
        createdAt: analysis.createdAt
      }
    };
  } catch (error) {
    console.error('Error analyzing task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update task analysis with actual results
 */
export async function updateTaskResults(options: {
  analysisId: string;
  actualTime: number;
  outcome: Record<string, any>;
  learnings?: string[];
  status: 'completed' | 'failed';
}): Promise<{
  success: boolean;
  accuracyScore?: number;
  error?: string;
}> {
  try {
    const analysis = await prisma.taskAnalysis.findUnique({
      where: { id: options.analysisId }
    });

    if (!analysis) {
      return {
        success: false,
        error: 'Task analysis not found'
      };
    }

    // Calculate accuracy score (how close was the estimate)
    let accuracyScore = 0;
    if (analysis.estimatedTime && options.actualTime > 0) {
      const estimatedTime = analysis.estimatedTime;
      const actualTime = options.actualTime;
      const difference = Math.abs(estimatedTime - actualTime);
      accuracyScore = Math.max(0, 1 - (difference / estimatedTime));
    }

    await prisma.taskAnalysis.update({
      where: { id: options.analysisId },
      data: {
        actualTime: options.actualTime,
        outcome: options.outcome,
        learnings: options.learnings || [],
        status: options.status,
        completedAt: new Date()
      }
    });

    return {
      success: true,
      accuracyScore: Math.round(accuracyScore * 100) / 100
    };
  } catch (error) {
    console.error('Error updating task results:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Break down complex task into subtasks
 */
export async function breakdownTask(taskDescription: string): Promise<TaskBreakdown> {
  try {
    // Simplified task breakdown logic
    const subtasks = generateSubtasks(taskDescription);
    const totalEstimate = subtasks.reduce((sum, st) => sum + st.estimatedTime, 0);

    return {
      mainTask: taskDescription,
      subtasks,
      totalEstimate
    };
  } catch (error) {
    console.error('Error breaking down task:', error);
    return {
      mainTask: taskDescription,
      subtasks: [],
      totalEstimate: 0
    };
  }
}

/**
 * Get task analytics and metrics
 */
export async function getTaskMetrics(): Promise<TaskMetrics> {
  try {
    const allTasks = await prisma.taskAnalysis.findMany();

    const totalTasks = allTasks.length;
    
    // Average time (only for completed tasks with actualTime)
    const completedTasks = allTasks.filter(t => t.actualTime !== null);
    const totalActualTime = completedTasks.reduce((sum, t) => 
      sum + (t.actualTime || 0), 0
    );
    const averageTime = completedTasks.length > 0 ? totalActualTime / completedTasks.length : 0;

    // By complexity
    const byComplexity: Record<string, number> = {};
    allTasks.forEach(t => {
      byComplexity[t.complexity] = (byComplexity[t.complexity] || 0) + 1;
    });

    // By status
    const byStatus: Record<string, number> = {};
    allTasks.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });

    // Completion rate
    const completedCount = allTasks.filter(t => t.status === 'completed').length;
    const completionRate = totalTasks > 0 ? completedCount / totalTasks : 0;

    return {
      totalTasks,
      averageTime: Math.round(averageTime),
      byComplexity,
      byStatus,
      completionRate: Math.round(completionRate * 100) / 100
    };
  } catch (error) {
    console.error('Error getting task metrics:', error);
    return {
      totalTasks: 0,
      averageTime: 0,
      byComplexity: {},
      byStatus: {},
      completionRate: 0
    };
  }
}

// ================== HELPER FUNCTIONS ==================

function estimateComplexity(description: string): string {
  const length = description.length;
  const complexWords = ['integrate', 'implement', 'design', 'optimize', 'refactor', 'architecture'];
  const hasComplexWords = complexWords.some(word => 
    description.toLowerCase().includes(word)
  );

  if (length > 200 || hasComplexWords) return 'complex';
  if (length > 100) return 'moderate';
  return 'simple';
}

function estimateTime(description: string, complexity: string): number {
  // Time in minutes
  const baseEstimates: Record<string, number> = {
    simple: 30,
    moderate: 120,
    complex: 360
  };
  return baseEstimates[complexity] || 60;
}

function identifySkills(description: string): string[] {
  const skills: string[] = [];
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('code') || lowerDesc.includes('develop')) skills.push('Programming');
  if (lowerDesc.includes('design') || lowerDesc.includes('ui')) skills.push('Design');
  if (lowerDesc.includes('database') || lowerDesc.includes('sql')) skills.push('Database');
  if (lowerDesc.includes('api') || lowerDesc.includes('integration')) skills.push('API Integration');
  if (lowerDesc.includes('deploy') || lowerDesc.includes('devops')) skills.push('DevOps');
  
  return skills.length > 0 ? skills : ['General'];
}

function identifyDependencies(description: string): string[] {
  const dependencies: string[] = [];
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('after') || lowerDesc.includes('once')) {
    dependencies.push('Previous task completion');
  }
  if (lowerDesc.includes('api')) dependencies.push('API access');
  if (lowerDesc.includes('database')) dependencies.push('Database setup');
  if (lowerDesc.includes('design')) dependencies.push('Design approval');
  
  return dependencies;
}

function predictRisks(complexity: string, description: string): string[] {
  const risks: string[] = [];
  
  if (complexity === 'complex') {
    risks.push('Time overrun');
    risks.push('Technical complexity');
  }

  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('api') || lowerDesc.includes('integration')) {
    risks.push('External dependency');
    risks.push('Authentication issues');
  }

  if (lowerDesc.includes('database')) {
    risks.push('Data migration');
    risks.push('Performance issues');
  }

  return risks.length > 0 ? risks : ['None identified'];
}

function generateApproach(description: string, complexity: string): Record<string, any> {
  const steps: string[] = [
    'Review requirements and constraints',
    'Break down into smaller subtasks',
    'Implement core functionality',
    'Test and validate',
    'Document and deploy'
  ];

  return {
    steps,
    estimatedPhases: complexity === 'complex' ? 5 : complexity === 'moderate' ? 3 : 2,
    parallelizable: complexity === 'simple',
    reviewPoints: ['After planning', 'After implementation', 'Before deployment']
  };
}

function generateSubtasks(description: string): Array<{
  description: string;
  order: number;
  estimatedTime: number;
  dependencies: string[];
}> {
  // Simplified subtask generation
  return [
    {
      description: 'Plan and design approach',
      order: 1,
      estimatedTime: 30,
      dependencies: []
    },
    {
      description: 'Implement core functionality',
      order: 2,
      estimatedTime: 60,
      dependencies: ['Plan and design approach']
    },
    {
      description: 'Test and validate',
      order: 3,
      estimatedTime: 30,
      dependencies: ['Implement core functionality']
    },
    {
      description: 'Deploy and document',
      order: 4,
      estimatedTime: 20,
      dependencies: ['Test and validate']
    }
  ];
}
