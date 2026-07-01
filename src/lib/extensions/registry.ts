/**
 * Phase R1: Extension Marketplace — Server-side helpers
 *
 * Shared logic for the marketplace API routes. Keeps the routes themselves
 * thin: parse → auth → call helper → respond.
 *
 * Every helper here is defensive — returns typed errors that the route can
 * translate to HTTP responses.
 */

import { prisma } from '@/lib/db';
import {
  EXTENSION_CATALOG,
  getExtensionById,
  type ExtensionManifest,
  type ExtensionSuite,
} from '@/lib/extensions/catalog';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { requireAdult } from '@/lib/auth/require-adult';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ListedExtension extends ExtensionManifest {
  /** Whether the current user has this installed */
  installed: boolean;
  /** Whether the current user has this installed AND enabled */
  enabled: boolean;
}

export interface InstalledExtension extends ExtensionManifest {
  /** Per-user config blob */
  config: Record<string, unknown>;
  /** Whether the user has this enabled */
  enabled: boolean;
  /** Whether onboarding auto-installed this (vs explicit user action) */
  autoInstalled: boolean;
  /** When the user installed this */
  installedAt: Date;
}

export type InstallResult =
  | { ok: true; extension: ExtensionManifest; alreadyInstalled: boolean }
  | { ok: false; status: 401 | 403 | 404; code: string; message: string };

export type UninstallResult =
  | { ok: true; extension: ExtensionManifest; wasEnabled: boolean }
  | { ok: false; status: 401 | 404; code: string; message: string };

/** @deprecated use InstallResult or UninstallResult */
export type MarketActionResult = InstallResult | UninstallResult;

// ─── Public helpers ───────────────────────────────────────────────────────

/**
 * Get the full catalog with install state overlaid for the current user.
 * This is the primary read path for the marketplace UI.
 *
 * Optional suite filter — if provided, only that suite is returned.
 */
export async function listAvailableExtensions(
  suiteFilter?: ExtensionSuite,
): Promise<{ ok: true; extensions: ListedExtension[] } | { ok: false; status: 401; code: string; message: string }> {
  // Auth — any logged-in user can browse the catalog
  const auth = await authenticateAndLoadUser();
  if (!auth || !auth.userId) {
    return {
      ok: false,
      status: 401,
      code: 'AUTH_REQUIRED',
      message: 'Sign in to browse the marketplace.',
    };
  }

  // Pull the user's installs (if any) for overlay
  let installedMap = new Map<string, { enabled: boolean }>();
  if (auth.dbUserId) {
    try {
      const installs = await prisma.userExtension.findMany({
        where: { userId: auth.dbUserId },
        select: { extensionId: true, enabled: true },
      });
      installedMap = new Map(installs.map((i) => [i.extensionId, { enabled: i.enabled }]));
    } catch (err) {
      // If DB fails, still return the catalog — just without install state
      console.warn('[extensions] listAvailableExtensions: install lookup failed:', err instanceof Error ? err.message : err);
    }
  }

  const filtered = suiteFilter
    ? EXTENSION_CATALOG.filter((e) => e.suite === suiteFilter)
    : EXTENSION_CATALOG;

  const extensions: ListedExtension[] = filtered.map((ext) => {
    const install = installedMap.get(ext.id);
    return {
      ...ext,
      installed: !!install,
      enabled: install?.enabled ?? false,
    };
  });

  return { ok: true, extensions };
}

/**
 * List the current user's installed extensions with full manifest data.
 */
export async function listInstalledExtensions(): Promise<
  | { ok: true; extensions: InstalledExtension[] }
  | { ok: false; status: 401; code: string; message: string }
> {
  const auth = await authenticateAndLoadUser();
  if (!auth || !auth.userId) {
    return {
      ok: false,
      status: 401,
      code: 'AUTH_REQUIRED',
      message: 'Sign in to view your installed extensions.',
    };
  }

  if (!auth.dbUserId) {
    return { ok: true, extensions: [] };
  }

  const rows = await prisma.userExtension.findMany({
    where: { userId: auth.dbUserId },
    orderBy: { installedAt: 'desc' },
  });

  const extensions: InstalledExtension[] = [];
  for (const row of rows) {
    const manifest = getExtensionById(row.extensionId);
    if (!manifest) {
      // Catalog drifted — extension was installed but later removed from catalog.
      // Skip it rather than crash; the uninstall route can clean it up.
      continue;
    }
    extensions.push({
      ...manifest,
      config: (row.config as Record<string, unknown>) ?? {},
      enabled: row.enabled,
      autoInstalled: row.autoInstalled,
      installedAt: row.installedAt,
    });
  }

  return { ok: true, extensions };
}

