/**
 * HOLLY Tool Hub — Tool Registry
 *
 * Single source of truth for all registered tools.
 * Add new tools here; the hub master endpoint and docs auto-update.
 */

import type { ToolManifest } from './types';

export const TOOL_REGISTRY: Record<string, ToolManifest> = {
  aura: {
    id:          'aura',
    name:        'AURA',
    version:     '1.0.0',
    description: 'AI-powered A&R engine. Analyzes songs, generates improvement recommendations, and identifies hit potential using market trends and genre data.',
    author:      'HOLLY',
    category:    'music',
    status:      'active',
    auth:        'hub_key',
    rateLimit:   { rpm: 20, rpd: 200 },
    baseUrl:     '/api/hub/aura',
    actions: [
      {
        id:          'analyze_song',
        name:        'Analyze Song',
        description: 'Analyze a song\'s structure, melody, and lyrics to identify patterns and trends.',
        method:      'POST',
        path:        '/analyze_song',
        inputSchema: {
          title:   { type: 'string', required: true,  description: 'Song title', example: 'Blinding Lights' },
          artist:  { type: 'string', required: false, description: 'Artist name', example: 'The Weeknd' },
          genre:   { type: 'string', required: false, description: 'Music genre', example: 'pop' },
          lyrics:  { type: 'string', required: false, description: 'Full lyrics text' },
          bpm:     { type: 'number', required: false, description: 'Beats per minute', example: 171 },
          key:     { type: 'string', required: false, description: 'Musical key', example: 'F minor' },
          mood:    { type: 'string', required: false, description: 'Song mood', example: 'energetic' },
        },
        outputSchema: {
          structure:    { type: 'object', required: true, description: 'Song structure breakdown' },
          melody:       { type: 'object', required: true, description: 'Melody analysis' },
          lyrics:       { type: 'object', required: true, description: 'Lyrics analysis' },
          patterns:     { type: 'array',  required: true, description: 'Identified patterns' },
          trends:       { type: 'array',  required: true, description: 'Market/genre trends' },
          overallScore: { type: 'number', required: true, description: 'Overall quality score 0–100' },
          summary:      { type: 'string', required: true, description: 'Executive summary' },
        },
        example: {
          input:  { title: 'Midnight Drive', artist: 'Nova', genre: 'synthpop', bpm: 128, key: 'G minor' },
          output: { overallScore: 82, verdict: 'Strong commercial potential', patterns: ['8-bar verse loop', 'hook repetition x3'] },
        },
      },
      {
        id:          'generate_recommendations',
        name:        'Generate Recommendations',
        description: 'Generate actionable recommendations for song improvement including chord progressions, melody ideas, and lyric edits.',
        method:      'POST',
        path:        '/generate_recommendations',
        inputSchema: {
          title:          { type: 'string', required: true,  description: 'Song title' },
          genre:          { type: 'string', required: false, description: 'Music genre' },
          lyrics:         { type: 'string', required: false, description: 'Current lyrics' },
          currentKey:     { type: 'string', required: false, description: 'Current key', example: 'A minor' },
          currentBpm:     { type: 'number', required: false, description: 'Current BPM' },
          targetMood:     { type: 'string', required: false, description: 'Desired emotional mood' },
          targetAudience: { type: 'string', required: false, description: 'Target audience', example: 'gen-z pop' },
          areas:          { type: 'array',  required: false, description: 'Focus areas', enum: ['melody', 'chords', 'lyrics', 'structure', 'production'] },
        },
        outputSchema: {
          recommendations:   { type: 'array',  required: true, description: 'Prioritized improvement list' },
          chordProgressions: { type: 'array',  required: true, description: 'Alternative chord progressions' },
          melodyIdeas:       { type: 'array',  required: true, description: 'Melody improvement suggestions' },
          lyricsEdits:       { type: 'array',  required: true, description: 'Specific lyric edits' },
          productionTips:    { type: 'array',  required: true, description: 'Production recommendations' },
          summary:           { type: 'string', required: true, description: 'Summary of key changes' },
        },
        example: {
          input:  { title: 'Midnight Drive', genre: 'synthpop', areas: ['chords', 'lyrics'] },
          output: { chordProgressions: [{ name: 'Neo-Soul shift', chords: ['Gm', 'Eb', 'Bb', 'F'] }] },
        },
      },
      {
        id:          'identify_hit_potential',
        name:        'Identify Hit Potential',
        description: 'Score a song\'s commercial hit potential based on market trends, genre analysis, and audience preference modeling.',
        method:      'POST',
        path:        '/identify_hit_potential',
        inputSchema: {
          title:           { type: 'string', required: true,  description: 'Song title' },
          genre:           { type: 'string', required: true,  description: 'Primary genre' },
          artist:          { type: 'string', required: false, description: 'Artist name' },
          lyrics:          { type: 'string', required: false, description: 'Lyrics text' },
          targetMarket:    { type: 'string', required: false, description: 'Target market', example: 'US mainstream' },
          releaseDate:     { type: 'string', required: false, description: 'Planned release date (ISO)' },
          similarArtists:  { type: 'array',  required: false, description: 'Similar artist names' },
        },
        outputSchema: {
          hitScore:       { type: 'number', required: true, description: 'Hit potential score 0–100' },
          verdict:        { type: 'string', required: true, description: 'high | medium | low' },
          confidence:     { type: 'number', required: true, description: 'Confidence 0–1' },
          marketAnalysis: { type: 'object', required: true, description: 'Market fit analysis' },
          strengths:      { type: 'array',  required: true, description: 'Song strengths' },
          weaknesses:     { type: 'array',  required: true, description: 'Areas to improve' },
          comparables:    { type: 'array',  required: true, description: 'Comparable hit tracks' },
          recommendation: { type: 'string', required: true, description: 'Strategic recommendation' },
        },
        example: {
          input:  { title: 'Midnight Drive', genre: 'synthpop', targetMarket: 'US mainstream', similarArtists: ['The Weeknd', 'Dua Lipa'] },
          output: { hitScore: 78, verdict: 'high', confidence: 0.81 },
        },
      },
    ],
  },

  sentinel: {
    id:          'sentinel',
    name:        'Sentinel',
    version:     '1.0.0',
    description: 'AI-powered code intelligence engine. Analyzes code for errors and optimizations, and generates clean code from natural language descriptions.',
    author:      'HOLLY',
    category:    'code',
    status:      'active',
    auth:        'hub_key',
    rateLimit:   { rpm: 30, rpd: 300 },
    baseUrl:     '/api/hub/sentinel',
    actions: [
      {
        id:          'analyze_code',
        name:        'Analyze Code',
        description: 'Analyze a code snippet to identify errors, optimize performance, flag security issues, and suggest improvements.',
        method:      'POST',
        path:        '/analyze_code',
        inputSchema: {
          code:        { type: 'string',  required: true,  description: 'Source code to analyze' },
          language:    { type: 'string',  required: true,  description: 'Programming language', example: 'typescript' },
          filename:    { type: 'string',  required: false, description: 'Original filename for context' },
          context:     { type: 'string',  required: false, description: 'What the code is meant to do' },
          focusAreas:  { type: 'array',   required: false, description: 'Analysis focus', enum: ['errors', 'performance', 'security', 'style', 'all'] },
        },
        outputSchema: {
          score:       { type: 'number', required: true, description: 'Code quality score 0–100' },
          errors:      { type: 'array',  required: true, description: 'Errors found' },
          warnings:    { type: 'array',  required: true, description: 'Warnings' },
          suggestions: { type: 'array',  required: true, description: 'Improvement suggestions' },
          performance: { type: 'array',  required: true, description: 'Performance insights' },
          security:    { type: 'array',  required: true, description: 'Security insights' },
          metrics:     { type: 'object', required: true, description: 'Code metrics' },
          summary:     { type: 'string', required: true, description: 'Analysis summary' },
          fixedCode:   { type: 'string', required: false, description: 'Auto-corrected version' },
        },
        example: {
          input:  { code: 'const x = 1;\nif(x = 2) { console.log(x) }', language: 'javascript' },
          output: { score: 45, errors: [{ line: 2, message: 'Assignment in condition — use == or ===' }] },
        },
      },
      {
        id:          'generate_code',
        name:        'Generate Code',
        description: 'Generate clean, production-ready code from a natural language description.',
        method:      'POST',
        path:        '/generate_code',
        inputSchema: {
          description:  { type: 'string', required: true,  description: 'What you want the code to do' },
          language:     { type: 'string', required: true,  description: 'Target programming language' },
          framework:    { type: 'string', required: false, description: 'Framework or library', example: 'Next.js' },
          style:        { type: 'string', required: false, description: 'Code style preference', example: 'functional' },
          context:      { type: 'string', required: false, description: 'Surrounding code / imports for context' },
          requirements: { type: 'array',  required: false, description: 'Specific requirements to include' },
        },
        outputSchema: {
          code:         { type: 'string', required: true,  description: 'Generated source code' },
          language:     { type: 'string', required: true,  description: 'Output language' },
          explanation:  { type: 'string', required: true,  description: 'How the code works' },
          usage:        { type: 'string', required: true,  description: 'How to use / integrate it' },
          dependencies: { type: 'array',  required: true,  description: 'Required dependencies' },
          tests:        { type: 'string', required: false, description: 'Unit tests for the generated code' },
          notes:        { type: 'array',  required: true,  description: 'Implementation notes' },
        },
        example: {
          input:  { description: 'A React hook that fetches data with loading and error states', language: 'typescript', framework: 'React' },
          output: { code: 'export function useFetch<T>(url: string) { ... }', dependencies: ['react'] },
        },
      },
    ],
  },
};

/** Return a tool manifest by id, or null if not registered. */
export function getTool(id: string): ToolManifest | null {
  return TOOL_REGISTRY[id] ?? null;
}

/** Return all registered tools as an array. */
export function getAllTools(): ToolManifest[] {
  return Object.values(TOOL_REGISTRY);
}

/** Return tools filtered by category. */
export function getToolsByCategory(category: ToolManifest['category']): ToolManifest[] {
  return getAllTools().filter(t => t.category === category);
}
