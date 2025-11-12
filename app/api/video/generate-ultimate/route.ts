import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js'; // MIGRATED TO PRISMA

// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const HF_API = 'https://api-inference.huggingface.co/models';

const MODELS = [
  { id: 'animatediff', name: 'AnimateDiff', endpoint: 'guoyww/animatediff', bestFor: ['animation', 'motion'], quality: 'excellent' },
  { id: 'zeroscope-v2', name: 'Zeroscope v2', endpoint: 'cerspense/zeroscope_v2_576w', bestFor: ['general', 'text-to-video'], quality: 'excellent' },
  { id: 'modelscope', name: 'ModelScope', endpoint: 'damo-vilab/text-to-video-ms-1.7b', bestFor: ['text-to-video', 'creative'], quality: 'great' },
  { id: 'cogvideo', name: 'CogVideo', endpoint: 'THUDM/CogVideo', bestFor: ['high-quality', 'cinematic'], quality: 'excellent' },
  { id: 'lavie', name: 'LaVie', endpoint: 'Vchitect/LaVie', bestFor: ['long-video', 'detailed'], quality: 'great' }
];

function selectModel(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes('animate') || p.includes('animation')) return MODELS.find(m => m.id === 'animatediff') || MODELS[0];
  if (p.includes('cinematic') || p.includes('movie')) return MODELS.find(m => m.id === 'cogvideo') || MODELS[0];
  if (p.includes('long') || p.includes('detailed')) return MODELS.find(m => m.id === 'lavie') || MODELS[0];
  return MODELS[1]; // Zeroscope as default (best general purpose)
}

async function generate(model: any, prompt: string) {
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
    const { prompt, userId, modelPreference } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    
    let model = modelPreference ? MODELS.find(m => m.id === modelPreference) || selectModel(prompt) : selectModel(prompt);
    console.log(`🎬 Generating video with ${model.name} (FREE)`);
    
    let buffer: Buffer;
    
    try {
      buffer = await generate(model, prompt);
    } catch (e) {
      console.error(`❌ ${model.name} failed, trying fallbacks`);
      for (const m of MODELS) {
        try { buffer = await generate(m, prompt); model = m; break; } catch {}
      }
      if (!buffer!) throw new Error('All models failed');
    }
    
    const fileName = `${Date.now()}-${model.id}.mp4`;
    await supabase.storage.from('holly-video').upload(fileName, buffer, { contentType: 'video/mp4' });
    const { data: { publicUrl } } = supabase.storage.from('holly-video').getPublicUrl(fileName);
    
    if (userId) {
      await supabase.from('holly_experiences').insert({
        user_id: userId,
        experience_type: 'video_generation',
        content: prompt,
        metadata: { model: model.name, url: publicUrl, cost: 0, provider: 'huggingface' }
      });
    }
    
    return NextResponse.json({ success: true, url: publicUrl, model: model.name, cost: 0, provider: 'huggingface', allModels: MODELS.map(m => ({ id: m.id, name: m.name, bestFor: m.bestFor })) });
  } catch (error: any) {
    return NextResponse.json({ error: 'Generation failed', details: error.message }, { status: 500 });
  }
}
