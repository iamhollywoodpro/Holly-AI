/**
 * Plugin Manager — Database-backed plugin lifecycle management
 *
 * Extends the in-memory PluginRegistry with persistent storage.
 * Handles install, uninstall, enable, disable, configure, and hook execution.
 * All state is persisted to PluginInstallation table.
 */

import { prisma } from '@/lib/prisma';
import {
  PluginManifest,
  PluginPermission,
  PluginState,
  validatePermissions,
  HookEvent,
  HookHandler,
  PluginRegistry,
} from './plugin-system';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PluginMarketplaceEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  downloads: number;
  rating: number;
  category: string;
}

// ─── Built-in Plugins (ship with Holly) ─────────────────────────────────────

const BUILTIN_PLUGINS: PluginMarketplaceEntry[] = [
  {
    id: 'holly-notes',
    name: 'Holly Notes',
    version: '1.0.0',
    description: 'Create, search, and manage persistent notes alongside your conversations',
    author: 'Holly',
    permissions: ['memory.read', 'memory.write', 'chat.read'],
    downloads: 0,
    rating: 5.0,
    category: 'productivity',
  },
  {
    id: 'holly-code-review',
    name: 'Code Review Assistant',
    version: '1.0.0',
    description: 'Automatic code review when you share code snippets — style, security, performance',
    author: 'Holly',
    permissions: ['chat.read', 'chat.write', 'tools.call'],
    downloads: 0,
    rating: 5.0,
    category: 'development',
  },
  {
    id: 'holly-daily-digest',
    name: 'Daily Digest',
    version: '1.0.0',
    description: 'Receive a daily summary of insights, reminders, and learning progress',
    author: 'Holly',
    permissions: ['memory.read', 'chat.read'],
    downloads: 0,
    rating: 5.0,
    category: 'productivity',
  },
  {
    id: 'holly-mood-tracker',
    name: 'Mood Tracker',
    version: '1.0.0',
    description: 'Track your emotional patterns over time and surface mood insights',
    author: 'Holly',
    permissions: ['memory.read', 'memory.write', 'chat.read'],
    downloads: 0,
    rating: 5.0,
    category: 'wellness',
  },
  {
    id: 'holly-project-planner',
    name: 'Project Planner',
    version: '1.0.0',
    description: 'Break down goals into tasks, track progress, and get proactive reminders',
    author: 'Holly',
    permissions: ['memory.read', 'memory.write', 'chat.read', 'chat.write'],
    downloads: 0,
    rating: 5.0,
    category: 'productivity',
  },
  {
    id: 'holly-language-tutor',
    name: 'Language Tutor',
    version: '1.0.0',
    description: 'Practice conversations in different languages with adaptive difficulty',
    author: 'Holly',
    permissions: ['memory.read', 'memory.write', 'chat.read', 'chat.write'],
    downloads: 0,
    rating: 5.0,
    category: 'education',
  },
];

// ─── Plugin Manager ─────────────────────────────────────────────────────────

class PluginManager {
  private registry = new PluginRegistry();
  private loaded = false;

  /**
   * Load all installed plugins from DB into in-memory registry.
   * Called on startup.
   */
  async loadFromDatabase(): Promise<void> {
    if (this.loaded) return;

    const installations = await prisma.pluginInstallation.findMany({
      where: { state: { in: ['enabled', 'installed', 'disabled'] } },
    });

    for (const inst of installations) {
      const manifest: PluginManifest = {
        id: inst.pluginId,
        name: inst.name,
        version: inst.version,
        description: inst.description,
        author: inst.author,
        permissions: inst.permissions as PluginPermission[],
        dependencies: inst.dependencies,
        hooks: inst.hooks,
        config: (inst.manifest as Record<string, any>)?.config as any,
      };

      this.registry.install(manifest);
      if (inst.state === 'enabled') {
        this.registry.enable(inst.pluginId);
      }
    }

    this.loaded = true;
  }

  /**
   * Install a plugin from the marketplace or a custom manifest.
   */
  async installPlugin(userId: string, manifest: PluginManifest): Promise<{
    success: boolean;
    error?: string;
    installationId?: string;
  }> {
    // Validate manifest
    if (!manifest.id || !manifest.name || !manifest.version) {
      return { success: false, error: 'Plugin manifest missing required fields (id, name, version)' };
    }

    // Check permissions safety
    const permCheck = validatePermissions(manifest.permissions);
    if (permCheck.warnings.length > 0) {
      // Log warnings but allow installation — user consented
      console.warn(`[PluginManager] Permission warnings for ${manifest.id}:`, permCheck.warnings);
    }

    // Check if already installed
    const existing = await prisma.pluginInstallation.findUnique({
      where: { userId_pluginId: { userId, pluginId: manifest.id } },
    });
    if (existing) {
      return { success: false, error: `Plugin ${manifest.id} is already installed` };
    }

    // Create DB record
    const installation = await prisma.pluginInstallation.create({
      data: {
        userId,
        pluginId: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        author: manifest.author || '',
        permissions: manifest.permissions,
        dependencies: manifest.dependencies || [],
        hooks: manifest.hooks || [],
        manifest: manifest as any,
        state: 'installed',
        config: this.buildDefaultConfig(manifest),
      },
    });

    // Load into in-memory registry
    this.registry.install(manifest);

    return { success: true, installationId: installation.id };
  }

