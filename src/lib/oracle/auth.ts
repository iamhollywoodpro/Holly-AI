/**
 * Oracle Cloud Authentication
 * Handles request signing for Oracle Cloud API calls
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import { oracleConfig } from './config';

export interface RequestSignature {
  headers: Record<string, string>;
}

/**
 * Generate Oracle Cloud API request signature
 * Based on Oracle's request signing specification
 */
export async function signRequest(
  method: string,
  path: string,
  body?: string
): Promise<RequestSignature> {
  try {
    // Read private key
    const privateKey = fs.readFileSync(oracleConfig.privateKeyPath, 'utf8');
    
    // Generate request date
    const date = new Date().toUTCString();
    
    // Create signing string
    const signingString = createSigningString(method, path, date, body);
    
    // Sign the request
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(signingString)
      .sign(privateKey, 'base64');
    
    // Create authorization header
    const authHeader = createAuthHeader(signature, date);
    
    return {
      headers: {
        'date': date,
        'authorization': authHeader,
        'content-type': 'application/json',
        ...(body && { 'content-length': Buffer.byteLength(body).toString() })
      }
    };
  } catch (error) {
    console.error('Error signing Oracle request:', error);
    throw new Error('Failed to sign Oracle Cloud request. Ensure private key is properly configured.');
  }
}

/**
 * Create the signing string for Oracle Cloud API
 */
function createSigningString(
  method: string,
  path: string,
  date: string,
  body?: string
): string {
  const headers = ['(request-target)', 'date', 'host'];
  
  if (body) {
    headers.push('content-length', 'content-type');
  }
  
  const headersString = headers.join(' ');
  
  let signingString = `(request-target): ${method.toLowerCase()} ${path}\n`;
  signingString += `date: ${date}\n`;
  signingString += `host: speech.aiservice.${oracleConfig.region}.oci.oraclecloud.com`;
  
  if (body) {
    signingString += `\ncontent-length: ${Buffer.byteLength(body)}`;
    signingString += `\ncontent-type: application/json`;
  }
  
  return signingString;
}

/**
 * Create the authorization header
 */
function createAuthHeader(signature: string, date: string): string {
  const keyId = `${oracleConfig.tenancyId}/${oracleConfig.userId}/${oracleConfig.fingerprint}`;
  
  const headers = ['(request-target)', 'date', 'host'];
  const headersString = headers.join(' ');
  
  return `Signature version="1",` +
         `keyId="${keyId}",` +
         `algorithm="rsa-sha256",` +
         `headers="${headersString}",` +
         `signature="${signature}"`;
}

/**
 * Verify Oracle Cloud credentials are properly configured
 */
export function verifyCredentials(): { valid: boolean; message: string } {
  try {
    // Check if private key file exists
    if (!fs.existsSync(oracleConfig.privateKeyPath)) {
      return {
        valid: false,
        message: `Private key file not found at: ${oracleConfig.privateKeyPath}. Please add your Oracle Cloud private key file.`
      };
    }
    
    // Try to read the private key
    const privateKey = fs.readFileSync(oracleConfig.privateKeyPath, 'utf8');
    
    if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      return {
        valid: false,
        message: 'Invalid private key format. File must contain a valid PEM-formatted private key.'
      };
    }
    
    return {
      valid: true,
      message: 'Oracle Cloud credentials verified successfully'
    };
  } catch (error) {
    return {
      valid: false,
      message: `Error verifying credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
