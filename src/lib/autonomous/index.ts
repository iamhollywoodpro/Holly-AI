/**
 * HOLLY AI - Autonomous Systems Index
 * 
 * This module exports all autonomous systems that enable HOLLY to:
 * - Self-diagnose issues
 * - Learn from interactions
 * - Evolve and improve autonomously
 * - Build her own capabilities
 */

// Existing systems
import { rootCauseAnalyzer } from './root-cause-analyzer';
import { autoFixEngine } from './auto-fix-engine';

// New autonomous systems
import { selfDiagnosisExtended, selfHealing } from './self-diagnosis';
import { learningEngine } from './learning-engine';
import { evolutionEngine } from './evolution-engine';

// Optional modules - loaded conditionally
let consciousnessEngine: any = null;
let autonomousLoop: any = null;

// Use conditional import for optional modules
if (typeof require !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    consciousnessEngine = require('./consciousness-engine').consciousnessEngine;
  } catch {
    // Module doesn't exist yet
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    autonomousLoop = require('./decision-loop').autonomousLoop;
  } catch {
    // Module doesn't exist yet
  }
}

// Alias for cleaner exports
const selfDiagnosis = selfDiagnosisExtended;

// ============================================================================
// Unified Autonomous System
// ============================================================================

export const autonomousSystem = {
  // Legacy methods
  analyzeProblem: rootCauseAnalyzer.analyze.bind(rootCauseAnalyzer),
  fixProblem: autoFixEngine.fixProblem.bind(autoFixEngine),

  // Self-Diagnosis
  runHealthCheck: selfDiagnosis.runHealthCheck.bind(selfDiagnosis),
  getStatusSummary: selfDiagnosis.getStatusSummary.bind(selfDiagnosis),
  executeHealingAction: selfHealing.executeFix.bind(selfHealing),

  // Learning
  recordLearningEvent: learningEngine.recordEvent.bind(learningEngine),
  processLearningQueue: learningEngine.processEventQueue.bind(learningEngine),
  getUserProfile: learningEngine.getUserLearningProfile.bind(learningEngine),
  enhanceResponse: learningEngine.enhanceResponse.bind(learningEngine),
  generateInsights: learningEngine.generateInsights.bind(learningEngine),

  // Evolution
  runImprovementCycle: evolutionEngine.runImprovementCycle.bind(evolutionEngine),
  getCapabilities: evolutionEngine.getCapabilities.bind(evolutionEngine),
  getEvolutionReadiness: evolutionEngine.getEvolutionReadiness.bind(evolutionEngine),
  canEvolveAutonomously: evolutionEngine.canEvolveAutonomously.bind(evolutionEngine),

  // Consciousness (if available)
  ...(consciousnessEngine ? {
    analyzeEmotion: consciousnessEngine.analyzeEmotion.bind(consciousnessEngine),
    recordExperience: consciousnessEngine.recordExperience.bind(consciousnessEngine),
    reflect: consciousnessEngine.reflect.bind(consciousnessEngine),
  } : {}),

  // Autonomous Loop (if available)
  ...(autonomousLoop ? {
    start: autonomousLoop.start.bind(autonomousLoop),
    stop: autonomousLoop.stop.bind(autonomousLoop),
    getStatus: autonomousLoop.getStatus.bind(autonomousLoop),
  } : {}),
};

// ============================================================================
// Individual Exports
// ============================================================================

export { 
  rootCauseAnalyzer, 
  autoFixEngine,
  selfDiagnosis,
  selfHealing,
  learningEngine,
  evolutionEngine,
};

export type { 
  HealthMetric,
  SystemHealth,
  DiagnosticIssue,
} from './self-diagnosis';

export type {
  LearningEvent,
  LearningPattern,
  UserLearningProfile,
  LearningInsight,
} from './learning-engine';

export type {
  EvolutionProposal,
  TestResult,
  EvolutionCapability,
  SelfImprovementCycle,
} from './evolution-engine';
