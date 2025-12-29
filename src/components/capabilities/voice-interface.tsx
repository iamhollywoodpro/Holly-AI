'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function VoiceInterface() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [transcription, setTranscription] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const transcribeAudio = async (audioFile: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('language', 'en');

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setTranscription(data.transcription.text);
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscription('Transcription failed');
    } finally {
      setLoading(false);
    }
  };

  const speakText = async () => {
    if (!text) return;

    setLoading(true);
    try {
      // Use Gemini TTS TTS
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'holly' }),
      });

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setLoading(false);
    }
  };



  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        transcribeAudio(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      transcribeAudio(file);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🎤 Voice Interface</h2>
          <Badge variant="outline">Whisper + OpenAI TTS</Badge>
        </div>

        <Tabs defaultValue="speak">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="speak">Text-to-Speech</TabsTrigger>
            <TabsTrigger value="transcribe">Speech-to-Text</TabsTrigger>
          </TabsList>

          <TabsContent value="speak" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Text to Speak</label>
              <Input
                placeholder="Enter text for HOLLY to speak..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Voice</label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                  <SelectItem value="echo">Echo (Male)</SelectItem>
                  <SelectItem value="fable">Fable (British)</SelectItem>
                  <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                  <SelectItem value="nova">Nova (Female)</SelectItem>
                  <SelectItem value="shimmer">Shimmer (Soft)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={speakText} disabled={loading || !text} className="w-full">
              Generate Speech
            </Button>

            {audioUrl && (
              <Card className="p-4">
                <audio controls src={audioUrl} className="w-full" />
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcribe" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={recording ? stopRecording : startRecording}
                variant={recording ? 'destructive' : 'default'}
              >
                {recording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                📁 Upload Audio
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {loading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {transcription && (
              <Card className="p-4 bg-muted">
                <h3 className="font-semibold mb-2">Transcription:</h3>
                <p className="text-sm">{transcription}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
