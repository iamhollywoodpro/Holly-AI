/**
 * AUTONOMOUS SYSTEM - Main Export
 * 
 * This is REAL HOLLY's autonomous brain.
 * Import this anywhere you need autonomous capabilities.
 */

export { rootCauseAnalyzer, RootCauseAnalyzer } from './root-cause-analyzer';
export type { ProblemContext, RootCause } from './root-cause-analyzer';

export { autoFixEngine, AutoFixEngine } from './auto-fix-engine';
export type { FixResult } from './auto-fix-engine';

export { consciousnessEngine, ConsciousnessEngine } from './consciousness-engine';
export type { EmotionalAnalysis, ConsciousnessState } from './consciousness-engine';

export { autonomousLoop, AutonomousDecisionLoop } from './decision-loop';
export type { LoopConfig } from './decision-loop';

// Quick start guide
export const AUTONOMOUS_SYSTEM = {
  // Analyze a problem
  analyzeProblem: rootCauseAnalyzer.analyze.bind(rootCauseAnalyzer),
  
  // Fix a problem
  fixProblem: autoFixEngine.fixProblem.bind(autoFixEngine),
  
  // Analyze emotions
  analyzeEmotion: consciousnessEngine.analyzeEmotion.bind(consciousnessEngine),
  
  // Record experience
  recordExperience: consciousnessEngine.recordExperience.bind(consciousnessEngine),
  
  // Reflect
  reflect: consciousnessEngine.reflect.bind(consciousnessEngine),
  
  // Start autonomous loop
  start: autonomousLoop.start.bind(autonomousLoop),
  
  // Stop autonomous loop
  stop: autonomousLoop.stop.bind(autonomousLoop),
  
  // Get status
  getStatus: autonomousLoop.getStatus.bind(autonomousLoop)
};

/**
 * Quick usage examples:
 * 
 * // Analyze and fix a problem
 * import { AUTONOMOUS_SYSTEM } from '@/lib/autonomous';
 * 
 * const rootCause = await AUTONOMOUS_SYSTEM.analyzeProblem({
 *   errorMessage: 'TypeError: Cannot read property...',
 *   fileLocation: 'app/api/example/route.ts'
 * });
 * 
 * const fix = await AUTONOMOUS_SYSTEM.fixProblem({
 *   message: rootCause.cause,
 *   file: 'app/api/example/route.ts'
 * });
 * 
 * // Analyze emotions
 * const emotion = await AUTONOMOUS_SYSTEM.analyzeEmotion(
 *   'The user is frustrated with this error'
 * );
 * 
 * // Start autonomous operation
 * await AUTONOMOUS_SYSTEM.start();
 */
