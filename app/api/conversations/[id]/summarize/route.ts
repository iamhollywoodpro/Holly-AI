import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ summary: "Conversation history analyzed." });
}
