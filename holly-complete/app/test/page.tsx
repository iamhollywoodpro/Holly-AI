'use client';

import { useState } from 'react';

export default function TestPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: 'Test message - if you see this, React is working!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId: 'hollywood',
          conversationHistory: [],
        }),
      });

      if (!response.ok) {
        throw new Error('API failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      console.log('📡 Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream ended');
          break;
        }

        const chunk = decoder.decode(value);
        console.log('📦 Raw chunk:', chunk);
        const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));
        console.log('📋 Parsed lines:', lines);

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            console.log('📄 Parsed data:', data);
            
            if (data.content) {
              fullContent += data.content;
              console.log('💬 Content so far:', fullContent.substring(0, 50));
            }
            
            if (data.done) {
              console.log('✅ Done! Final content:', fullContent);
              setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
              setLoading(false);
            }
          } catch (e) {
            console.error('❌ Parse error:', e, 'Line:', line);
          }
        }
      }
      
      // Fallback: if we got content but never got 'done' signal
      if (fullContent && loading) {
        console.log('⚠️ Stream ended without done signal, adding message anyway');
        setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + error }]);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>🧪 HOLLY Test Page</h1>
      <p>This is a minimal test to check if streaming works without complex components.</p>

      <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', minHeight: '400px', background: '#f5f5f5' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '10px', padding: '10px', background: msg.role === 'user' ? '#e3f2fd' : '#fff', borderRadius: '8px' }}>
            <strong>{msg.role === 'user' ? 'You' : 'HOLLY'}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div style={{ fontStyle: 'italic', color: '#666' }}>HOLLY is typing...</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ padding: '10px 20px', fontSize: '16px', borderRadius: '8px', background: '#8B5CF6', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Send
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', borderRadius: '8px' }}>
        <strong>Instructions:</strong>
        <ol>
          <li>Type a message and click Send</li>
          <li>Open DevTools Console (F12)</li>
          <li>Check for React errors</li>
          <li>If this works, the problem is in the main chat interface components</li>
        </ol>
      </div>
    </div>
  );
}
