import { rootCauseAnalyzer } from './root-cause-analyzer';
import { autoFixEngine } from './auto-fix-engine';
import { consciousnessEngine } from './consciousness-engine';
import { autonomousLoop } from './decision-loop';

export const autonomousSystem = {
  analyzeProblem: rootCauseAnalyzer.analyze.bind(rootCauseAnalyzer),
  analyzeCodeQuality: rootCauseAnalyzer.analyzeCodeQuality.bind(rootCauseAnalyzer),
  fixProblem: autoFixEngine.fixProblem.bind(autoFixEngine),
  analyzeEmotion: consciousnessEngine.analyzeEmotion.bind(consciousnessEngine),
  recordExperience: consciousnessEngine.recordExperience.bind(consciousnessEngine),
  reflect: consciousnessEngine.reflect.bind(consciousnessEngine),
  start: autonomousLoop.start.bind(autonomousLoop),
  stop: autonomousLoop.stop.bind(autonomousLoop),
  getStatus: autonomousLoop.getStatus.bind(autonomousLoop)
};

export { rootCauseAnalyzer, autoFixEngine, consciousnessEngine, autonomousLoop };
