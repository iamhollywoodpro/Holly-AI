/**
 * Oracle Cloud AI Speech Configuration
 * MAYA1 Voice Integration for HOLLY 3.1
 */

export interface OracleConfig {
  tenancyId: string;
  userId: string;
  fingerprint: string;
  region: string;
  privateKeyPath: string;
  compartmentId?: string;
}

/**
 * Oracle Cloud Configuration
 * Replace the privateKeyPath with the actual path to your .pem file
 */
export const oracleConfig: OracleConfig = {
  // Your Oracle Cloud Tenancy OCID
  tenancyId: process.env.ORACLE_TENANCY_OCID || 'ocid1.tenancy.oc1..aaaaaaaadkua7gx2nybz4vvaklgyaocqsrhvh33rsw3znqymj27e3nkizfmq',
  
  // Your Oracle Cloud User OCID
  userId: process.env.ORACLE_USER_OCID || 'ocid1.user.oc1..aaaaaaaabwt7bpk7dpgkhxiln6ycv26go2nmk7jzq5fdizgizbj6n64pabma',
  
  // Your API Key Fingerprint
  fingerprint: process.env.ORACLE_FINGERPRINT || 'cf:fe:02:e5:6b:f0:fe:69:0d:78:93:cc:2b:b0:37:b8',
  
  // Oracle Cloud Region
  region: process.env.ORACLE_REGION || 'ca-toronto-1',
  
  // Path to your private key file (.pem)
  // TODO: Update this path after adding your .pem file to the project
  privateKeyPath: process.env.ORACLE_PRIVATE_KEY_PATH || './oracle-private-key.pem',
  
  // Optional: Compartment OCID (defaults to tenancy root)
  compartmentId: process.env.ORACLE_COMPARTMENT_OCID
};

/**
 * Oracle AI Speech Service Configuration
 */
export const aiSpeechConfig = {
  // MAYA1 Voice Configuration
  voice: {
    id: 'MAYA1',
    languageCode: 'en-US',
    gender: 'FEMALE',
    sampleRateHertz: 24000,
    audioEncoding: 'MP3'
  },
  
  // Speech synthesis settings
  synthesis: {
    speakingRate: 1.0,    // Normal speed
    pitch: 0.0,           // Natural pitch
    volumeGainDb: 0.0     // Normal volume
  },
  
  // API endpoint
  endpoint: `https://speech.aiservice.${oracleConfig.region}.oci.oraclecloud.com`
};

/**
 * Validate Oracle configuration
 */
export function validateOracleConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!oracleConfig.tenancyId || oracleConfig.tenancyId.includes('TODO')) {
    errors.push('Missing Oracle Tenancy OCID');
  }
  
  if (!oracleConfig.userId || oracleConfig.userId.includes('TODO')) {
    errors.push('Missing Oracle User OCID');
  }
  
  if (!oracleConfig.fingerprint || oracleConfig.fingerprint.includes('TODO')) {
    errors.push('Missing Oracle API Key Fingerprint');
  }
  
  if (!oracleConfig.region) {
    errors.push('Missing Oracle Region');
  }
  
  if (!oracleConfig.privateKeyPath || oracleConfig.privateKeyPath.includes('TODO')) {
    errors.push('Missing Oracle Private Key Path - Please add your .pem file');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
