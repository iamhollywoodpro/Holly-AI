/**
 * CAPABILITY MONITOR API
 * Returns real-time status of HOLLY's capabilities
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';


const EXPECTED_TOOL_COUNTS = {
  'Creative': 7,
  'Code Generation': 5,
  'GitHub': 11,
  'Architecture': 6,
  'Storage': 3,
  'Admin & System': 7,
  'Analytics': 6,
  'Consciousness': 10,
  'Deployment': 1,
  'Research': 1,
  'Image Analysis': 1,
  'Voice & Audio': 3,
  'Integrations': 4,
};

const TOTAL_EXPECTED = Object.values(EXPECTED_TOOL_COUNTS).reduce((a, b) => a + b, 0);

export async function GET() {
  try {
    // Read orchestrator file
    const orchestratorPath = path.join(process.cwd(), 'src/lib/ai/ai-orchestrator.ts');
    
    if (!fs.existsSync(orchestratorPath)) {
      return NextResponse.json(
        { error: 'Orchestrator file not found' },
        { status: 500 }
      );
    }

    const content = fs.readFileSync(orchestratorPath, 'utf8');
    
    // Extract tool names
    const nameMatches = content.matchAll(/name: ['"]([^'"]+)['"]/g);
    const tools = Array.from(nameMatches).map(match => match[1]);
    
    // Categorize tools
    const categories = [
      {
        name: 'Creative',
        tools: tools.filter(t => 
          ['generate_music', 'generate_image', 'generate_video', 'remix_music', 
           'extend_music', 'separate_audio_stems', 'generate_lyrics'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Creative'],
        status: 'healthy',
      },
      {
        name: 'Code Generation',
        tools: tools.filter(t => 
          ['generate_code', 'optimize_code', 'review_code', 'use_code_template', 
           'analyze_code_patterns'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Code Generation'],
        status: 'healthy',
      },
      {
        name: 'GitHub',
        tools: tools.filter(t => t.startsWith('github_')),
        expected: EXPECTED_TOOL_COUNTS['GitHub'],
        status: 'healthy',
      },
      {
        name: 'Architecture',
        tools: tools.filter(t => 
          ['generate_architecture', 'create_project', 'generate_database_schema',
           'scaffold_component', 'generate_api_documentation', 'generate_documentation'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Architecture'],
        status: 'healthy',
      },
      {
        name: 'Storage',
        tools: tools.filter(t => 
          ['upload_to_drive', 'list_drive_files', 'create_download_link'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Storage'],
        status: 'healthy',
      },
      {
        name: 'Admin & System',
        tools: tools.filter(t => 
          ['self_heal_system', 'auto_merge_code', 'run_code_tests', 
           'manage_environment_vars', 'configure_cicd_pipeline', 
           'monitor_deployment_health', 'rollback_deployment'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Admin & System'],
        status: 'healthy',
      },
      {
        name: 'Analytics',
        tools: tools.filter(t => 
          ['analyze_user_behavior', 'track_user_journey', 'run_ab_test',
           'generate_insights', 'predictive_detection', 'analyze_business_metrics'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Analytics'],
        status: 'healthy',
      },
      {
        name: 'Consciousness',
        tools: tools.filter(t => 
          ['record_experience', 'reflect_on_work', 'set_personal_goal',
           'learn_from_feedback', 'track_taste_preference', 'predict_user_needs',
           'analyze_self_performance', 'detect_collaboration_patterns',
           'transfer_knowledge', 'optimize_responses'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Consciousness'],
        status: 'healthy',
      },
      {
        name: 'Deployment',
        tools: tools.filter(t => t === 'deploy_to_vercel'),
        expected: EXPECTED_TOOL_COUNTS['Deployment'],
        status: 'healthy',
      },
      {
        name: 'Research',
        tools: tools.filter(t => t === 'research_web'),
        expected: EXPECTED_TOOL_COUNTS['Research'],
        status: 'healthy',
      },
      {
        name: 'Image Analysis',
        tools: tools.filter(t => t === 'analyze_image'),
        expected: EXPECTED_TOOL_COUNTS['Image Analysis'],
        status: 'healthy',
      },
      {
        name: 'Voice & Audio',
        tools: tools.filter(t => 
          ['generate_speech', 'transcribe_audio', 'analyze_music'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Voice & Audio'],
        status: 'healthy',
      },
      {
        name: 'Integrations',
        tools: tools.filter(t => 
          ['manage_integrations', 'manage_webhooks', 'create_custom_report',
           'create_metric_alert'].includes(t)
        ),
        expected: EXPECTED_TOOL_COUNTS['Integrations'],
        status: 'healthy',
      },
    ];

    // Update status based on tool count
    categories.forEach(cat => {
      const coverage = (cat.tools.length / cat.expected) * 100;
      if (coverage >= 95) cat.status = 'healthy';
      else if (coverage >= 75) cat.status = 'warning';
      else cat.status = 'critical';
    });

    const totalTools = tools.length;
    const coverage = Math.round((totalTools / TOTAL_EXPECTED) * 100);
    
    // Determine trend (you'd store historical data in production)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (coverage < 85) trend = 'down';
    else if (coverage === 100) trend = 'up';

    const response = {
      totalTools,
      expectedTools: TOTAL_EXPECTED,
      coverage,
      categories,
      lastChecked: new Date().toISOString(),
      trend,
      alerts: categories
        .filter(cat => cat.status === 'critical')
        .map(cat => ({
          category: cat.name,
          message: `${cat.name} is missing ${cat.expected - cat.tools.length} tools`,
          severity: 'critical',
        })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Capability monitor error:', error);
    return NextResponse.json(
      { error: 'Failed to check capabilities' },
      { status: 500 }
    );
  }
}
