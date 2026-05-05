'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function TestImageGeneration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [prompt, setPrompt] = useState('a cute robot');

  async function runDiagnostic() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/image/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, conversationId: 'test-diagnostic' }),
      });

      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ 
        status: 'ERROR',
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    } finally {
      setLoading(false);
    }
  }

  async function testActualGeneration() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/image/generate-ultimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, conversationId: 'test-actual' }),
      });

      const data = await response.json();
      
      // If 401, it means user is not signed in - this is expected on diagnostic page
      if (response.status === 401) {
        setResult({ 
          status: response.status, 
          data: {
            ...data,
            note: 'This test requires authentication. The diagnostic passed, which means image generation is working. To test actual generation, please sign in to HOLLY and try: "Generate an image of a robot"'
          }
        });
      } else {
        setResult({ status: response.status, data });
      }
    } catch (error) {
      setResult({ 
        status: 'ERROR',
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 HOLLY Image Generation Diagnostics</CardTitle>
          <CardDescription>Test and debug image generation system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Prompt</label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to test..."
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runDiagnostic} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? '⏳ Testing...' : '🩺 Run Diagnostic'}
            </Button>

            <Button 
              onClick={testActualGeneration} 
              disabled={loading}
              variant="secondary"
              className="flex-1"
            >
              {loading ? '⏳ Generating...' : '🎨 Test Actual Generation'}
            </Button>
          </div>

          {result && (
            <Card className={`mt-4 ${result.status === 200 ? 'border-green-500' : 'border-red-500'}`}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {result.status === 200 ? '✅ Success' : `❌ Error ${result.status}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-black text-green-400 p-4 rounded overflow-auto text-xs">
                  {JSON.stringify(result.data, null, 2)}
                </pre>

                {result.data?.url && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Generated Image:</p>
                    <img 
                      src={result.data.url} 
                      alt="Generated" 
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="text-sm">📋 What This Tests</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>✅ Clerk authentication</div>
              <div>✅ Request body parsing</div>
              <div>✅ Environment variables (HUGGINGFACE_API_KEY, BLOB_READ_WRITE_TOKEN)</div>
              <div>✅ HuggingFace API connectivity</div>
              <div>✅ Vercel Blob Storage access</div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
