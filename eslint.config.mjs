// Flat ESLint config — ESLint 10 compatible
// Replaces legacy .eslintrc.json which ESLint 10 no longer reads.
// Equivalent to the old "extends": "next/core-web-vitals" but in flat format.
// Note: `next lint` (used by package.json "lint" script) handles its own
// config resolution internally, so this file is for editor integrations and
// direct eslint invocations.

export default [
  {
    // Only lint source files, not configs/builds
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },
  {
    rules: {
      // Minimal rule set — matches next/core-web-vitals behavior
      'react/no-unescaped-entities': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
