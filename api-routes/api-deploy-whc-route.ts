/**
 * HOLLY WHC Deployment API Route
 * 
 * Endpoint for deploying to WHC.ca hosting.
 * 
 * @route POST /api/deploy/whc
 */

import { NextRequest, NextResponse } from 'next/server';
import { WHCDeploymentClient } from '@/lib/integrations/whc-deploy';

// ============================================================================
// Types
// ============================================================================

interface DeployRequest {
  action: 'upload' | 'deploy' | 'backup' | 'rollback' | 'health-check';
  files?: Array<{
    path: string;
    content: string;
  }>;
  backupId?: string;
  userId?: string;
}

// ============================================================================
// Initialize Services
// ============================================================================

const whcClient = new WHCDeploymentClient({
  ftp: {
    host: process.env.WHC_FTP_HOST || '',
    user: process.env.WHC_FTP_USER || '',
    password: process.env.WHC_FTP_PASSWORD || '',
    port: parseInt(process.env.WHC_FTP_PORT || '21'),
    secure: process.env.WHC_FTP_SECURE === 'true'
  },
  mysql: {
    host: process.env.WHC_MYSQL_HOST || '',
    user: process.env.WHC_MYSQL_USER || '',
    password: process.env.WHC_MYSQL_PASSWORD || '',
    database: process.env.WHC_MYSQL_DATABASE || '',
    port: parseInt(process.env.WHC_MYSQL_PORT || '3306')
  }
});

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: DeployRequest = await request.json();
    const { action, files, backupId, userId } = body;

    // Validate action
    const validActions = ['upload', 'deploy', 'backup', 'rollback', 'health-check'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    let result: any;

    switch (action) {
      case 'upload':
        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: 'Files are required for upload action' },
            { status: 400 }
          );
        }
        result = await handleUpload(files);
        break;

      case 'deploy':
        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: 'Files are required for deploy action' },
            { status: 400 }
          );
        }
        result = await handleDeploy(files);
        break;

      case 'backup':
        result = await handleBackup();
        break;

      case 'rollback':
        if (!backupId) {
          return NextResponse.json(
            { error: 'Backup ID is required for rollback action' },
            { status: 400 }
          );
        }
        result = await handleRollback(backupId);
        break;

      case 'health-check':
        result = await handleHealthCheck();
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        action,
        result,
        metadata: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('WHC deployment API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Deployment failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get Deployment Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      const health = await whcClient.healthCheck('/');
      
      return NextResponse.json(
        {
          success: true,
          status: health.healthy ? 'online' : 'offline',
          health,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );
    }

    if (action === 'backups') {
      // List available backups (would need implementation in WHC client)
      return NextResponse.json(
        {
          success: true,
          backups: [],
          message: 'Backup listing not yet implemented'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('WHC status API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get deployment status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function handleUpload(files: Array<{ path: string; content: string }>) {
  const results = [];

  for (const file of files) {
    const result = await whcClient.uploadFile(file.path, file.content);
    results.push({
      path: file.path,
      success: result.success,
      size: file.content.length
    });
  }

  return {
    filesUploaded: results.length,
    files: results
  };
}

async function handleDeploy(files: Array<{ path: string; content: string }>) {
  // Create backup before deploy
  const backup = await whcClient.createBackup(['public_html']);

  // Deploy files
  const deployment = await whcClient.deployProject({
    files: files.map(f => ({
      localPath: f.path,
      remotePath: `public_html/${f.path}`,
      content: f.content
    })),
    createBackup: false // Already created above
  });

  // Health check after deployment
  const health = await whcClient.healthCheck('/');

  return {
    deployment,
    backup: {
      id: backup.backupId,
      timestamp: backup.timestamp
    },
    health,
    filesDeployed: files.length
  };
}

async function handleBackup() {
  const backup = await whcClient.createBackup(['public_html', 'database']);

  return {
    backupId: backup.backupId,
    timestamp: backup.timestamp,
    paths: ['public_html', 'database'],
    message: 'Backup created successfully'
  };
}

async function handleRollback(backupId: string) {
  const result = await whcClient.rollbackDeployment(backupId);

  return {
    backupId,
    restored: result.success,
    message: result.message
  };
}

async function handleHealthCheck() {
  const health = await whcClient.healthCheck('/');

  return {
    healthy: health.healthy,
    statusCode: health.statusCode,
    responseTime: health.responseTime,
    checks: health.checks
  };
}
