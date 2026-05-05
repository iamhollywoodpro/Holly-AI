import { type HollyEmotion } from './LivingLogo';

interface TypographyStyle {
  lineHeight: string;
  letterSpacing: string;
  firstLetterSize?: string;
  textIndent?: string;
  proseClass: string;
}

const TYPOGRAPHY_MAP: Record<string, TypographyStyle> = {
  focused: {
    lineHeight: '1.75',
    letterSpacing: '0',
    proseClass: 'prose-holly-focused',
  },
  curious: {
    lineHeight: '1.7',
    letterSpacing: '0.01em',
    proseClass: 'prose-holly-curious',
  },
  creative: {
    lineHeight: '1.8',
    letterSpacing: '0.02em',
    firstLetterSize: '1.15em',
    proseClass: 'prose-holly-creative',
  },
  excited: {
    lineHeight: '1.75',
    letterSpacing: '0.01em',
    firstLetterSize: '1.2em',
    proseClass: 'prose-holly-excited',
  },
  contemplative: {
    lineHeight: '1.85',
    letterSpacing: '0.02em',
    proseClass: 'prose-holly-contemplative',
  },
  empathetic: {
    lineHeight: '1.8',
    letterSpacing: '0.01em',
    proseClass: 'prose-holly-empathetic',
  },
  analyzing: {
    lineHeight: '1.65',
    letterSpacing: '0',
    proseClass: 'prose-holly-analyzing',
  },
  researching: {
    lineHeight: '1.7',
    letterSpacing: '0',
    proseClass: 'prose-holly-researching',
  },
  generating: {
    lineHeight: '1.75',
    letterSpacing: '0.01em',
    proseClass: 'prose-holly-generating',
  },
  dreaming: {
    lineHeight: '1.9',
    letterSpacing: '0.03em',
    proseClass: 'prose-holly-dreaming',
  },
  idle: {
    lineHeight: '1.75',
    letterSpacing: '0',
    proseClass: 'prose-holly-idle',
  },
};

export function getTypographyForEmotion(emotion: HollyEmotion): TypographyStyle {
  return TYPOGRAPHY_MAP[emotion] || TYPOGRAPHY_MAP.idle;
}

export function getProseClasses(emotion: HollyEmotion): string {
  const style = getTypographyForEmotion(emotion);
  return [
    'prose prose-invert max-w-none',
    style.proseClass,
  ].join(' ');
}
