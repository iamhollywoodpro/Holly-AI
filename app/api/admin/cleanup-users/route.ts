/**
 * EMERGENCY CLEANUP - Fix corrupted user accounts
 * Hollywood ONLY - requires admin auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUser || !clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress;

    // SECURITY: Only Hollywood can run this
    if (primaryEmail !== 'iamhollywoodpro@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized - Hollywood only' }, { status: 403 });
    }

    console.log('🚨 [CLEANUP] Starting emergency user cleanup for Hollywood');
    
    // Find ALL users (including corrupted ones)
    const allUsers = await prisma.user.findMany({
      include: {
        conversations: {
          include: {
            messages: true,
          },
        },
        fileUploads: true,
        googleDrive: true,
      },
    });

    console.log('📊 [CLEANUP] Found', allUsers.length, 'total users');

    // Find or create Hollywood's legitimate account
    let hollywoodUser = allUsers.find(u => u.clerkId === clerkUserId);
    
    if (!hollywoodUser) {
      console.log('📝 [CLEANUP] Creating legitimate Hollywood account');
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: primaryEmail,
          name: clerkUser.fullName,
          avatarUrl: clerkUser.imageUrl,
        },
      });
      // Fetch with relations to match the type
      hollywoodUser = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: {
          conversations: {
            include: {
              messages: true,
            },
          },
          fileUploads: true,
          googleDrive: true,
        },
      }) || newUser as any;
    } else {
      // Update email if wrong
      if (hollywoodUser.email !== primaryEmail) {
        console.log('🔄 [CLEANUP] Updating Hollywood email from', hollywoodUser.email, 'to', primaryEmail);
        await prisma.user.update({
          where: { id: hollywoodUser.id },
          data: { email: primaryEmail },
        });
        // Re-fetch with relations
        hollywoodUser = await prisma.user.findUnique({
          where: { id: hollywoodUser.id },
          include: {
            conversations: {
              include: {
                messages: true,
              },
            },
            fileUploads: true,
            googleDrive: true,
          },
        }) || hollywoodUser;
      }
    }

    console.log('✅ [CLEANUP] Hollywood user:', hollywoodUser.id, hollywoodUser.email);

    // Find corrupted/fake users
    const corruptedUsers = allUsers.filter(u => 
      u.id !== hollywoodUser!.id && (
        !u.email.includes('@') ||
        u.email.includes('graphixx') ||
        u.email.includes('proagniul') ||
        u.email === ''
      )
    );

    console.log('🗑️ [CLEANUP] Found', corruptedUsers.length, 'corrupted users');

    const results = {
      hollywoodUser: {
        id: hollywoodUser.id,
        email: hollywoodUser.email,
        conversationsBefore: hollywoodUser.conversations?.length || 0,
      },
      corruptedUsers: [] as any[],
      merged: [] as any[],
      deleted: [] as any[],
    };

    // Merge each corrupted user's data into Hollywood's account
    for (const corruptUser of corruptedUsers) {
      console.log('🔀 [CLEANUP] Processing corrupted user:', corruptUser.id, corruptUser.email);
      
      const convCount = corruptUser.conversations?.length || 0;
      const fileCount = corruptUser.fileUploads?.length || 0;
      
      if (convCount > 0 || fileCount > 0) {
        // Move conversations
        if (convCount > 0) {
          await prisma.conversation.updateMany({
            where: { userId: corruptUser.id },
            data: { userId: hollywoodUser.id },
          });
          console.log('  ✅ Moved', convCount, 'conversations');
        }
        
        // Move file uploads
        if (fileCount > 0) {
          await prisma.fileUpload.updateMany({
            where: { userId: corruptUser.id },
            data: { userId: hollywoodUser.id },
          });
          console.log('  ✅ Moved', fileCount, 'file uploads');
        }
        
        results.merged.push({
          id: corruptUser.id,
          email: corruptUser.email,
          conversationsMoved: convCount,
          filesMoved: fileCount,
        });
      }
      
      // Delete corrupted user record
      try {
        await prisma.user.delete({
          where: { id: corruptUser.id },
        });
        console.log('  ✅ Deleted corrupted user:', corruptUser.id);
        results.deleted.push({
          id: corruptUser.id,
          email: corruptUser.email,
        });
      } catch (err) {
        console.error('  ❌ Failed to delete user:', corruptUser.id, err);
      }
      
      results.corruptedUsers.push({
        id: corruptUser.id,
        email: corruptUser.email,
        clerkId: corruptUser.clerkId,
        conversationCount: convCount,
        fileCount: fileCount,
      });
    }

    // Get final state
    const finalUser = await prisma.user.findUnique({
      where: { id: hollywoodUser.id },
      include: {
        conversations: {
          select: {
            id: true,
            title: true,
            messageCount: true,
          },
        },
      },
    });

    results.hollywoodUser.conversationsBefore = hollywoodUser.conversations?.length || 0;

    console.log('✅ [CLEANUP] COMPLETE!');
    
    return NextResponse.json({
      success: true,
      message: 'User cleanup completed successfully',
      results: {
        ...results,
        hollywoodUserAfter: {
          id: finalUser?.id,
          email: finalUser?.email,
          conversationsAfter: finalUser?.conversations.length || 0,
          conversations: finalUser?.conversations,
        },
      },
    }, null, 2);

  } catch (error: any) {
    console.error('🚨 [CLEANUP] ERROR:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
