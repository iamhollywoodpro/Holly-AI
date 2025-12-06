/**
 * Oracle Cloud Integration for HOLLY 3.1
 * Main export file
 */

export { oracleConfig, aiSpeechConfig, validateOracleConfig } from './config';
export { signRequest, verifyCredentials } from './auth';
export { 
  generateSpeech, 
  generateSpeechBlob, 
  generateSpeechDataURL,
  testConnection,
  listVoices,
  HOLLY,
  type SpeechRequest,
  type SpeechResponse
} from './speech';
