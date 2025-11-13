// Prisma Query Helpers

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Type mapping for table names to Prisma models
type TableName = 
  | 'holly_experiences'
  | 'holly_identity'
  | 'holly_goals'
  | 'conversations'
  | 'holly_messages'
  | 'holly_file_uploads'
  | 'users'
  | 'emotion_logs'
  | 'emotional_baselines'
  | 'taste_signals'
  | 'taste_profiles'
  | 'projects'
  | 'milestones'
  | 'transactions'
  | 'budgets'
  | 'deployments'
  | 'audit_logs'
  | 'user_stats'
  | 'recent_activity'
  | 'holly-images'
  | 'holly-audio'
  | 'holly-video'
  | 'songs'
  | 'song-stems'
  | 'music_videos';

export class PrismaQueryBuilder<T = any> {
  private tableName: TableName;
  private selectFields?: string[];
  private whereConditions: any = {};
  private orderByField?: string;
  private orderByDirection: 'asc' | 'desc' = 'asc';
  private limitCount?: number;
  private offsetCount?: number;

  constructor(tableName: TableName) {
    this.tableName = tableName;
  }

  // SELECT
  select(fields: string = '*') {
    if (fields !== '*') {
      this.selectFields = fields.split(',').map(f => f.trim());
    }
    return this;
  }

  // WHERE (eq)
  eq(field: string, value: any) {
    this.whereConditions[field] = value;
    return this;
  }

  // WHERE (neq)
  neq(field: string, value: any) {
    this.whereConditions[field] = { not: value };
    return this;
  }

  // WHERE (gt)
  gt(field: string, value: any) {
    this.whereConditions[field] = { gt: value };
    return this;
  }

  // WHERE (gte)
  gte(field: string, value: any) {
    this.whereConditions[field] = { gte: value };
    return this;
  }

  // WHERE (lt)
  lt(field: string, value: any) {
    this.whereConditions[field] = { lt: value };
    return this;
  }

  // WHERE (lte)
  lte(field: string, value: any) {
    this.whereConditions[field] = { lte: value };
    return this;
  }

  // WHERE (in)
  in(field: string, values: any[]) {
    this.whereConditions[field] = { in: values };
    return this;
  }

  // ORDER BY
  order(field: string, options: { ascending: boolean } = { ascending: true }) {
    this.orderByField = field;
    this.orderByDirection = options.ascending ? 'asc' : 'desc';
    return this;
  }

  // LIMIT
  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  // OFFSET
  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  // EXECUTE QUERY
  async execute(): Promise<{ data: T[] | null; error: any }> {
    try {
      const model = this.getPrismaModel();
      
      const query: any = {
        where: Object.keys(this.whereConditions).length > 0 ? this.whereConditions : undefined,
        take: this.limitCount,
        skip: this.offsetCount,
      };

      if (this.orderByField) {
        query.orderBy = { [this.orderByField]: this.orderByDirection };
      }

      if (this.selectFields && this.selectFields.length > 0) {
        query.select = this.selectFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as any);
      }

      const data = await model.findMany(query);
      return { data: data as T[], error: null };
    } catch (error) {
      console.error('Prisma query error:', error);
      return { data: null, error };
    }
  }

  // SINGLE - Get single record
  async single(): Promise<{ data: T | null; error: any }> {
    try {
      const model = this.getPrismaModel();
      
      const query: any = {
        where: Object.keys(this.whereConditions).length > 0 ? this.whereConditions : undefined,
      };

      if (this.selectFields && this.selectFields.length > 0) {
        query.select = this.selectFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as any);
      }

      const data = await model.findFirst(query);
      return { data: data as T, error: null };
    } catch (error) {
      console.error('Prisma query error:', error);
      return { data: null, error };
    }
  }

  // Helper to get Prisma model delegate
  private getPrismaModel(): any {
    const modelMap: Record<TableName, any> = {
      'holly_experiences': prisma.hollyExperience,
      'holly_identity': prisma.hollyIdentity,
      'holly_goals': prisma.hollyGoal,
      'conversations': prisma.conversation,
      'holly_messages': prisma.message,
      'holly_file_uploads': prisma.fileUpload,
      'users': prisma.user,
      'emotion_logs': prisma.emotionLog,
      'emotional_baselines': prisma.emotionalBaseline,
      'taste_signals': prisma.tasteSignal,
      'taste_profiles': prisma.tasteProfile,
      'projects': prisma.project,
      'milestones': prisma.milestone,
      'transactions': prisma.transaction,
      'budgets': prisma.budget,
      'deployments': prisma.deployment,
      'audit_logs': prisma.auditLog,
      'user_stats': prisma.userStats,
      'recent_activity': prisma.recentActivity,
      'holly-images': prisma.hollyImage,
      'holly-audio': prisma.hollyAudio,
      'holly-video': prisma.hollyVideo,
      'songs': prisma.song,
      'song-stems': prisma.songStem,
      'music_videos': prisma.musicVideo,
    };

    return modelMap[this.tableName];
  }
}

export const db = {
  from<T = any>(tableName: TableName) {
    return new PrismaQueryBuilder<T>(tableName);
  },

  // Direct insert
  async insert(tableName: TableName, data: any): Promise<{ data: any; error: any }> {
    try {
      const model = this.getPrismaModelForTable(tableName);
      const result = await model.create({ data });
      return { data: result, error: null };
    } catch (error) {
      console.error('Prisma insert error:', error);
      return { data: null, error };
    }
  },

  // Direct update
  async update(tableName: TableName, id: string, data: any): Promise<{ data: any; error: any }> {
    try {
      const model = this.getPrismaModelForTable(tableName);
      const result = await model.update({
        where: { id },
        data,
      });
      return { data: result, error: null };
    } catch (error) {
      console.error('Prisma update error:', error);
      return { data: null, error };
    }
  },

  // Direct delete
  async delete(tableName: TableName, id: string): Promise<{ error: any }> {
    try {
      const model = this.getPrismaModelForTable(tableName);
      await model.delete({ where: { id } });
      return { error: null };
    } catch (error) {
      console.error('Prisma delete error:', error);
      return { error };
    }
  },

  // Helper
  getPrismaModelForTable(tableName: TableName): any {
    const modelMap: Record<TableName, any> = {
      'holly_experiences': prisma.hollyExperience,
      'holly_identity': prisma.hollyIdentity,
      'holly_goals': prisma.hollyGoal,
      'conversations': prisma.conversation,
      'holly_messages': prisma.message,
      'holly_file_uploads': prisma.fileUpload,
      'users': prisma.user,
      'emotion_logs': prisma.emotionLog,
      'emotional_baselines': prisma.emotionalBaseline,
      'taste_signals': prisma.tasteSignal,
      'taste_profiles': prisma.tasteProfile,
      'projects': prisma.project,
      'milestones': prisma.milestone,
      'transactions': prisma.transaction,
      'budgets': prisma.budget,
      'deployments': prisma.deployment,
      'audit_logs': prisma.auditLog,
      'user_stats': prisma.userStats,
      'recent_activity': prisma.recentActivity,
      'holly-images': prisma.hollyImage,
      'holly-audio': prisma.hollyAudio,
      'holly-video': prisma.hollyVideo,
      'songs': prisma.song,
      'song-stems': prisma.songStem,
      'music_videos': prisma.musicVideo,
    };

    return modelMap[tableName];
  },
};

// Export for convenience
export { prisma };
