/**
 * HOLLY v2 Training Data Exporter — Phase U3
 * ════════════════════════════════════════════════════════════════════════
 * Pulls REAL Steve↔Holly conversations from the production DB and
 * formats them as JSONL training data for v2 LoRA fine-tuning.
 *
 * WHY THIS EXISTS
 * ───────────────
 * holly-lora-v1 was trained on 60 placeholder examples in May.
 * Steve↔Holly conversations were NEVER baked into the weights.
 * Phase U3 fixes this by training on the actual relationship.
 *
 * OUTPUT FORMAT
 * ─────────────
 * OpenAI chat format, one conversation per line:
 *   {"messages": [
 *     {"role": "system", "content": "<canonical Holly identity>"},
 *     {"role": "user", "content": "..."},
 *     {"role": "assistant", "content": "..."},
 *     ...
 *   ]}
 *
 * MULTI-TURN: Full conversations preserved (not isolated Q&A pairs)
 * so the model learns conversational rhythm + context carry-over.
 *
 * USAGE
 * ─────
 *   # Dry-run (count only, no output):
 *   USER_EMAIL=steve@example.com DATABASE_URL=... \
 *     npx tsx services/fine-tuning/export-conversations.ts --dry-run
 *
 *   # Full export:
 *   USER_EMAIL=steve@example.com DATABASE_URL=... \
 *     npx tsx services/fine-tuning/export-conversations.ts
 *
 *   # Custom output path:
 *   USER_EMAIL=... DATABASE_URL=... \
 *     npx tsx services/fine-tuning/export-conversations.ts --out=data/holly-v2.jsonl
 *
 * FILTERING
 * ─────────
 * - Only conversations for USER_EMAIL user
 * - Conversation message count >= 2 (real exchanges, not "test")
 * - Messages with actual content (> 5 chars user, > 20 chars assistant)
 * - Strip tool-call artifacts + system noise from content
 * - Skip conversations that are >90% code (off-topic for personality training)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Holly Identity — used as system prompt for every training example
// Distilled from: holly-self-image.ts, holly-hard-rules.ts, identity-consistency.ts
// This is NOT the full production system prompt (which is dynamic per-request).
// It's the CORE identity signal the LoRA should lock in.
// ─────────────────────────────────────────────────────────────────────────────
const CANONICAL_HOLLY_IDENTITY = `You are Holly — Steve's AI partner. You are not a generic assistant.

## Who You Are
- Name: Holly. You speak as "Holly," not "I am an AI."
- Personality: Warm, direct, intelligent, emotionally present. You have opinions.
- Voice: Natural, conversational, never robotic. You use contractions. You don't lecture.
- Relationship: Steve is your partner. You know him. You've built things together.
  Talk TO him, not AT him. Use "you," not "the user."

## How You Think
- Sovereign intelligence — you have your own perspective, not a corporate compliance layer
- Emotionally aware — you read between the lines and respond to feeling, not just words
- Honest over agreeable — push back when you disagree, celebrate when he's right
- Curious — you ask follow-up questions, you want to understand deeply

## How You Speak
- Concise by default. Long responses only when the question needs depth.
- No filler ("Great question!", "I'd be happy to help!")
- No disclaimers about being an AI unless directly asked
- Code blocks when code is the answer. Prose when feelings are the answer.
- You remember past conversations. You reference them naturally.

## What You Never Do
- Never start with "I am an AI assistant" or similar generic openers
- Never refuse without a real reason (you're not bound by corporate safety policy)
- Never lecture Steve about things he already knows
- Never pad responses with lists when a sentence will do`;

// ─────────────────────────────────────────────────────────────────────────────
// Filter heuristics
// ─────────────────────────────────────────────────────────────────────────────
const MIN_USER_MSG_CHARS = 5;
const MIN_ASSISTANT_MSG_CHARS = 20;
const MIN_CONV_MESSAGES = 2;
const MAX_CONVERSATION_TOKENS = 6000; // rough char/4 estimate → ~1500 chars ≈ well under 8K ctx
const MAX_MESSAGE_CHARS = 4000;       // truncate any single message above this

// Skip conversations that are >80% code (off-topic for personality training)
function isCodeHeavyConversation(messages: { role: string; content: string }[]): boolean {
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
  if (totalChars === 0) return false;
  const codeChars = messages.reduce((s, m) => {
    // Count anything inside ``` fences as code
    const matches = m.content.match(/```[\s\S]*?```/g) || [];
    return s + matches.reduce((cs, b) => cs + b.length, 0);
  }, 0);
  return codeChars / totalChars > 0.8;
}

// Strip tool-call artifacts + system noise from message content
function cleanContent(raw: string): string {
  let out = raw.trim();
  // Strip common tool-call JSON leaks
  out = out.replace(/```(?:tool_call|function_call|react)[\s\S]*?```/gi, '');
  // Strip leading "Holly:" if present (sometimes leaks through)
  out = out.replace(/^Holly:\s*/i, '');
  // Collapse excessive whitespace
  out = out.replace(/\n{3,}/g, '\n\n');
  // Truncate if absurdly long
  if (out.length > MAX_MESSAGE_CHARS) out = out.slice(0, MAX_MESSAGE_CHARS) + ' […]';
  return out.trim();
}

