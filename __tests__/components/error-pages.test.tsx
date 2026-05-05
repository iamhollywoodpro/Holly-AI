import React from 'react';
import ReactDOMServer from 'react-dom/server';

(global as any).React = React;

jest.mock('next/link', () => {
  return ({ children, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', props, children);
});

jest.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => React.createElement('svg', { ...props, 'data-testid': 'alert-triangle' }),
  Home: (props: any) => React.createElement('svg', { ...props, 'data-testid': 'home' }),
  RefreshCw: (props: any) => React.createElement('svg', { ...props, 'data-testid': 'refresh' }),
}));

const GlobalError = require('../../app/error').default;

describe('GlobalError boundary', () => {
  it('renders without crashing', () => {
    const error: Error & { digest?: string } = new Error('Test error');
    error.digest = 'test-digest-123';

    const html = ReactDOMServer.renderToString(
      React.createElement(GlobalError, {
        error,
        reset: jest.fn(),
      })
    );

    expect(html).toContain('Something hit a wrong note');
    expect(html).toContain('Try Again');
    expect(html).toContain('Go Home');
  });
});
