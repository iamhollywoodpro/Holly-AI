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
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface TaskInput {
  taskDescription: string;
  category: string;
  context?: Record<string, any>;
}

export interface TaskAnalysisResult {
  id: string;
  taskDescription: string;
  category: string;
  estimatedDuration: number;
  complexity: string;
  suggestedApproach: string[];
  requiredResources: string[];
  potentialChallenges: string[];
  context: Record<string, any>;
  createdAt: Date;
}

export interface TaskBreakdown {
  mainTask: string;
  subtasks: Array<{
    description: string;
    order: number;
    estimatedDuration: number;
    dependencies: string[];
  }>;
  totalEstimate: number;
}

export interface TaskMetrics {
  totalTasks: number;
  averageDuration: number;
  byComplexity: Record<string, number>;
  byCategory: Record<string, number>;
  successRate: number;
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
    const estimatedDuration = estimateDuration(input.taskDescription, complexity);
    
    // Generate suggested approach
    const suggestedApproach = generateApproach(input.taskDescription, input.category);
    
    // Identify required resources
    const requiredResources = identifyResources(input.taskDescription);
    
    // Predict potential challenges
    const potentialChallenges = predictChallenges(complexity, input.category);

    const analysis = await prisma.taskAnalysis.create({
      data: {
        taskDescription: input.taskDescription,
        category: input.category,
        estimatedDuration,
        complexity,
        suggestedApproach,
        requiredResources,
        potentialChallenges,
        context: input.context || {},
        actualDuration: null,
        success: null
      }
    });

    return {
      success: true,
      analysis: {
        id: analysis.id,
        taskDescription: analysis.taskDescription,
        category: analysis.category,
        estimatedDuration: analysis.estimatedDuration,
        complexity: analysis.complexity,
        suggestedApproach: analysis.suggestedApproach,
        requiredResources: analysis.requiredResources,
        potentialChallenges: analysis.potentialChallenges,
        context: analysis.context as Record<string, any>,
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
  actualDuration: number;
  success: boolean;
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
    const estimatedDuration = analysis.estimatedDuration;
    const actualDuration = options.actualDuration;
    const difference = Math.abs(estimatedDuration - actualDuration);
    const accuracyScore = Math.max(0, 1 - (difference / estimatedDuration));

    await prisma.taskAnalysis.update({
      where: { id: options.analysisId },
      data: {
        actualDuration: options.actualDuration,
        success: options.success,
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
    const totalEstimate = subtasks.reduce((sum, st) => sum + st.estimatedDuration, 0);

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
    const allTasks = await prisma.taskAnalysis.findMany({
      where: {
        completedAt: { not: null }
      }
    });

    const totalTasks = allTasks.length;
    
    // Average duration
    const totalActualDuration = allTasks.reduce((sum, t) => 
      sum + (t.actualDuration || 0), 0
    );
    const averageDuration = totalTasks > 0 ? totalActualDuration / totalTasks : 0;

    // By complexity
    const byComplexity: Record<string, number> = {};
    allTasks.forEach(t => {
      byComplexity[t.complexity] = (byComplexity[t.complexity] || 0) + 1;
    });

    // By category
    const byCategory: Record<string, number> = {};
    allTasks.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });

    // Success rate
    const successfulTasks = allTasks.filter(t => t.success === true).length;
    const successRate = totalTasks > 0 ? successfulTasks / totalTasks : 0;

    return {
      totalTasks,
      averageDuration: Math.round(averageDuration),
      byComplexity,
      byCategory,
      successRate: Math.round(successRate * 100) / 100
    };
  } catch (error) {
    console.error('Error getting task metrics:', error);
    return {
      totalTasks: 0,
      averageDuration: 0,
      byComplexity: {},
      byCategory: {},
      successRate: 0
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

  if (length > 200 || hasComplexWords) return 'high';
  if (length > 100) return 'medium';
  return 'low';
}

function estimateDuration(description: string, complexity: string): number {
  // Duration in minutes
  const baseEstimates = {
    low: 30,
    medium: 120,
    high: 360
  };
  return baseEstimates[complexity as keyof typeof baseEstimates] || 60;
}

function generateApproach(description: string, category: string): string[] {
  // Simplified approach generation
  const approaches: string[] = [
    'Review requirements and constraints',
    'Break down into smaller subtasks',
    'Implement core functionality first',
    'Test and validate results',
    'Document and deploy'
  ];

  if (category === 'development') {
    approaches.push('Write unit tests');
    approaches.push('Review code quality');
  }

  if (category === 'design') {
    approaches.push('Create wireframes');
    approaches.push('Gather user feedback');
  }

  return approaches;
}

function identifyResources(description: string): string[] {
  const resources: string[] = [];
  
  if (description.toLowerCase().includes('api')) resources.push('API access');
  if (description.toLowerCase().includes('database')) resources.push('Database');
  if (description.toLowerCase().includes('design')) resources.push('Design tools');
  if (description.toLowerCase().includes('deploy')) resources.push('Hosting platform');
  
  return resources.length > 0 ? resources : ['Time', 'Focus'];
}

function predictChallenges(complexity: string, category: string): string[] {
  const challenges: string[] = [];
  
  if (complexity === 'high') {
    challenges.push('Time management');
    challenges.push('Technical complexity');
  }

  if (category === 'development') {
    challenges.push('Debugging edge cases');
    challenges.push('Performance optimization');
  }

  if (category === 'integration') {
    challenges.push('API compatibility');
    challenges.push('Authentication issues');
  }

  return challenges.length > 0 ? challenges : ['None identified'];
}

function generateSubtasks(description: string): Array<{
  description: string;
  order: number;
  estimatedDuration: number;
  dependencies: string[];
}> {
  // Simplified subtask generation
  return [
    {
      description: 'Plan and design approach',
      order: 1,
      estimatedDuration: 30,
      dependencies: []
    },
    {
      description: 'Implement core functionality',
      order: 2,
      estimatedDuration: 60,
      dependencies: ['Plan and design approach']
    },
    {
      description: 'Test and validate',
      order: 3,
      estimatedDuration: 30,
      dependencies: ['Implement core functionality']
    },
    {
      description: 'Deploy and document',
      order: 4,
      estimatedDuration: 20,
      dependencies: ['Test and validate']
    }
  ];
}