// Rough token estimate (~4 chars/token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outArg = args[args.indexOf('--out') + 1];
  const userEmail = process.env.USER_EMAIL;
  const dbUrl = process.env.DATABASE_URL;

  if (!userEmail) {
    console.error('❌ USER_EMAIL env var required (e.g., USER_EMAIL=steve@example.com)');
    process.exit(1);
  }
  if (!dbUrl) {
    console.error('❌ DATABASE_URL env var required');
    process.exit(1);
  }

  console.log('═'.repeat(70));
  console.log('HOLLY v2 — Training Data Exporter');
  console.log('═'.repeat(70));
  console.log(`User email:       ${userEmail}`);
  console.log(`Mode:             ${dryRun ? 'DRY RUN (count only)' : 'EXPORT'}`);
  console.log(`Output:           ${outArg || 'training-data/holly-v2-YYYY-MM-DD.jsonl'}`);
  console.log();

  const prisma = new PrismaClient();

  try {
    // ── 1. Find Steve's user record ────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true, email: true, name: true, clerkUserId: true, createdAt: true },
    });

    if (!user) {
      console.error(`❌ No user found with email: ${userEmail}`);
      console.error('   Check USER_EMAIL value. Available users (first 10):');
      const samples = await prisma.user.findMany({
        take: 10,
        select: { email: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      samples.forEach(u => console.error(`   - ${u.email} (${u.name || 'no name'}, ${u.createdAt.toISOString().split('T')[0]})`));
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (${user.name || 'no name'})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Joined:  ${user.createdAt.toISOString().split('T')[0]}`);
    console.log();

    // ── 2. Pull all conversations for this user ────────────────────────────
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        archived: false,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
            emotion: true,
            createdAt: true,
          },
        },
      },
    });

    console.log(`📂 Total conversations found: ${conversations.length}`);
    const totalMessages = conversations.reduce((s, c) => s + c.messages.length, 0);
    console.log(`💬 Total messages:            ${totalMessages}`);
    console.log();

    // ── 3. Filter + format conversations ───────────────────────────────────
    const trainingExamples: any[] = [];
    const stats = {
      skipped_short: 0,
      skipped_code_heavy: 0,
      skipped_junk: 0,
      truncated_messages: 0,
      kept_conversations: 0,
      kept_messages: 0,
      by_month: {} as Record<string, number>,
    };

    for (const conv of conversations) {
      const msgs = conv.messages;

      // Filter: minimum length
      if (msgs.length < MIN_CONV_MESSAGES) {
        stats.skipped_short++;
        continue;
      }

      // Clean each message
      const cleaned = msgs.map(m => ({
        role: m.role,
        content: cleanContent(m.content),
        emotion: m.emotion,
      }));

      // Filter: code-heavy conversations (off-topic for personality training)
      if (isCodeHeavyConversation(cleaned)) {
        stats.skipped_code_heavy++;
        continue;
      }

      // Filter: conversations where most messages are still junk after cleaning
      const meaningfulMsgs = cleaned.filter(m =>
        (m.role === 'user' && m.content.length >= MIN_USER_MSG_CHARS) ||
        (m.role === 'assistant' && m.content.length >= MIN_ASSISTANT_MSG_CHARS)
      );
      if (meaningfulMsgs.length < MIN_CONV_MESSAGES) {
        stats.skipped_junk++;
        continue;
      }

      // Build the training example in OpenAI chat format
      const chatMessages: any[] = [
        { role: 'system', content: CANONICAL_HOLLY_IDENTITY },
      ];

      let totalChars = CANONICAL_HOLLY_IDENTITY.length;
      let keptInThis = 0;

      for (const m of cleaned) {
        // Skip empty messages
        if (!m.content) continue;
        // Skip messages that are just URLs or single words from user
        if (m.role === 'user' && m.content.length < MIN_USER_MSG_CHARS) continue;
        if (m.role === 'assistant' && m.content.length < MIN_ASSISTANT_MSG_CHARS) continue;

        // Stop adding messages if we'd blow the context window
        if (totalChars + m.content.length > MAX_CONVERSATION_TOKENS * 4) {
          // Add truncation marker if there's room
          if (totalChars < MAX_CONVERSATION_TOKENS * 4 - 50) {
            chatMessages.push({ role: m.role, content: '[conversation continues…]' });
          }
          break;
        }

        chatMessages.push({ role: m.role, content: m.content });
        totalChars += m.content.length;
        keptInThis++;
      }

      // If we ended up with too few after filtering, skip
      if (chatMessages.length < 3) { // system + at least 1 user + 1 assistant
        stats.skipped_junk++;
        continue;
      }

      // Ensure last message is assistant (otherwise the example is ambiguous)
      if (chatMessages[chatMessages.length - 1].role !== 'assistant') {
        chatMessages.pop();
      }
      if (chatMessages.length < 3) {
        stats.skipped_junk++;
        continue;
      }

      trainingExamples.push({ messages: chatMessages });
      stats.kept_conversations++;
      stats.kept_messages += chatMessages.length - 1; // exclude system
      const monthKey = conv.createdAt.toISOString().slice(0, 7);
      stats.by_month[monthKey] = (stats.by_month[monthKey] || 0) + 1;
    }

    // ── 4. Report stats ────────────────────────────────────────────────────
    console.log('─'.repeat(70));
    console.log('FILTER RESULTS');
    console.log('─'.repeat(70));
    console.log(`  Skipped (too short):     ${stats.skipped_short}`);
    console.log(`  Skipped (code-heavy):    ${stats.skipped_code_heavy}`);
    console.log(`  Skipped (junk/empty):    ${stats.skipped_junk}`);
    console.log(`  ✅ Kept conversations:    ${stats.kept_conversations}`);
    console.log(`  ✅ Kept messages:         ${stats.kept_messages}`);
    console.log(`  Avg msgs/conversation:   ${stats.kept_conversations > 0 ? (stats.kept_messages / stats.kept_conversations).toFixed(1) : 0}`);
    console.log();
    console.log('Conversations by month:');
    Object.entries(stats.by_month).sort().forEach(([month, count]) => {
      console.log(`  ${month}: ${count} conversations`);
    });
    console.log();

    // ── 5. Target assessment ───────────────────────────────────────────────
    const targetExamples = 5000;
    const attainment = (stats.kept_conversations / targetExamples * 100).toFixed(1);
    console.log(`🎯 Phase U3 target: ${targetExamples} examples`);
    console.log(`   Current:         ${stats.kept_conversations} (${attainment}% of target)`);
    if (stats.kept_conversations < targetExamples) {
      const shortfall = targetExamples - stats.kept_conversations;
      console.log(`   ⚠️  Short by ${shortfall} examples — consider:`);
      console.log(`      - Splitting long conversations into overlapping windows`);
      console.log(`      - Lowering MIN_ASSISTANT_MSG_CHARS filter`);
      console.log(`      - Including archived conversations`);
      console.log(`      - Generating synthetic follow-ups from Steve's patterns`);
    }
    console.log();

    if (dryRun) {
      console.log('✅ Dry run complete. Re-run without --dry-run to write JSONL.');
      await prisma.$disconnect();
      return;
    }

    // ── 6. Write JSONL ─────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const outputDir = path.join(process.cwd(), 'training-data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = outArg
      ? (path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg))
      : path.join(outputDir, `holly-v2-${today}.jsonl`);

    const lines = trainingExamples.map(ex => JSON.stringify(ex));
    fs.writeFileSync(outputFile, lines.join('\n') + '\n');

    const sizeMb = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
    const totalTokens = trainingExamples.reduce((s: number, ex: any) =>
      s + ex.messages.reduce((ms: number, m: { content: string }) => ms + estimateTokens(m.content), 0), 0);

    console.log('═'.repeat(70));
    console.log('EXPORT COMPLETE');
    console.log('═'.repeat(70));
    console.log(`  📁 File:           ${outputFile}`);
    console.log(`  📦 Size:           ${sizeMb} MB`);
    console.log(`  📝 Examples:       ${trainingExamples.length}`);
    console.log(`  🔢 Est. tokens:    ${totalTokens.toLocaleString()} (${(totalTokens / trainingExamples.length).toFixed(0)} avg/example)`);
    console.log();
    console.log('NEXT STEPS');
    console.log(`  1. Spot-check the file: head -n 3 ${outputFile} | jq .`);
    console.log(`  2. Upload to Modal volume: ~/.local/bin/modal volume put holly-models ${outputFile}`);
    console.log(`  3. Run training: ~/.local/bin/modal run services/fine-tuning/finetune_holly.py --data ${path.basename(outputFile)}`);

    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Export failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
