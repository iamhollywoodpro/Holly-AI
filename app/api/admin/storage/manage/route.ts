// PHASE 2: REAL File Storage Management
// Checks actual disk usage and manages file storage
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { action = 'status', userId } = await req.json();

    const result: any = {
      success: true,
      action,
      timestamp: new Date().toISOString()
    };

    // Get disk usage (works on Linux/Unix systems)
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        result.storage = {
          total: parts[1] || 'Unknown',
          used: parts[2] || 'Unknown',
          available: parts[3] || 'Unknown',
          usePercentage: parts[4] || 'Unknown',
          filesystem: parts[0]
        };
      }
    } catch (error) {
      result.storage = {
        total: 'Unknown',
        used: 'Unknown',
        available: 'Unknown',
        note: 'Disk usage monitoring requires system access'
      };
    }

    // Get file upload statistics from database
    const fileStats = await prisma.fileUpload.aggregate({
      _count: { id: true },
      _sum: { size: true }
    });

    const totalFiles = fileStats._count.id || 0;
    const totalSize = fileStats._sum.size || 0;
    const totalSizeMB = Math.round(totalSize / (1024 * 1024));

    result.fileStats = {
      totalFiles,
      totalSize: `${totalSizeMB} MB`,
      averageFileSize: totalFiles > 0 ? `${Math.round(totalSize / totalFiles / 1024)} KB` : '0 KB'
    };

    // Perform actions
    switch (action) {
      case 'cleanup':
        // Find old temporary files
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 30);
        
        const oldFiles = await prisma.fileUpload.findMany({
          where: {
            createdAt: { lt: oldDate },
            type: 'temporary'
          }
        });

        result.cleanup = {
          filesIdentified: oldFiles.length,
          potentialSavings: `${Math.round(oldFiles.reduce((sum, f) => sum + (f.size || 0), 0) / (1024 * 1024))} MB`,
          status: 'identified',
          message: 'Files identified for cleanup (manual deletion required)'
        };
        break;

      case 'analyze':
        // Analyze storage by type
        const filesByType = await prisma.fileUpload.groupBy({
          by: ['type'],
          _count: { id: true },
          _sum: { size: true }
        });

        result.analysis = filesByType.map((group: any) => ({
          type: group.type,
          count: group._count.id,
          totalSize: `${Math.round((group._sum.size || 0) / (1024 * 1024))} MB`
        }));
        break;

      case 'status':
      default:
        // Status already gathered above
        break;
    }

    // Add recommendations
    result.recommendations = [];
    
    if (totalSizeMB > 1000) {
      result.recommendations.push('Consider implementing file cleanup policy');
    }
    if (totalSizeMB > 5000) {
      result.recommendations.push('High storage usage detected - review and clean old files');
    }
    if (result.storage?.usePercentage && parseInt(result.storage.usePercentage) > 80) {
      result.recommendations.push('Disk usage above 80% - immediate cleanup recommended');
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Storage management error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
