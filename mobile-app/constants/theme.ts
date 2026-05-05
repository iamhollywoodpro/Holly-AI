export const Colors = {
  background: '#0a060e',
  surface: '#13101a',
  surfaceLight: '#1c1726',
  border: '#2a2335',
  text: '#f0ecf4',
  textSecondary: '#8a8494',
  textMuted: '#5c566a',
  cyan: '#22d3ee',
  cyanDark: '#0e7490',
  purple: '#9d25f4',
  purpleDark: '#6b1fa8',
  pink: '#ec4899',
  pinkDark: '#9d174d',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  userBubble: '#1a1028',
  hollyBubble: '#0f0d18',
};

export const Gradients = {
  primary: ['#9d25f4', '#22d3ee'] as const,
  warm: ['#ec4899', '#9d25f4'] as const,
  cool: ['#22d3ee', '#9d25f4'] as const,
  surface: ['#13101a', '#0a060e'] as const,
};

export const Typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: Colors.text },
  heading: { fontSize: 22, fontWeight: '600' as const, color: Colors.text },
  subheading: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: Colors.text },
  caption: { fontSize: 14, fontWeight: '400' as const, color: Colors.textSecondary },
  small: { fontSize: 12, fontWeight: '400' as const, color: Colors.textMuted },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
