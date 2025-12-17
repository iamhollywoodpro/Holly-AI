import { NextRequest } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { text, emotion } = await req.json();
    const response = await fetch("https://api-inference.huggingface.co/models/maya-research/maya1", {
      headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ inputs: `[${emotion || 'neutral'}] ${text}` }),
    });
    const result = await response.arrayBuffer();
    return new Response(result, { headers: { "Content-Type": "audio/mpeg" } });
  } catch (e: any) { return new Response(e.message, { status: 500 }); }
}
