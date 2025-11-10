import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const HF_API = 'https://api-inference.huggingface.co/models';

const MODELS = [
  { id: 'flux-schnell', name: 'FLUX.1-schnell', endpoint: 'black-forest-labs/FLUX.1-schnell', bestFor: ['general', 'fast'], quality: 'excellent' },
  { id: 'flux-dev', name: 'FLUX.1-dev', endpoint: 'black-forest-labs/FLUX.1-dev', bestFor: ['quality', 'detailed'], quality: 'excellent' },
  { id: 'sdxl', name: 'SDXL', endpoint: 'stabilityai/stable-diffusion-xl-base-1.0', bestFor: ['artistic'], quality: 'excellent' },
  { id: 'sdxl-turbo', name: 'SDXL Turbo', endpoint: 'stabilityai/sdxl-turbo', bestFor: ['fast'], quality: 'great' },
  { id: 'playground', name: 'Playground', endpoint: 'playgroundai/playground-v2.5-1024px-aesthetic', bestFor: ['anime'], quality: 'excellent' },
  { id: 'animagine', name: 'Animagine XL', endpoint: 'cagliostrolab/animagine-xl-3.1', bestFor: ['anime'], quality: 'excellent' },
  { id: 'realistic', name: 'Realistic Vision', endpoint: 'SG161222/Realistic_Vision_V6.0_B1_noVAE', bestFor: ['photorealism'], quality: 'excellent' },
  { id: 'proteus', name: 'Proteus', endpoint: 'dataautogpt3/ProteusV0.4', bestFor: ['3d'], quality: 'great' }
];

function selectModel(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes('anime') || p.includes('manga')) return MODELS.find(m => m.id === 'animagine') || MODELS[0];
  if (p.includes('realistic') || p.includes('photo')) return MODELS.find(m => m.id === 'realistic') || MODELS[0];
  if (p.includes('3d') || p.includes('render')) return MODELS.find(m => m.id === 'proteus') || MODELS[0];
  return MODELS[0];
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
    let buffer: Buffer;
    
    try {
      buffer = await generate(model, prompt);
    } catch (e) {
      for (const m of MODELS) {
        try { buffer = await generate(m, prompt); model = m; break; } catch {}
      }
      if (!buffer!) throw new Error('All models failed');
    }
    
    const fileName = `${Date.now()}-${model.id}.png`;
    await supabase.storage.from('holly-images').upload(fileName, buffer, { contentType: 'image/png' });
    const { data: { publicUrl } } = supabase.storage.from('holly-images').getPublicUrl(fileName);
    
    if (userId) {
      await supabase.from('holly_experiences').insert({
        user_id: userId,
        experience_type: 'image_generation',
        content: prompt,
        metadata: { model: model.name, url: publicUrl, cost: 0, provider: 'huggingface' }
      });
    }
    
    return NextResponse.json({ success: true, url: publicUrl, model: model.name, cost: 0, provider: 'huggingface', allModels: MODELS.map(m => ({ id: m.id, name: m.name, bestFor: m.bestFor })) });
  } catch (error: any) {
    return NextResponse.json({ error: 'Generation failed', details: error.message }, { status: 500 });
  }
}
