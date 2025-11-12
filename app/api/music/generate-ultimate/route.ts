import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js'; // MIGRATED TO PRISMA

// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const SUNO_API_KEY = process.env.SUNO_API_KEY;
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const HF_API = 'https://api-inference.huggingface.co/models';

// SUNO is PRIMARY, others are FREE alternatives
const MODELS = [
  { id: 'suno', name: 'Suno AI (PRIMARY)', endpoint: 'suno', bestFor: ['professional', 'lyrics', 'full-songs'], quality: 'excellent', provider: 'suno', isPrimary: true },
  { id: 'musicgen', name: 'MusicGen (Meta)', endpoint: 'facebook/musicgen-large', bestFor: ['instrumental', 'background'], quality: 'excellent', provider: 'huggingface' },
  { id: 'riffusion', name: 'Riffusion', endpoint: 'riffusion/riffusion-model-v1', bestFor: ['experimental', 'creative'], quality: 'great', provider: 'huggingface' },
  { id: 'audiocraft', name: 'AudioCraft (Meta)', endpoint: 'facebook/audiogen-medium', bestFor: ['sound-effects', 'ambient'], quality: 'great', provider: 'huggingface' },
  { id: 'audioldm', name: 'AudioLDM', endpoint: 'cvssp/audioldm-l-full', bestFor: ['text-to-audio', 'versatile'], quality: 'great', provider: 'huggingface' }
];

function selectModel(prompt: string, preferPrimary = true) {
  if (preferPrimary && SUNO_API_KEY) return MODELS[0]; // Always use Suno first if available
  
  const p = prompt.toLowerCase();
  if (p.includes('lyrics') || p.includes('song') || p.includes('vocals')) return MODELS.find(m => m.id === 'suno') || MODELS[1];
  if (p.includes('instrumental') || p.includes('background')) return MODELS.find(m => m.id === 'musicgen') || MODELS[1];
  if (p.includes('sound effect') || p.includes('ambient')) return MODELS.find(m => m.id === 'audiocraft') || MODELS[1];
  
  return MODELS[1]; // MusicGen as default free option
}

async function generateWithSuno(prompt: string, lyrics?: string) {
  const res = await fetch('https://api.suno.ai/v1/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SUNO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, lyrics, model: 'chirp-v3' })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.audio_url;
}

async function generateWithHuggingFace(model: any, prompt: string) {
  const res = await fetch(`${HF_API}/${model.endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!res.ok) throw new Error(await res.text());
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, lyrics, userId, modelPreference, preferPrimary = true } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    
    let model = modelPreference ? MODELS.find(m => m.id === modelPreference) || selectModel(prompt, preferPrimary) : selectModel(prompt, preferPrimary);
    console.log(`🎵 Generating music with ${model.name} (${model.provider === 'suno' ? 'PRIMARY' : 'FREE'})`);
    
    let audioUrl: string;
    
    try {
      if (model.provider === 'suno' && SUNO_API_KEY) {
        audioUrl = await generateWithSuno(prompt, lyrics);
      } else {
        const buffer = await generateWithHuggingFace(model, prompt);
        const fileName = `${Date.now()}-${model.id}.mp3`;
        await supabase.storage.from('holly-audio').upload(fileName, buffer, { contentType: 'audio/mpeg' });
        const { data: { publicUrl } } = supabase.storage.from('holly-audio').getPublicUrl(fileName);
        audioUrl = publicUrl;
      }
    } catch (e) {
      console.error(`❌ ${model.name} failed, trying fallbacks`);
      // Try free alternatives if Suno fails
      const fallbackModels = MODELS.filter(m => m.id !== model.id && m.provider === 'huggingface');
      for (const m of fallbackModels) {
        try {
          const buffer = await generateWithHuggingFace(m, prompt);
          const fileName = `${Date.now()}-${m.id}.mp3`;
          await supabase.storage.from('holly-audio').upload(fileName, buffer, { contentType: 'audio/mpeg' });
          const { data: { publicUrl } } = supabase.storage.from('holly-audio').getPublicUrl(fileName);
          audioUrl = publicUrl;
          model = m;
          break;
        } catch {}
      }
      if (!audioUrl!) throw new Error('All models failed');
    }
    
    if (userId) {
      await supabase.from('holly_experiences').insert({
        user_id: userId,
        experience_type: 'music_generation',
        content: prompt,
        metadata: { model: model.name, url: audioUrl, cost: model.provider === 'suno' ? 0.05 : 0, provider: model.provider }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      url: audioUrl, 
      model: model.name, 
      provider: model.provider,
      isPrimary: model.isPrimary || false,
      cost: model.provider === 'suno' ? 0.05 : 0, 
      allModels: MODELS.map(m => ({ id: m.id, name: m.name, bestFor: m.bestFor, isPrimary: m.isPrimary })) 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Generation failed', details: error.message }, { status: 500 });
  }
}
