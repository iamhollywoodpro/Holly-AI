/**
 * HOLLY USER PREFERENCES MANAGER
 * 
 * Manages user preferences and settings for personalized experience
 * 
 * Uses: UserPreferences (Prisma model)
 * 
 * ACTUAL PRISMA FIELDS (VERIFIED):
 * - id, userId, clerkUserId (String, unique)
 * - theme, language, timezone, dateFormat, timeFormat
 * - dashboardLayout (Json?), pinnedFeatures, hiddenFeatures, favoritePages (String[])
 * - emailNotifications, pushNotifications (Boolean), notificationFrequency (String)
 * - contentTypes, interests, categories (String[])
 * - betaFeatures, experimentalUI (Boolean)
 * - personalizationScore (Float), lastPersonalizedAt (DateTime?)
 * - createdAt, updatedAt
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface PreferenceUpdates {
  // UI Preferences
  theme?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  
  // Dashboard Layout
  dashboardLayout?: Record<string, any>;
  pinnedFeatures?: string[];
  hiddenFeatures?: string[];
  favoritePages?: string[];
  
  // Notifications
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  notificationFrequency?: string;
  
  // Content Preferences
  contentTypes?: string[];
  interests?: string[];
  categories?: string[];
  
  // Feature Flags
  betaFeatures?: boolean;
  experimentalUI?: boolean;
}

export interface UserPreferencesData {
  id: string;
  clerkUserId: string;
  theme: string;
  language: string;
  timezone?: string;
  dateFormat: string;
  timeFormat: string;
  dashboardLayout?: Record<string, any>;
  pinnedFeatures: string[];
  hiddenFeatures: string[];
  favoritePages: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: string;
  contentTypes: string[];
  interests: string[];
  categories: string[];
  betaFeatures: boolean;
  experimentalUI: boolean;
  personalizationScore: number;
  lastPersonalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ================== USER PREFERENCES MANAGER ==================

/**
 * Get user preferences (creates if doesn't exist)
 */
export async function getUserPreferences(clerkUserId: string): Promise<UserPreferencesData | null> {
  try {
    let preferences = await prisma.userPreferences.findUnique({
      where: { clerkUserId }
    });

    // Create if doesn't exist
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: clerkUserId, // Using clerkUserId as userId
          clerkUserId
        }
      });
    }

    return {
      id: preferences.id,
      clerkUserId: preferences.clerkUserId,
      theme: preferences.theme,
      language: preferences.language,
      timezone: preferences.timezone || undefined,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      dashboardLayout: preferences.dashboardLayout ? (preferences.dashboardLayout as Record<string, any>) : undefined,
      pinnedFeatures: preferences.pinnedFeatures,
      hiddenFeatures: preferences.hiddenFeatures,
      favoritePages: preferences.favoritePages,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      notificationFrequency: preferences.notificationFrequency,
      contentTypes: preferences.contentTypes,
      interests: preferences.interests,
      categories: preferences.categories,
      betaFeatures: preferences.betaFeatures,
      experimentalUI: preferences.experimentalUI,
      personalizationScore: preferences.personalizationScore,
      lastPersonalizedAt: preferences.lastPersonalizedAt || undefined,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  clerkUserId: string,
  updates: PreferenceUpdates
): Promise<{ success: boolean; preferences?: UserPreferencesData; error?: string }> {
  try {
    // Ensure preferences exist
    await getUserPreferences(clerkUserId);

    const updated = await prisma.userPreferences.update({
      where: { clerkUserId },
      data: {
        ...updates,
        dashboardLayout: updates.dashboardLayout || undefined,
        lastPersonalizedAt: new Date()
      }
    });

    return {
      success: true,
      preferences: {
        id: updated.id,
        clerkUserId: updated.clerkUserId,
        theme: updated.theme,
        language: updated.language,
        timezone: updated.timezone || undefined,
        dateFormat: updated.dateFormat,
        timeFormat: updated.timeFormat,
        dashboardLayout: updated.dashboardLayout ? (updated.dashboardLayout as Record<string, any>) : undefined,
        pinnedFeatures: updated.pinnedFeatures,
        hiddenFeatures: updated.hiddenFeatures,
        favoritePages: updated.favoritePages,
        emailNotifications: updated.emailNotifications,
        pushNotifications: updated.pushNotifications,
        notificationFrequency: updated.notificationFrequency,
        contentTypes: updated.contentTypes,
        interests: updated.interests,
        categories: updated.categories,
        betaFeatures: updated.betaFeatures,
        experimentalUI: updated.experimentalUI,
        personalizationScore: updated.personalizationScore,
        lastPersonalizedAt: updated.lastPersonalizedAt || undefined,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    };
  } catch (error) {
    console.error('Error updating preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset preferences to defaults
 */
export async function resetPreferences(clerkUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.userPreferences.update({
      where: { clerkUserId },
      data: {
        theme: 'system',
        language: 'en',
        timezone: null,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        dashboardLayout: null,
        pinnedFeatures: [],
        hiddenFeatures: [],
        favoritePages: [],
        emailNotifications: true,
        pushNotifications: true,
        notificationFrequency: 'real_time',
        contentTypes: [],
        interests: [],
        categories: [],
        betaFeatures: false,
        experimentalUI: false
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error resetting preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get preferences by category
 */
export async function getPreferencesByCategory(
  clerkUserId: string,
  category: 'ui' | 'dashboard' | 'notifications' | 'content' | 'features'
): Promise<Record<string, any> | null> {
  try {
    const preferences = await getUserPreferences(clerkUserId);
    if (!preferences) return null;

    switch (category) {
      case 'ui':
        return {
          theme: preferences.theme,
          language: preferences.language,
          timezone: preferences.timezone,
          dateFormat: preferences.dateFormat,
          timeFormat: preferences.timeFormat
        };
      
      case 'dashboard':
        return {
          dashboardLayout: preferences.dashboardLayout,
          pinnedFeatures: preferences.pinnedFeatures,
          hiddenFeatures: preferences.hiddenFeatures,
          favoritePages: preferences.favoritePages
        };
      
      case 'notifications':
        return {
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          notificationFrequency: preferences.notificationFrequency
        };
      
      case 'content':
        return {
          contentTypes: preferences.contentTypes,
          interests: preferences.interests,
          categories: preferences.categories
        };
      
      case 'features':
        return {
          betaFeatures: preferences.betaFeatures,
          experimentalUI: preferences.experimentalUI
        };
      
      default:
        return null;
    }
  } catch (error) {
    console.error('Error getting preferences by category:', error);
    return null;
  }
}
