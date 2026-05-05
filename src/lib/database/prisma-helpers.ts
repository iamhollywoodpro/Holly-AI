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
  // Removed: 'taste_signals' - model doesn't exist
  // Removed: 'taste_profiles' - model doesn't exist
  | 'projects'
  | 'milestones'
  | 'transactions'
  | 'budgets'
  | 'deployments'
  | 'audit_logs'
  | 'user_stats'
  | 'recent_activity';
  // Removed: 'holly-images', 'holly-audio', 'holly-video' - models don't exist
  // Removed: 'songs', 'song-stems', 'music_videos' - models don't exist

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

  // WHERE
  where(conditions: any) {
    this.whereConditions = { ...this.whereConditions, ...conditions };
    return this;
  }

  // ORDER BY
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.orderByField = field;
    this.orderByDirection = direction;
    return this;
  }

  // LIMIT
  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  // OFFSET
  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  // Execute SELECT
  async get(): Promise<T[]> {
    const model = this.getPrismaModel();
    
    const query: any = {
      where: this.whereConditions,
    };

    if (this.selectFields) {
      query.select = this.selectFields.reduce((acc: any, field: string) => {
        acc[field] = true;
        return acc;
      }, {});
    }

    if (this.orderByField) {
      query.orderBy = { [this.orderByField]: this.orderByDirection };
    }

    if (this.limitCount) {
      query.take = this.limitCount;
    }

    if (this.offsetCount) {
      query.skip = this.offsetCount;
    }

    return await model.findMany(query);
  }

  // Execute SELECT ONE
  async first(): Promise<T | null> {
    const model = this.getPrismaModel();
    
    const query: any = {
      where: this.whereConditions,
    };

    if (this.selectFields) {
      query.select = this.selectFields.reduce((acc: any, field: string) => {
        acc[field] = true;
        return acc;
      }, {});
    }

    if (this.orderByField) {
      query.orderBy = { [this.orderByField]: this.orderByDirection };
    }

    return await model.findFirst(query);
  }

  // Execute COUNT
  async count(): Promise<number> {
    const model = this.getPrismaModel();
    return await model.count({ where: this.whereConditions });
  }

  // INSERT
  async insert(data: any): Promise<T> {
    const model = this.getPrismaModel();
    return await model.create({ data });
  }

  // UPDATE
  async update(data: any): Promise<T[]> {
    const model = this.getPrismaModel();
    return await model.updateMany({
      where: this.whereConditions,
      data,
    });
  }

  // DELETE
  async delete(): Promise<{ count: number }> {
    const model = this.getPrismaModel();
    return await model.deleteMany({ where: this.whereConditions });
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
      // 'taste_signals': prisma.tasteSignal, // Model doesn't exist
      // 'taste_profiles': prisma.tasteProfile, // Model doesn't exist
      'projects': prisma.project,
      'milestones': prisma.milestone,
      'transactions': prisma.transaction,
      'budgets': prisma.budget,
      'deployments': prisma.deployment,
      'audit_logs': prisma.auditLog,
      'user_stats': prisma.userStats,
      'recent_activity': prisma.recentActivity,
      // 'holly-images': prisma.hollyImage, // Model doesn't exist
      // 'holly-audio': prisma.hollyAudio, // Model doesn't exist
      // 'holly-video': prisma.hollyVideo, // Model doesn't exist
      // 'songs': prisma.song, // Model doesn't exist
      // 'song-stems': prisma.songStem, // Model doesn't exist
      // 'music_videos': prisma.musicVideo, // Model doesn't exist
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
      // 'taste_signals': prisma.tasteSignal, // Model doesn't exist
      // 'taste_profiles': prisma.tasteProfile, // Model doesn't exist
      'projects': prisma.project,
      'milestones': prisma.milestone,
      'transactions': prisma.transaction,
      'budgets': prisma.budget,
      'deployments': prisma.deployment,
      'audit_logs': prisma.auditLog,
      'user_stats': prisma.userStats,
      'recent_activity': prisma.recentActivity,
      // 'holly-images': prisma.hollyImage, // Model doesn't exist
      // 'holly-audio': prisma.hollyAudio, // Model doesn't exist
      // 'holly-video': prisma.hollyVideo, // Model doesn't exist
      // 'songs': prisma.song, // Model doesn't exist
      // 'song-stems': prisma.songStem, // Model doesn't exist
      // 'music_videos': prisma.musicVideo, // Model doesn't exist
    };

    return modelMap[tableName];
  }
};
