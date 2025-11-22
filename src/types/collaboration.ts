/**
 * Team Collaboration Types
 * Used for PR comments, mentions, reviews, and issue assignment
 */

export interface Collaborator {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  html_url: string;
  type: string;
  site_admin: boolean;
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}

export interface PRComment {
  id: number;
  node_id: string;
  html_url: string;
  body: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
  created_at: string;
  updated_at: string;
  pull_request_review_id?: number;
  diff_hunk?: string;
  path?: string;
  position?: number;
  original_position?: number;
  commit_id?: string;
  original_commit_id?: string;
  in_reply_to_id?: number;
}

export interface ReviewComment extends PRComment {
  pull_request_review_id: number;
  diff_hunk: string;
  path: string;
  position: number;
  line: number;
  side: 'LEFT' | 'RIGHT';
}

export interface PRReview {
  id: number;
  node_id: string;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  state: 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED';
  html_url: string;
  submitted_at: string;
  commit_id: string;
}

export interface ReviewRequest {
  users: Array<{
    login: string;
    id: number;
    avatar_url: string;
  }>;
  teams: Array<{
    name: string;
    id: number;
    slug: string;
  }>;
}

export interface IssueAssignment {
  assignees: Array<{
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  }>;
}

export interface CommentThread {
  id: number;
  type: 'pr_comment' | 'review_comment' | 'issue_comment';
  subject: string;
  url: string;
  comments: PRComment[];
  participants: Array<{
    login: string;
    avatar_url: string;
  }>;
  last_activity: string;
}

export interface MentionSuggestion {
  login: string;
  avatar_url: string;
  name?: string;
  contributions?: number;
}

export type CommentType = 'general' | 'line' | 'review';

export interface CreateCommentRequest {
  body: string;
  path?: string;
  position?: number;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
  commit_id?: string;
}

export interface CreateReviewRequest {
  reviewers: string[]; // Array of usernames
  team_reviewers?: string[]; // Array of team slugs
}

export interface AssignIssueRequest {
  assignees: string[]; // Array of usernames
}
