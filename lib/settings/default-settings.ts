// Default HOLLY settings
export interface HollySettings {
  // Appearance
  appearance: {
    theme: 'dark' | 'light' | 'auto';
    colorScheme: 'purple-pink' | 'blue' | 'green' | 'red' | 'custom';
    customColors?: {
      primary: string;
      secondary: string;
    };
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    animations: boolean;
  };

  // Chat Preferences
  chat: {
    autoSpeak: boolean;
    voiceLanguage: string;
    messageGrouping: number; // minutes
    codeTheme: 'github-dark' | 'monokai' | 'nord' | 'dracula';
    markdownStyle: 'default' | 'minimal' | 'rich';
    showTimestamps: boolean;
    enterToSend: boolean;
  };

  // AI Behavior
  ai: {
    responseStyle: 'professional' | 'casual' | 'technical';
    codeComments: 'minimal' | 'standard' | 'detailed';
    autoSave: boolean;
    contextWindow: number; // number of messages
    creativity: number; // 0-1 (temperature)
  };

  // Notifications
  notifications: {
    desktop: boolean;
    sounds: boolean;
    deploymentAlerts: boolean;
    githubWebhooks: boolean;
    buildFailures: boolean;
  };

  // Developer Tools
  developer: {
    debugMode: boolean;
    showApiLogs: boolean;
    performanceMetrics: boolean;
  };

  // Integrations (stored separately in DB, just reference here)
  integrations: {
    github: boolean;
    googleDrive: boolean;
  };
}

export const DEFAULT_SETTINGS: any = {
  // Core identity
  userName: 'Hollywood',
  responseStyle: 'energetic', // Was 'casual' - now MORE personality
  creativityLevel: 0.8, // Was 0.7 - bump up for more personality
  
  // Original settings
  appearance: {
    theme: 'dark',
    colorScheme: 'purple-pink',
    fontSize: 'medium',
    compactMode: false,
    animations: true,
  },
  chat: {
    autoSpeak: false,
    voiceLanguage: 'en-US',
    messageGrouping: 5,
    codeTheme: 'github-dark',
    markdownStyle: 'default',
    showTimestamps: true,
    enterToSend: true,
  },
  ai: {
    responseStyle: 'casual',
    codeComments: 'standard',
    autoSave: true,
    contextWindow: 20,
    creativity: 0.7,
  },
  notifications: {
    desktop: true,
    sounds: true,
    deploymentAlerts: true,
    githubWebhooks: true,
    buildFailures: true,
  },
  developer: {
    debugMode: false,
    showApiLogs: false,
    performanceMetrics: false,
  },
  integrations: {
    github: false,
    googleDrive: false,
  },
};
