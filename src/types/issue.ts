/**
 * GitHub Issue Management Types
 * Used for creating, searching, and managing issues
 */

export interface Issue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  state_reason: 'completed' | 'reopened' | 'not_planned' | null;
  user: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
  labels: Label[];
  assignees: Array<{
    login: string;
    id: number;
    avatar_url: string;
  }>;
  milestone: Milestone | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  pull_request?: {
    url: string;
    html_url: string;
  };
}

export interface Label {
  id: number;
  node_id: string;
  name: string;
  description: string | null;
  color: string;
  default: boolean;
}

export interface Milestone {
  id: number;
  node_id: string;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  open_issues: number;
  closed_issues: number;
  created_at: string;
  updated_at: string;
  due_on: string | null;
  closed_at: string | null;
}

export interface IssueTemplate {
  name: string;
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface UpdateIssueRequest {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened';
  labels?: string[];
  assignees?: string[];
  milestone?: number | null;
}

export interface IssueSearchParams {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  assignee?: string;
  creator?: string;
  mentioned?: string;
  milestone?: string;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  since?: string;
  per_page?: number;
  page?: number;
}

export interface IssueStats {
  total: number;
  open: number;
  closed: number;
  by_label: Record<string, number>;
  by_assignee: Record<string, number>;
  by_milestone: Record<string, number>;
}

export const ISSUE_TEMPLATES: IssueTemplate[] = [
  {
    name: 'Bug Report',
    title: '🐛 [Bug]: ',
    body: `## Description
A clear description of the bug.

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: 
- Browser: 
- Version: 

## Additional Context
Any other relevant information.`,
    labels: ['bug'],
  },
  {
    name: 'Feature Request',
    title: '✨ [Feature]: ',
    body: `## Feature Description
A clear description of the feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you've thought about.

## Additional Context
Any other relevant information.`,
    labels: ['enhancement'],
  },
  {
    name: 'Documentation',
    title: '📚 [Docs]: ',
    body: `## Documentation Issue
What needs to be documented or improved?

## Location
Where in the docs is this?

## Proposed Changes
What should be changed or added?

## Additional Context
Any other relevant information.`,
    labels: ['documentation'],
  },
  {
    name: 'Question',
    title: '❓ [Question]: ',
    body: `## Question
What would you like to know?

## Context
Why are you asking this?

## What I've Tried
What have you already looked at or tried?`,
    labels: ['question'],
  },
  {
    name: 'Blank',
    title: '',
    body: '',
    labels: [],
  },
];