/**
 * Install an extension for the current user.
 *
 * Rules:
 *   - Must be authenticated.
 *   - Creator bypasses every check (Steve can install anything).
 *   - NSFW extensions require requireAdult() — hard legal gate.
 *   - Premium extensions are currently a no-op (everything free per Steve's directive).
 *   - If already installed, returns `alreadyInstalled: true` without error.
 */
export async function installExtension(extensionId: string): Promise<InstallResult> {
  const manifest = getExtensionById(extensionId);
  if (!manifest) {
    return {
      ok: false,
      status: 404,
      code: 'EXTENSION_NOT_FOUND',
      message: `No extension with id "${extensionId}" in the catalog.`,
    };
  }

  // NSFW extensions use requireAdult() (which calls authenticateAndLoadUser
  // internally + checks isAdult). For non-NSFW, plain authenticateAndLoadUser.
  // This avoids a double auth round-trip on the common path.
  let dbUserId: string | null = null;
  let isCreator = false;

  if (manifest.nsfw) {
    const gate = await requireAdult();
    if (gate instanceof Response) {
      // requireAdult returns NextResponse on failure — bubble up as 403
      return {
        ok: false,
        status: 403,
        code: 'AGE_VERIFICATION_REQUIRED',
        message: 'This extension requires age verification.',
      };
    }
    dbUserId = gate.dbUserId;
    isCreator = gate.isCreator;
  } else {
    const auth = await authenticateAndLoadUser();
    if (!auth || !auth.userId) {
      return {
        ok: false,
        status: 401,
        code: 'AUTH_REQUIRED',
        message: 'Sign in to install extensions.',
      };
    }
    dbUserId = auth.dbUserId;
    isCreator = auth.isCreator;
  }

  // isCreator currently bypasses nothing (everything free) but the flag is
  // reserved for future premium-tier logic. Keep the read so we don't have to
  // refactor when premium extensions ship.
  void isCreator;

  if (!dbUserId) {
    return {
      ok: false,
      status: 401,
      code: 'USER_NOT_FOUND',
      message: 'No user record found.',
    };
  }

  // Idempotent install — if already installed, return success without re-creating
  try {
    const existing = await prisma.userExtension.findUnique({
      where: { userId_extensionId: { userId: dbUserId, extensionId } },
    });
    if (existing) {
      return { ok: true, extension: manifest, alreadyInstalled: true };
    }

    await prisma.userExtension.create({
      data: {
        userId: dbUserId,
        extensionId,
        suite: manifest.suite,
      },
    });
    return { ok: true, extension: manifest, alreadyInstalled: false };
  } catch (err) {
    // P2002 = unique constraint violation (race with concurrent install). Treat as success.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('P2002') || msg.includes('Unique constraint')) {
      return { ok: true, extension: manifest, alreadyInstalled: true };
    }
    throw err;
  }
}

/**
 * Uninstall an extension for the current user. Returns 404 if not installed.
 */
export async function uninstallExtension(extensionId: string): Promise<UninstallResult> {
  const manifest = getExtensionById(extensionId);
  // Even if the catalog entry was removed, allow uninstall by extensionId
  // so users aren't stuck with orphan installs.

  const auth = await authenticateAndLoadUser();
  if (!auth || !auth.userId) {
    return {
      ok: false,
      status: 401,
      code: 'AUTH_REQUIRED',
      message: 'Sign in to manage extensions.',
    };
  }

  if (!auth.dbUserId) {
    return {
      ok: false,
      status: 401,
      code: 'USER_NOT_FOUND',
      message: 'No user record found.',
    };
  }

  const existing = await prisma.userExtension.findUnique({
    where: { userId_extensionId: { userId: auth.dbUserId, extensionId } },
  });

  if (!existing) {
    return {
      ok: false,
      status: 404,
      code: 'NOT_INSTALLED',
      message: `Extension "${extensionId}" is not installed.`,
    };
  }

  await prisma.userExtension.delete({
    where: { id: existing.id },
  });

  // Return the manifest if it still exists, else a stub
  return {
    ok: true,
    extension: manifest ?? {
      id: extensionId,
      suite: existing.suite as ExtensionSuite,
      name: extensionId,
      description: '(removed from catalog)',
      capabilities: [],
      icon: '🗑️',
    },
    wasEnabled: existing.enabled,
  };
}