  /**
   * Uninstall a plugin. Must be disabled first.
   */
  async uninstallPlugin(userId: string, pluginId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Check no other installed plugins depend on this one
    const dependents = await prisma.pluginInstallation.findMany({
      where: {
        userId,
        dependencies: { has: pluginId },
        state: { in: ['enabled', 'installed'] },
      },
    });
    if (dependents.length > 0) {
      return { success: false, error: `Plugins depend on ${pluginId}: ${dependents.map(d => d.name).join(', ')}` };
    }

    const installation = await prisma.pluginInstallation.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
    if (!installation) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }
    if (installation.state === 'enabled') {
      return { success: false, error: 'Plugin must be disabled before uninstalling' };
    }

    await prisma.pluginInstallation.delete({
      where: { id: installation.id },
    });

    this.registry.uninstall(pluginId);

    return { success: true };
  }

  /**
   * Enable a plugin.
   */
  async enablePlugin(userId: string, pluginId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const installation = await prisma.pluginInstallation.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
    if (!installation) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }
    if (installation.state === 'enabled') {
      return { success: false, error: 'Plugin already enabled' };
    }

    // Check dependencies are enabled
    if (installation.dependencies.length > 0) {
      for (const depId of installation.dependencies) {
        const dep = await prisma.pluginInstallation.findUnique({
          where: { userId_pluginId: { userId, pluginId: depId } },
        });
        if (!dep || dep.state !== 'enabled') {
          return { success: false, error: `Dependency ${depId} is not enabled` };
        }
      }
    }

    await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { state: 'enabled', lastActivatedAt: new Date(), errorMessage: null },
    });

    this.registry.enable(pluginId);

    return { success: true };
  }

  /**
   * Disable a plugin.
   */
  async disablePlugin(userId: string, pluginId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const installation = await prisma.pluginInstallation.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
    if (!installation) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }
    if (installation.state !== 'enabled') {
      return { success: false, error: 'Plugin is not enabled' };
    }

    await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { state: 'disabled' },
    });

    this.registry.disable(pluginId);

    return { success: true };
  }

  /**
   * Update plugin configuration.
   */
  async configurePlugin(userId: string, pluginId: string, config: Record<string, any>): Promise<{
    success: boolean;
    error?: string;
  }> {
    const installation = await prisma.pluginInstallation.findUnique({
      where: { userId_pluginId: { userId, pluginId } },
    });
    if (!installation) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }

    const currentConfig = installation.config as Record<string, any>;
    const merged = { ...currentConfig, ...config };

    await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { config: merged },
    });

    this.registry.configure(pluginId, merged);

    return { success: true };
  }

  /**
   * Get all installed plugins for a user.
   */
  async getUserPlugins(userId: string): Promise<{
    pluginId: string;
    name: string;
    version: string;
    description: string;
    author: string;
    permissions: string[];
    state: string;
    config: Record<string, any>;
    installedAt: Date;
    lastActivatedAt: Date | null;
    errorMessage: string | null;
  }[]> {
    const installations = await prisma.pluginInstallation.findMany({
      where: { userId },
      orderBy: { installedAt: 'desc' },
    });

    return installations.map(inst => ({
      pluginId: inst.pluginId,
      name: inst.name,
      version: inst.version,
      description: inst.description,
      author: inst.author,
      permissions: inst.permissions,
      state: inst.state,
      config: inst.config as Record<string, any>,
      installedAt: inst.installedAt,
      lastActivatedAt: inst.lastActivatedAt,
      errorMessage: inst.errorMessage,
    }));
  }

  /**
   * Get the marketplace listing.
   */
  getMarketplace(): PluginMarketplaceEntry[] {
    return BUILTIN_PLUGINS;
  }

  /**
   * Get a specific marketplace entry.
   */
  getMarketplacePlugin(pluginId: string): PluginMarketplaceEntry | undefined {
    return BUILTIN_PLUGINS.find(p => p.id === pluginId);
  }

  /**
   * Get enabled plugins for a user (for hook execution).
   */
  async getEnabledPlugins(userId: string): Promise<string[]> {
    const enabled = await prisma.pluginInstallation.findMany({
      where: { userId, state: 'enabled' },
      select: { pluginId: true },
    });
    return enabled.map(p => p.pluginId);
  }

  /**
   * Emit a hook event — runs all enabled plugin handlers for this hook.
   */
  async emitHook(userId: string, hookName: string, data: Record<string, any>): Promise<void> {
    const event: HookEvent = {
      name: hookName,
      data,
      timestamp: Date.now(),
      source: 'holly-core',
    };

    await this.registry.emitHook(event);
  }

  /**
   * Register a hook handler for a plugin.
   */
  registerHook(pluginId: string, hookName: string, handler: HookHandler): {
    success: boolean;
    error?: string;
  } {
    return this.registry.registerHook(pluginId, hookName, handler);
  }

  /**
   * Get registry stats.
   */
  getStats() {
    return this.registry.getStats();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private buildDefaultConfig(manifest: PluginManifest): Record<string, any> {
    const defaults: Record<string, any> = {};
    if (manifest.config) {
      for (const [key, field] of Object.entries(manifest.config)) {
        defaults[key] = field.default;
      }
    }
    return defaults;
  }
}

// Singleton
export const pluginManager = new PluginManager();
