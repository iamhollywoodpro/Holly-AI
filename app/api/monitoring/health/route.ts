// PHASE 1: REAL System Health Monitoring
// Checks actual system status, DB connections, API availability
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const startTime = Date.now();

    // Test database connection
    let dbStatus = 'down';
    let dbLatency = 0;
    let dbError = null;
    
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'up';
    } catch (error: any) {
      dbError = error.message;
    }

    // Check API keys
    const apiKeysStatus = {
      gemini: !!process.env.GOOGLE_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      oracle: !!process.env.ORACLE_USER_OCID,
      github: !!process.env.GITHUB_TOKEN,
      clerk: !!process.env.CLERK_SECRET_KEY,
      database: !!process.env.DATABASE_URL
    };

    // Check database tables
    let tableCount = 0;
    let tableError = null;
    try {
      const tables = await prisma.$queryRaw<any[]>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `;
      tableCount = tables.length;
    } catch (error: any) {
      tableError = error.message;
    }

    // Get database stats
    let dbStats: any = {};
    try {
      const [userCount, conversationCount, messageCount] = await Promise.all([
        prisma.user.count(),
        prisma.conversation.count(),
        prisma.message.count()
      ]);
      dbStats = {
        users: userCount,
        conversations: conversationCount,
        messages: messageCount
      };
    } catch (error: any) {
      dbStats.error = error.message;
    }

    // Calculate uptime (process uptime)
    const uptimeSeconds = process.uptime();
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`;

    // Overall health determination
    const criticalIssues = [];
    if (dbStatus === 'down') criticalIssues.push('Database connection failed');
    if (!apiKeysStatus.database) criticalIssues.push('DATABASE_URL not configured');
    if (!apiKeysStatus.gemini && !apiKeysStatus.groq) criticalIssues.push('No AI API keys configured');

    const overallStatus = criticalIssues.length === 0 ? 'healthy' : 
                         criticalIssues.length <= 2 ? 'degraded' : 'unhealthy';

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        status: overallStatus,
        uptime: uptimeFormatted,
        uptimeSeconds: Math.round(uptimeSeconds),
        responseTime: `${Date.now() - startTime}ms`,
        
        services: {
          api: 'up',
          database: dbStatus,
          cache: 'not_configured' // Add Redis check in future
        },
        
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`,
          tables: tableCount,
          stats: dbStats,
          error: dbError
        },
        
        apiKeys: apiKeysStatus,
        
        issues: {
          critical: criticalIssues,
          warnings: [
            !apiKeysStatus.oracle && 'Oracle voice not configured',
            !apiKeysStatus.github && 'GitHub integration not configured'
          ].filter(Boolean)
        },
        
        lastCheck: new Date().toISOString()
      }
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('System health check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        health: {
          status: 'unhealthy',
          error: error.message
        }
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
