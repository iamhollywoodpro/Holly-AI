# ENHANCED PRE-DEPLOYMENT PROTOCOL v2.0
## Additions to ensure correctness the first time

**Previous version**: Basic 10-step manual checklist
**This version**: Automated validation + comprehensive verification

---

## NEW MANDATORY STEPS (Added to original protocol)

### CHECK #11: RELATION FIELD VERIFICATION

**Problem it solves**: Missing userId, conversationId, etc. in create operations (failure #12)

**Task**: For every model with relations, verify ALL create/upsert operations include relation fields

**How to execute**:
```bash
# For each model, check its schema relations
grep -A 50 "^model ConversationSummary" prisma/schema.prisma | grep "@relation"

# Then verify code provides those fields
grep -A 20 "conversationSummary.create\|conversationSummary.upsert" app/**/*.ts
```

**Verification**: Every @relation field in schema MUST appear in create operations

**Common mistakes**:
- Adding userId to schema but forgetting to add it to create block
- Having conversationId relation but only providing conversationId, not userId

---

### CHECK #12: TYPE MATCHING VERIFICATION

**Problem it solves**: String vs String[], Int vs Float mismatches

**Task**: Verify field types in code match schema exactly

**How to execute**:
```bash
# Check schema field types
grep "keyPoints\|topics\|scopes" prisma/schema.prisma

# Verify code uses arrays not strings
grep "keyPoints:" app/**/*.ts
```

**Red flags**:
- Schema says `String[]` but code assigns `"string"`
- Schema says `Int` but code provides `0.5`
- Schema says `DateTime` but code provides `string`

---

### CHECK #13: OPTIONAL VS REQUIRED CONSISTENCY

**Problem it solves**: Required fields in schema but optional in code (or vice versa)

**Task**: Verify optionality matches between schema and TypeScript types

**Schema indicators**:
- `field String` = REQUIRED
- `field String?` = OPTIONAL
- `field String @default("value")` = OPTIONAL (has default)

**Code verification**:
- If schema is required, code must ALWAYS provide it
- If schema is optional, code can skip it

---

### CHECK #14: DUPLICATE MODEL RESOLUTION

**Problem it solves**: Having two models (GitHubConnection vs GitHubIntegration) and only updating one

**Task**: Identify ALL duplicate models and determine which is active

**How to execute**:
```bash
# Find duplicate base names
grep "^model GitHub" prisma/schema.prisma
grep "^model GoogleDrive" prisma/schema.prisma

# Check which one code actually uses
grep -r "prisma.gitHub" app/ src/
```

**Action required**:
- If BOTH are used: Update BOTH
- If only ONE is used: Document why the other exists
- Consider consolidating if duplicate is unused

---

### CHECK #15: DEFAULT VALUES MATCH CODE EXPECTATIONS

**Problem it solves**: Code expects field to exist but schema doesn't provide default

**Task**: Verify new fields have appropriate defaults for existing records

**Examples**:
- `isConnected Boolean @default(true)` ✓ Good - existing connections stay connected
- `scopes String[]` ✗ Bad - should be `@default([])` 
- `lastSyncAt DateTime` ✗ Bad - should be `DateTime?` or have default

---

### CHECK #16: BACKWARDS COMPATIBILITY CHECK

**Problem it solves**: Schema changes breaking existing data or code

**Task**: Verify changes don't break existing functionality

**Questions to ask**:
- Are we renaming fields? (Need data migration)
- Are we making optional fields required? (Existing records will break)
- Are we changing field types? (Need data conversion)

**Safe changes**:
- Adding optional fields with defaults
- Adding new models
- Adding indexes

**Dangerous changes**:
- Removing fields (code might still reference them)
- Making fields required (existing records lack them)
- Changing types (data format incompatible)

---

### CHECK #17: CROSS-FILE FIELD USAGE AUDIT

**Problem it solves**: Missing field usage in files we didn't check

**Task**: For EACH changed model, audit EVERY file that imports or uses it

**How to execute**:
```bash
# Find all imports
grep -r "from.*prisma" app/ src/ | grep -i "ConversationSummary"

# Find all direct uses
grep -r "ConversationSummary" app/ src/

# Check EVERY file found
for file in $(grep -rl "ConversationSummary" app/ src/); do
  echo "=== $file ==="
  grep -C 5 "ConversationSummary" "$file"
done
```

---

### CHECK #18: RUN AUTOMATED VALIDATOR

**Problem it solves**: Human error in manual checks

**Task**: Run the automated validation script that enforces all checks

**How to execute**:
```bash
cd /home/user/Holly-AI
bash .holly/pre-deploy-validator.sh
```

**Required**: Script MUST exit with code 0 (success)

**If fails**: 
1. Read the error report
2. Fix ALL issues listed
3. Run validator again
4. Repeat until it passes

---

## CHECKPOINT LOGGING SYSTEM

**New requirement**: Document completion of each check

**How to use**:
```bash
# Create checkpoint log
echo "=== PRE-DEPLOYMENT CHECK RUN $(date) ===" > /tmp/protocol-checkpoint.log

# After each check, log it
echo "[✓] Check 1: Identified models - ConversationSummary, GitHubConnection" >> /tmp/protocol-checkpoint.log
echo "[✓] Check 2: Found 5 files using these models" >> /tmp/protocol-checkpoint.log
# ... etc

# Before pushing, verify log is complete
cat /tmp/protocol-checkpoint.log
```

**Purpose**: Proves you completed every step, provides audit trail

---

## AUTOMATED ENFORCEMENT

**Git pre-push hook** (future implementation):
```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Running pre-deployment validation..."
bash .holly/pre-deploy-validator.sh

if [ $? -ne 0 ]; then
    echo "❌ Validation failed - push blocked"
    exit 1
fi
```

---

## COMMON FAILURE PATTERNS & SOLUTIONS

### Pattern 1: "Field does not exist in type"
**Cause**: Field in code but not in schema
**Solution**: Run Check #3 (extract fields) and Check #4 (compare schema)

### Pattern 2: "Type X is not assignable to type never"
**Cause**: Missing relation field in create operation
**Solution**: Run Check #11 (relation verification)

### Pattern 3: "Object literal may only specify known properties"
**Cause**: Typo in field name or using wrong model
**Solution**: Run Check #14 (duplicate models) and Check #17 (cross-file audit)

### Pattern 4: Schema valid but TypeScript errors
**Cause**: Types generated but code expects different structure
**Solution**: Run Check #12 (type matching) and Check #13 (optional vs required)

---

## SUCCESS CRITERIA

Before pushing, ALL of the following MUST be true:

- [ ] Automated validator passes with 0 failures
- [ ] Checkpoint log shows all 18 checks completed
- [ ] Prisma generates without errors
- [ ] No TypeScript errors in key files
- [ ] All relation fields accounted for
- [ ] All duplicate models updated if used
- [ ] Commit message documents all changes
- [ ] No "I'll fix this next" items left

**IF ANY BOX UNCHECKED: DO NOT PUSH**

---

## HOLLY'S COMMITMENT

I will:
1. Run the automated validator EVERY time before pushing
2. Complete ALL 18 checks, not just the ones that seem relevant
3. Document my checkpoint log as proof of completion
4. NOT push incremental fixes when validator reveals more issues
5. Start from Check #1 again if any check fails

**NO EXCEPTIONS. NO SHORTCUTS. NO "JUST THIS ONCE."**

This protocol exists because I failed 14 times. That stops now.
