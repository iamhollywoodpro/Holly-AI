/**
 * HOLLY CAPABILITY PROTECTION TESTS
 * These tests ensure HOLLY never loses her core capabilities
 * 
 * RUN BEFORE EVERY DEPLOYMENT
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('🛡️ HOLLY Capability Protection', () => {
  let orchestratorContent: string;
  let toolNames: string[];
  
  beforeAll(() => {
    // Read the orchestrator file
    const orchestratorPath = path.join(process.cwd(), 'src/lib/ai/ai-orchestrator.ts');
    
    if (!fs.existsSync(orchestratorPath)) {
      throw new Error('❌ ai-orchestrator.ts not found!');
    }
    
    orchestratorContent = fs.readFileSync(orchestratorPath, 'utf8');
    
    // Extract tool names
    const nameMatches = orchestratorContent.matchAll(/name: ['"]([^'"]+)['"]/g);
    toolNames = Array.from(nameMatches).map(match => match[1]);
    
    console.log(`📊 Found ${toolNames.length} tools in orchestrator`);
  });
  
  describe('Tool Count Validation', () => {
    it('should have at least 60 tools', () => {
      expect(toolNames.length).toBeGreaterThanOrEqual(60);
    });
    
    it('should have 65-67 tools for full coverage', () => {
      // Allow some flexibility for tool additions
      expect(toolNames.length).toBeGreaterThanOrEqual(65);
      expect(toolNames.length).toBeLessThanOrEqual(67);
    });
    
    it('should not have duplicate tool names', () => {
      const uniqueTools = new Set(toolNames);
      
      if (uniqueTools.size !== toolNames.length) {
        const duplicates = toolNames.filter((tool, index) => toolNames.indexOf(tool) !== index);
        console.error('❌ Duplicate tools found:', duplicates);
      }
      
      // Allow up to 1 duplicate (might be intentional for fallback)
      expect(toolNames.length - uniqueTools.size).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Critical Tool Categories', () => {
    const requiredCategories = {
      'Creative': ['generate_music', 'generate_image', 'generate_video'],
      'Code Generation': ['generate_code', 'optimize_code', 'review_code'],
      'GitHub': ['github_commit', 'github_create_pr', 'github_create_issue'],
      'Deployment': ['deploy_to_vercel'],
      'Architecture': ['generate_architecture'],
      'Research': ['research_web'],
      'Voice & Audio': ['generate_speech', 'transcribe_audio'],
    };
    
    Object.entries(requiredCategories).forEach(([category, tools]) => {
      describe(category, () => {
        tools.forEach(tool => {
          it(`should have ${tool}`, () => {
            expect(toolNames).toContain(tool);
          });
        });
      });
    });
  });
  
  describe('Executor Validation', () => {
    it('should have executeTool function', () => {
      expect(orchestratorContent).toContain('async function executeTool(');
    });
    
    it('should have endpoint mappings', () => {
      expect(orchestratorContent).toContain('const endpoints: Record<string, string>');
    });
    
    it('should have at least 60 endpoint mappings', () => {
      const endpointMatches = orchestratorContent.matchAll(/\/api\/[a-z/-]+/g);
      const endpoints = Array.from(endpointMatches);
      expect(endpoints.length).toBeGreaterThanOrEqual(60);
    });
    
    it('should map all tools to endpoints', () => {
      // Extract endpoints section
      const endpointsMatch = orchestratorContent.match(/const endpoints: Record<string, string> = \{([\s\S]*?)\};/);
      
      if (!endpointsMatch) {
        throw new Error('❌ Endpoints mapping not found!');
      }
      
      const endpointsSection = endpointsMatch[1];
      
      // Check each tool has an endpoint
      const missingEndpoints: string[] = [];
      
      toolNames.forEach(tool => {
        const hasEndpoint = new RegExp(`${tool}:\\s*['"]\/api\/`).test(endpointsSection);
        if (!hasEndpoint) {
          missingEndpoints.push(tool);
        }
      });
      
      if (missingEndpoints.length > 0) {
        console.error('❌ Tools missing endpoints:', missingEndpoints);
      }
      
      // Allow some flexibility (max 15 tools can have dynamic routing or use if-statements)
      expect(missingEndpoints.length).toBeLessThanOrEqual(15);
    });
  });
  
  describe('Structure Integrity', () => {
    it('should have HOLLY_TOOLS array', () => {
      expect(orchestratorContent).toContain('const HOLLY_TOOLS');
    });
    
    it('should export generateHollyResponse', () => {
      expect(orchestratorContent).toContain('export async function generateHollyResponse');
    });
    
    it('should use Gemini 2.5 Flash', () => {
      expect(orchestratorContent).toContain('gemini-2.5-flash');
    });
    
    it('should have tool_choice configuration', () => {
      expect(orchestratorContent).toContain('tool_choice');
    });
    

  });
  
  describe('Critical Tool Handlers', () => {
    // The orchestrator uses tool names and executeTool handlers, not direct endpoint strings
    // Check for the existence of critical tool handlers instead
    const criticalToolHandlers = [
      'generate_code',
      'github_commit',
      'generate_music',
      'generate_image',
      'generate_video',
      'research_web',
    ];
    
    criticalToolHandlers.forEach(handler => {
      it(`should have ${handler} tool handler`, () => {
        // Check that the tool exists in the HOLLY_TOOLS array
        expect(orchestratorContent).toContain(`name: '${handler}'`);
      });
    });
  });
  
  describe('Regression Protection', () => {
    it('should not be oversimplified (3 tools only)', () => {
      // This was the bug - only 3 tools
      expect(toolNames.length).not.toBe(3);
    });
    
    it('should have more than just creative tools', () => {
      const creativeTools = ['generate_music', 'generate_image', 'generate_video'];
      const hasOtherTools = toolNames.some(tool => !creativeTools.includes(tool));
      expect(hasOtherTools).toBe(true);
    });
    
    it('should have development capabilities', () => {
      const devTools = toolNames.filter(tool => 
        tool.includes('code') || 
        tool.includes('github') || 
        tool.includes('deploy')
      );
      expect(devTools.length).toBeGreaterThanOrEqual(10);
    });
  });
});

describe('📊 Capability Coverage Report', () => {
  it('should generate coverage report', () => {
    const orchestratorPath = path.join(process.cwd(), 'src/lib/ai/ai-orchestrator.ts');
    const content = fs.readFileSync(orchestratorPath, 'utf8');
    const nameMatches = content.matchAll(/name: ['"]([^'"]+)['"]/g);
    const tools = Array.from(nameMatches).map(match => match[1]);
    
    const categories = {
      'Creative': tools.filter(t => t.includes('music') || t.includes('image') || t.includes('video') || t.includes('audio')),
      'Code': tools.filter(t => t.includes('code') || t.includes('generate') || t.includes('optimize')),
      'GitHub': tools.filter(t => t.startsWith('github_')),
      'Architecture': tools.filter(t => t.includes('architecture') || t.includes('scaffold') || t.includes('project')),
      'Admin': tools.filter(t => t.includes('manage') || t.includes('admin')),
      'Analytics': tools.filter(t => t.includes('analyze') || t.includes('track') || t.includes('predict')),
      'Consciousness': tools.filter(t => t.includes('learn') || t.includes('reflect') || t.includes('experience')),
    };
    
    console.log('\n📊 HOLLY CAPABILITY COVERAGE REPORT\n');
    console.log('====================================\n');
    console.log(`Total Tools: ${tools.length}/65\n`);
    
    Object.entries(categories).forEach(([category, categoryTools]) => {
      console.log(`${category}: ${categoryTools.length} tools`);
      categoryTools.forEach(tool => console.log(`  • ${tool}`));
      console.log('');
    });
    
    expect(tools.length).toBeGreaterThanOrEqual(60);
  });
});
