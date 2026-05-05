/**
 * POST /api/social/post
 *
 * HOLLY Social Distribution Engine
 * Automatically posts content to connected social platforms.
 *
 * Supported platforms: instagram, tiktok, soundcloud (existing), youtube (existing)
 *
 * Request body:
 * {
 *   platforms: string[]           — e.g. ['instagram', 'tiktok']
 *   content: {
 *     caption: string             — post text/caption
 *     mediaUrl?: string           — image or video URL
 *     mediaType?: 'image' | 'video' | 'reel'
 *     hashtags?: string[]         — auto-appended to caption
 *     title?: string              — for video platforms
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface PostContent {
  caption: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'reel';
  hashtags?: string[];
  title?: string;
}

interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/** Post to Instagram via Graph API (requires Business/Creator account + Facebook page) */
async function postToInstagram(token: string, content: PostContent): Promise<PostResult> {
  try {
    const caption = [
      content.caption,
      ...(content.hashtags ?? []).map(h => h.startsWith('#') ? h : `#${h}`),
    ].join(' ');

    if (!content.mediaUrl) {
      return { platform: 'instagram', success: false, error: 'mediaUrl is required for Instagram posts' };
    }

    // Step 1: Create media container
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id&access_token=${token}`,
    );
    const profile = await profileRes.json();
    const igUserId = profile.id;

    const containerRes = await fetch(
      `https://graph.instagram.com/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: content.mediaUrl,
          caption,
          access_token: token,
        }),
      },
    );
    const container = await containerRes.json();
    if (!container.id) {
      return { platform: 'instagram', success: false, error: container.error?.message ?? 'Failed to create media container' };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.instagram.com/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: token,
        }),
      },
    );
    const published = await publishRes.json();

    if (!published.id) {
      return { platform: 'instagram', success: false, error: published.error?.message ?? 'Failed to publish media' };
    }

    return {
      platform: 'instagram',
      success: true,
      postId: published.id,
      postUrl: `https://www.instagram.com/p/${published.id}/`,
    };
  } catch (err: any) {
    return { platform: 'instagram', success: false, error: err.message };
  }
}

/** Post to TikTok via Content Posting API */
async function postToTikTok(token: string, content: PostContent): Promise<PostResult> {
  try {
    if (!content.mediaUrl) {
      return { platform: 'tiktok', success: false, error: 'mediaUrl is required for TikTok posts' };
    }

    // TikTok Content Posting API v2
    const caption = [
      content.title ?? content.caption,
      ...(content.hashtags ?? []).map(h => h.startsWith('#') ? h : `#${h}`),
    ].join(' ');

    // Initialize upload
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: content.mediaUrl,
        },
      }),
    });

    const initData = await initRes.json();
    if (initData.error?.code !== 'ok') {
      return {
        platform: 'tiktok',
        success: false,
        error: initData.error?.message ?? 'Failed to initialize TikTok upload',
      };
    }

    return {
      platform: 'tiktok',
      success: true,
      postId: initData.data?.publish_id,
    };
  } catch (err: any) {
    return { platform: 'tiktok', success: false, error: err.message };
  }
}

/** Post to Slack channel */
async function postToSlack(token: string, channelId: string, content: PostContent): Promise<PostResult> {
  try {
    const text = [
      content.caption,
      ...(content.hashtags ?? []).map(h => h.startsWith('#') ? h : `#${h}`),
    ].join(' ');

    const blocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text },
      },
      ...(content.mediaUrl
        ? [{ type: 'image', image_url: content.mediaUrl, alt_text: content.caption }]
        : []),
    ];

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text,
        blocks,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return { platform: 'slack', success: false, error: data.error ?? 'Slack post failed' };
    }

    return {
      platform: 'slack',
      success: true,
      postId: data.ts,
      postUrl: `https://slack.com/archives/${channelId}/p${data.ts?.replace('.', '')}`,
    };
  } catch (err: any) {
    return { platform: 'slack', success: false, error: err.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { platforms, content } = body as { platforms: string[]; content: PostContent };

    if (!platforms?.length || !content?.caption) {
      return NextResponse.json(
        { error: 'platforms and content.caption are required' },
        { status: 400 },
      );
    }

    // Fetch all user integrations
    const integrations = await prisma.integration.findMany({
      where: {
        createdBy: userId,
        service: { in: platforms },
        isActive: true,
        status: 'active',
      },
    });

    const results: PostResult[] = [];

    for (const platform of platforms) {
      const integration = integrations.find(i => i.service === platform);

      if (!integration) {
        results.push({ platform, success: false, error: 'Not connected' });
        continue;
      }

      const token = integration.accessToken;
      if (!token) {
        results.push({ platform, success: false, error: 'No access token' });
        continue;
      }

      switch (platform) {
        case 'instagram':
          results.push(await postToInstagram(token, content));
          break;
        case 'tiktok':
          results.push(await postToTikTok(token, content));
          break;
        case 'slack': {
          const channelId = (integration.config as any)?.defaultChannel ?? 'general';
          results.push(await postToSlack(token, channelId, content));
          break;
        }
        default:
          results.push({ platform, success: false, error: `Platform '${platform}' not supported for direct posting` });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      posted: successCount,
      failed: failCount,
      results,
    });
  } catch (err: any) {
    console.error('[Social Post] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
