function preprocessText(text: string): string {
  let t = text;

  t = t.replace(/→/g, ", then, ");
  t = t.replace(/←/g, ", back to, ");
  t = t.replace(/↑/g, ", up, ");
  t = t.replace(/↓/g, ", down, ");

  t = t.replace(/\bAPI\b/g, "A P I");
  t = t.replace(/\bHTML\b/g, "H T M L");
  t = t.replace(/\bCSS\b/g, "C S S");
  t = t.replace(/\bSQL\b/g, "S Q L");
  t = t.replace(/\bJSON\b/g, "J S O N");
  t = t.replace(/\bURL\b/g, "U R L");
  t = t.replace(/\bAI\b/g, "A I");
  t = t.replace(/\bLLM\b/g, "L L M");

  t = t.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  t = t.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  t = t.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  t = t.replace(/[\u{1F900}-\u{1F9FF}]/gu, "");
  t = t.replace(/[\u{1FA00}-\u{1FA6F}]/gu, "");
  t = t.replace(/[\u{1FA70}-\u{1FAFF}]/gu, "");
  t = t.replace(/[\u{2600}-\u{26FF}]/gu, "");
  t = t.replace(/[\u{2700}-\u{27BF}]/gu, "");

  return t;
}

describe('Voice text preprocessing', () => {
  it('handles arrows correctly (→ becomes "then")', () => {
    const result = preprocessText('Step 1 → Step 2 → Step 3');
    expect(result).toContain('then');
    expect(result).not.toContain('→');
  });

  it('expands abbreviations (API becomes "A P I")', () => {
    const result = preprocessText('Call the API endpoint');
    expect(result).toContain('A P I');
    expect(result).not.toMatch(/\bAPI\b/);
  });

  it('strips emojis', () => {
    const result = preprocessText('Hello 🎉 World 🚀 Test ✅');
    expect(result).not.toMatch(/[\u{1F600}-\u{1F64F}]/u);
    expect(result).not.toMatch(/[\u{1F680}-\u{1F6FF}]/u);
    expect(result).not.toMatch(/[\u{1F300}-\u{1F5FF}]/u);
    expect(result).toContain('Hello');
    expect(result).toContain('World');
    expect(result).toContain('Test');
  });
});
