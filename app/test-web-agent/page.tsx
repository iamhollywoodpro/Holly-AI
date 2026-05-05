/**
 * Web Agent Test Page
 * Test browser automation capabilities
 */

'use client';

import { useState } from 'react';
import { useWebAgent } from '@/hooks/useWebAgent';

export default function TestWebAgentPage() {
  const {
    sessionId,
    isLoading,
    error,
    createSession,
    closeSession,
    navigate,
    extractText,
    screenshot,
  } = useWebAgent();

  const [testUrl, setTestUrl] = useState('https://example.com');
  const [result, setResult] = useState<any>(null);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);

  const handleCreateSession = async () => {
    try {
      await createSession();
      setResult({ message: 'Session created successfully' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigate = async () => {
    try {
      const res = await navigate(testUrl);
      setResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtractTitle = async () => {
    try {
      const res = await extractText('h1', 'Extract page title');
      setResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScreenshot = async () => {
    try {
      const res = await screenshot(false, 'Take screenshot');
      setResult(res);
      if (res.screenshot) {
        setScreenshotData(res.screenshot);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSession = async () => {
    try {
      await closeSession();
      setResult({ message: 'Session closed successfully' });
      setScreenshotData(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          🤖 Web Agent Test
        </h1>

        {/* Session Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Session Status
          </h2>
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Session ID:</span>{' '}
              {sessionId || 'No active session'}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Status:</span>{' '}
              {isLoading ? 'Loading...' : 'Ready'}
            </p>
            {error && (
              <p className="text-red-600 dark:text-red-400">
                <span className="font-medium">Error:</span> {error}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Controls
          </h2>

          <div className="space-y-4">
            {/* Session Management */}
            <div className="flex gap-2">
              <button
                onClick={handleCreateSession}
                disabled={!!sessionId || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Session
              </button>
              <button
                onClick={handleCloseSession}
                disabled={!sessionId || isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close Session
              </button>
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="Enter URL"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={!sessionId || isLoading}
              />
              <button
                onClick={handleNavigate}
                disabled={!sessionId || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Navigate
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExtractTitle}
                disabled={!sessionId || isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Extract Title
              </button>
              <button
                onClick={handleScreenshot}
                disabled={!sessionId || isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Screenshot
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Result
            </h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm text-gray-900 dark:text-gray-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Screenshot */}
        {screenshotData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Screenshot
            </h2>
            <img
              src={`data:image/png;base64,${screenshotData}`}
              alt="Screenshot"
              className="w-full border border-gray-300 dark:border-gray-600 rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
}
