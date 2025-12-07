/**
 * HOLLY's COMPLETE Tool Definitions
 * Combines Creative Tools + Developer Tools
 * NOW HOLLY CAN ACTUALLY FIX HERSELF!
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';

// ========================================
// CREATIVE TOOLS (Original)
// ========================================
const CREATIVE_TOOLS: Tool[] = [
  {
    name: 'generate_music',
    description: 'Generate music using Suno AI',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Music description' },
        lyrics: { type: 'string', description: 'Song lyrics (optional)' },
        title: { type: 'string', description: 'Song title' },
        style: { type: 'string', description: 'Musical style/genre' },
        instrumental: { type: 'boolean', description: 'Instrumental only' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'generate_video',
    description: 'Generate AI video clips',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Video description' },
        duration: { type: 'number', enum: [3, 5, 7, 10] },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:3'] }
      },
      required: ['prompt']
    }
  },
  {
    name: 'generate_image',
    description: 'Generate AI images',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image description' },
        aspectRatio: { type: 'string', enum: ['1:1', '16:9', '9:16'] }
      },
      required: ['prompt']
    }
  }
];

// ========================================
// DEVELOPER TOOLS (NEW - THE REAL POWER!)
// ========================================
const DEVELOPER_TOOLS: Tool[] = [
  {
    name: 'self_diagnose',
    description: 'Run system diagnostics to identify and fix issues like phantom messages, streaming problems, configuration errors',
    input_schema: {
      type: 'object',
      properties: {
        issueType: {
          type: 'string',
          enum: ['streaming', 'phantom_message', 'performance', 'configuration', 'full_system'],
          description: 'Type of issue to diagnose'
        }
      },
      required: ['issueType']
    }
  },
  {
    name: 'execute_fix',
    description: 'Execute code fixes, update configuration, or modify system files',
    input_schema: {
      type: 'object',
      properties: {
        fixType: {
          type: 'string',
          enum: ['config_update', 'code_patch', 'response_filter', 'streaming_fix'],
          description: 'Type of fix to execute'
        },
        description: {
          type: 'string',
          description: 'What the fix does'
        }
      },
      required: ['fixType', 'description']
    }
  },
  {
    name: 'check_system_health',
    description: 'Check overall system health and identify issues',
    input_schema: {
      type: 'object',
      properties: {
        includeDetails: { type: 'boolean', description: 'Include detailed metrics' }
      }
    }
  },
  {
    name: 'update_streaming',
    description: 'Fix or configure real-time streaming',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['enable', 'fix', 'optimize', 'diagnose'],
          description: 'Streaming action'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'remove_phantom_message',
    description: 'Remove unwanted messages from responses (like context reset notices)',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Message pattern to remove'
        }
      },
      required: ['pattern']
    }
  }
];

// Export combined tools
export const HOLLY_TOOLS: Tool[] = [...CREATIVE_TOOLS, ...DEVELOPER_TOOLS];

// ========================================
// TOOL EXECUTION
// ========================================
export async function executeTool(
  toolName: string,
  toolInput: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Developer tools
    if (toolName === 'self_diagnose') {
      return await executeSelfDiagnose(toolInput);
    }
    if (toolName === 'execute_fix') {
      return await executeExecuteFix(toolInput);
    }
    if (toolName === 'check_system_health') {
      return await executeCheckSystemHealth(toolInput);
    }
    if (toolName === 'update_streaming') {
      return await executeUpdateStreaming(toolInput);
    }
    if (toolName === 'remove_phantom_message') {
      return await executeRemovePhantomMessage(toolInput);
    }

    // Creative tools (original)
    if (toolName === 'generate_music') {
      return await executeGenerateMusic(toolInput);
    }
    if (toolName === 'generate_video') {
      return await executeGenerateVideo(toolInput);
    }
    if (toolName === 'generate_image') {
      return await executeGenerateImage(toolInput);
    }

    return {
      success: false,
      error: `Unknown tool: ${toolName}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ========================================
// DEVELOPER TOOL IMPLEMENTATIONS
// ========================================
async function executeSelfDiagnose(input: any) {
  const response = await fetch('/api/developer/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Diagnosis failed');
  return await response.json();
}

async function executeExecuteFix(input: any) {
  const response = await fetch('/api/developer/fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Fix failed');
  return await response.json();
}

async function executeCheckSystemHealth(input: any) {
  const response = await fetch('/api/developer/health', {
    method: 'GET'
  });

  if (!response.ok) throw new Error('Health check failed');
  return await response.json();
}

async function executeUpdateStreaming(input: any) {
  const response = await fetch('/api/developer/streaming', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Streaming update failed');
  return await response.json();
}

async function executeRemovePhantomMessage(input: any) {
  const response = await fetch('/api/developer/response-filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Message filter failed');
  return await response.json();
}

// ========================================
// CREATIVE TOOL IMPLEMENTATIONS (Original)
// ========================================
async function executeGenerateMusic(input: any) {
  const response = await fetch('/api/music/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Music generation failed');
  return await response.json();
}

async function executeGenerateVideo(input: any) {
  const response = await fetch('/api/video/generate-multi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Video generation failed');
  return await response.json();
}

async function executeGenerateImage(input: any) {
  const response = await fetch('/api/image/generate-multi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error('Image generation failed');
  return await response.json();
}
