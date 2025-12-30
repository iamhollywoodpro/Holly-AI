/**
 * Task Executor - Executes high-level web automation tasks
 * Translates natural language commands into browser actions
 */

import { browserController } from './browser-controller';
import { nanoid } from 'nanoid';

export interface WebTask {
  id: string;
  type: 'navigate' | 'extract' | 'interact' | 'screenshot' | 'custom';
  description: string;
  url?: string;
  selector?: string;
  action?: string;
  value?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string; // Base64 encoded
}

export class TaskExecutor {
  private activeTasks: Map<string, WebTask> = new Map();

  /**
   * Execute a web navigation task
   */
  async executeNavigate(
    sessionId: string,
    url: string,
    description: string
  ): Promise<TaskResult> {
    const taskId = nanoid();
    const task: WebTask = {
      id: taskId,
      type: 'navigate',
      description,
      url,
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeTasks.set(taskId, task);

    try {
      task.status = 'running';

      await browserController.navigate(sessionId, url);

      const pageUrl = await browserController.getUrl(sessionId);
      const title = await browserController.getTitle(sessionId);

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = { url: pageUrl, title };

      return {
        success: true,
        data: { url: pageUrl, title },
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Execute a data extraction task
   */
  async executeExtract(
    sessionId: string,
    selector: string,
    description: string,
    multiple: boolean = false
  ): Promise<TaskResult> {
    const taskId = nanoid();
    const task: WebTask = {
      id: taskId,
      type: 'extract',
      description,
      selector,
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeTasks.set(taskId, task);

    try {
      task.status = 'running';

      const data = await browserController.extractText(sessionId, {
        selector,
        multiple,
      });

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = data;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Execute an interaction task (click, fill, etc.)
   */
  async executeInteract(
    sessionId: string,
    action: 'click' | 'fill',
    selector: string,
    value?: string,
    description?: string
  ): Promise<TaskResult> {
    const taskId = nanoid();
    const task: WebTask = {
      id: taskId,
      type: 'interact',
      description: description || `${action} ${selector}`,
      selector,
      action,
      value,
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeTasks.set(taskId, task);

    try {
      task.status = 'running';

      if (action === 'click') {
        await browserController.click(sessionId, selector);
      } else if (action === 'fill' && value) {
        await browserController.fill(sessionId, selector, value);
      }

      task.status = 'completed';
      task.completedAt = new Date();

      return {
        success: true,
        data: { action, selector, value },
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Execute a screenshot task
   */
  async executeScreenshot(
    sessionId: string,
    description: string,
    fullPage: boolean = false
  ): Promise<TaskResult> {
    const taskId = nanoid();
    const task: WebTask = {
      id: taskId,
      type: 'screenshot',
      description,
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeTasks.set(taskId, task);

    try {
      task.status = 'running';

      const buffer = await browserController.screenshot(sessionId, {
        fullPage,
        type: 'png',
      });

      const base64 = buffer.toString('base64');

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = { screenshot: base64 };

      return {
        success: true,
        screenshot: base64,
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Execute a custom JavaScript task
   */
  async executeCustom<T>(
    sessionId: string,
    script: string,
    description: string
  ): Promise<TaskResult> {
    const taskId = nanoid();
    const task: WebTask = {
      id: taskId,
      type: 'custom',
      description,
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeTasks.set(taskId, task);

    try {
      task.status = 'running';

      const result = await browserController.evaluate<T>(sessionId, script);

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): WebTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): WebTask | undefined {
    return this.activeTasks.get(taskId);
  }
}

// Singleton instance
export const taskExecutor = new TaskExecutor();
