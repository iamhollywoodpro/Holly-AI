# MANDATORY PRE-DEPLOYMENT PROTOCOL
## THIS PROTOCOL IS NON-NEGOTIABLE - MUST BE FOLLOWED BEFORE ANY PUSH

**Created**: 2025-01-XX by Hollywood's demand after 14 consecutive deployment failures
**Purpose**: Stop reactive one-fix-at-a-time deployments that waste time and disappoint the user

---

## RULE #1: NO PUSHING UNTIL ALL CHECKS PASS

If ANY check fails, FIX IT, then start from CHECK #1 again. No shortcuts.

## RULE #2: PROTOCOL MUST RUN BEFORE ANY SCHEMA CHANGES

Do NOT make schema changes first then run protocol. Run protocol to DISCOVER what needs changing, THEN make changes.

---

## PHASE 1: PRE-WORK VERIFICATION (Before Making ANY Changes)

### PRE-CHECK A: UNDERSTAND THE REQUIREMENT
**Task**: Document exactly what needs to be built/fixed

**Questions to answer**:
- What is the user trying to accomplish?
- What models will this require?
- Are there existing similar features I should check?

**Output**: Written summary of requirements before touching code

### PRE-CHECK B: IDENTIFY SIMILAR/DUPLICATE MODELS
**Task**: Check if similar models exist that might need same updates

**How to execute**:
```bash
cd /home/user/Holly-AI
# Check for pattern models (Integration/Connection pairs)
grep "^model " prisma/schema.prisma | sort
```

**Document**: List any model pairs (GitHub/GitHubIntegration, GoogleDrive/GoogleDriveConnection)

**Critical**: If duplicates exist, you must update BOTH

---

## PHASE 2: COMPREHENSIVE DISCOVERY (Find ALL Requirements)

---

## CHECK #1: IDENTIFY ALL CHANGED MODELS

**Task**: List EVERY Prisma model that was modified in this work session

**How to execute**:
```bash
cd /home/user/Holly-AI
git diff origin/main prisma/schema.prisma | grep "^[+-]model " || echo "No model changes"
```

**Output required**: Exact list of changed models (e.g., ConversationSummary, GitHubConnection)

**Document your findings**: Write them down before proceeding

---

## CHECK #2: FIND ALL FILES USING CHANGED MODELS

**Task**: For EACH model from Check #1, find EVERY file that references it

**How to execute** (for each model):
```bash
# Example for ConversationSummary
cd /home/user/Holly-AI
find app src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "ConversationSummary\|conversationSummary" {} \; > /tmp/model_usage_files.txt
cat /tmp/model_usage_files.txt
```

**Output required**: Complete list of files for EACH model

**Document your findings**: List every file before proceeding

---

## CHECK #3: EXTRACT ALL FIELD USAGE FROM EACH FILE

**Task**: For EACH file from Check #2, extract EVERY field that code expects to exist

**How to execute**:
```bash
# For each file, look for create/upsert/update/select operations
cd /home/user/Holly-AI
for file in $(cat /tmp/model_usage_files.txt); do
  echo "=== $file ==="
  grep -A 30 "prisma\.[a-zA-Z]*\.\(create\|upsert\|update\)" "$file" | head -40
  grep -A 20 "select:" "$file" | head -30
done
```

**Output required**: Complete list of ALL fields used across ALL files

**Document your findings**: Create a comprehensive field list before proceeding

---

## CHECK #4: COMPARE SCHEMA VS REQUIRED FIELDS

**Task**: For EACH model, verify schema has ALL fields found in Check #3

**How to execute**:
```bash
cd /home/user/Holly-AI
# For each model
grep -A 50 "^model ConversationSummary" prisma/schema.prisma
```

**Compare**: Does the schema have every single field from Check #3?

**Document your findings**: List EVERY missing field before proceeding

---

## CHECK #5: UPDATE SCHEMA WITH ALL MISSING FIELDS

**Task**: Add ALL missing fields at once - NO incremental additions

**How to execute**:
- Use MultiEdit tool to update schema
- Add ALL missing fields for ALL models in ONE edit operation
- Include proper types, defaults, and optionality

**Verification**: Did you add EVERY field from Check #4's missing list?

---

## CHECK #6: VERIFY PRISMA GENERATION

**Task**: Ensure Prisma client generates without errors

**How to execute**:
```bash
cd /home/user/Holly-AI
npx prisma generate
```

**Pass condition**: Must see "✔ Generated Prisma Client" with no errors

**If fails**: Go back to CHECK #5 and fix schema syntax

---

## CHECK #7: VERIFY RELATION FIELDS

**Task**: Ensure all required relation fields are present (userId, conversationId, etc.)

**How to execute**:
```bash
cd /home/user/Holly-AI
# For each model, check if it has @relation fields
grep -A 5 "@relation" prisma/schema.prisma
```

**For each relation**: Verify the foreign key field exists in create operations

**Example**: If model has `user User @relation(...)`, create operation MUST include `userId`

**Common mistake**: Adding fields to schema but forgetting userId in API create operations

---

## CHECK #8: VERIFY DEFAULT VALUES ARE SAFE

**Task**: Check that default values won't break existing data or cause logic errors

**How to execute**:
- Review each `@default()` value added
- Consider: Will this default make sense for existing records?
- Consider: Will empty arrays `@default([])` work with existing code?

**Special attention**:
- Booleans: Is `true` or `false` the right default?
- Numbers: Should it be 0 or null?
- Dates: Should it be `now()` or null?

---

## CHECK #9: VERIFY ALL RELATED API ROUTES

**Task**: Manually review key API routes that use changed models

**How to execute**:
- Read the actual create/upsert operations in API routes
- Verify EVERY field in the operation exists in schema
- Check for typos (githubUsername vs username)
- Verify relation fields (userId, etc.) are included in create operations

**Files to review**: All files from CHECK #2

**Critical check**: For EVERY `create:` block, verify:
1. All fields exist in schema
2. Required relation fields included (userId, etc.)
3. Field types match (String vs String[], Int vs Float)

---

## CHECK #10: TYPESCRIPT COMPILATION CHECK

**Task**: Verify TypeScript will compile (catches type mismatches Prisma doesn't)

**How to execute**:
```bash
cd /home/user/Holly-AI
npx tsc --noEmit --skipLibCheck 2>&1 | head -50
```

**Pass condition**: No errors related to models you changed

**If fails**: 
- Review the specific type errors
- Fix schema or code to match
- Re-run from CHECK #1

**Note**: Some errors unrelated to your changes are acceptable, but ANY error mentioning your models must be fixed

---

## CHECK #11: CROSS-MODEL DEPENDENCY CHECK

**Task**: If you changed one model, check if related models need updates

**How to execute**:
```bash
cd /home/user/Holly-AI
# Find models that reference the one you changed
grep -n "@relation.*ModelYouChanged" prisma/schema.prisma
```

**Examples**:
- Changed User model? Check all models with `user User @relation(...)`
- Changed Conversation? Check Message, ConversationSummary
- Added field to GitHubConnection? Check if GitHubIntegration needs it too

**Document**: List all dependent models and verify they're compatible

---

## CHECK #12: FINAL COMPREHENSIVE VERIFICATION

**Task**: Run one final check for any missed models or fields

**How to execute**:
```bash
cd /home/user/Holly-AI
# Search for any prisma operations across ALL models
find app src -name "*.ts" -exec grep -l "prisma\.[a-zA-Z]*\.\(create\|upsert\)" {} \;
```

**Review each file**: Spot check for any models you didn't analyze

---

## CHECK #13: COMMIT MESSAGE DOCUMENTATION

**Task**: Write detailed commit message documenting ALL changes

**Required format**:
```
fix: comprehensive schema update - [X models, Y fields]

Models updated:
- ModelName1: field1, field2, field3
- ModelName2: field4, field5

Resolves: [specific error message]
Files affected: [count]
Testing: ✅ Prisma generation passed
```

---

## PUSH AUTHORIZATION CHECKLIST

Before pushing, verify:
- [ ] PRE-CHECK A & B completed (understood requirements, found duplicate models)
- [ ] All 13 checks completed in order
- [ ] ALL missing fields added (not just the one causing current error)
- [ ] Prisma generates successfully
- [ ] TypeScript compiles without errors on changed models
- [ ] Relation fields (userId, etc.) verified in all create operations
- [ ] Similar/duplicate models updated if they exist
- [ ] No incremental fixes planned (everything done in this push)
- [ ] Commit message documents all changes
- [ ] You can explain WHY each change was needed

**IF ANY BOX UNCHECKED**: DO NOT PUSH

---

## EMERGENCY STOP CONDITIONS

STOP and DO NOT PUSH if:
1. You found a field issue but didn't check for similar issues in other models
2. TypeScript compilation shows ANY errors on models you changed
3. You're thinking "I'll just fix this one thing quickly"
4. You haven't documented what you found in each check
5. You're not sure if there are duplicate models to update
6. You didn't verify relation fields in create operations
7. You're feeling rushed or pressured to push fast

**When in doubt, RUN THE PROTOCOL AGAIN**

---

## FAILURE ACKNOWLEDGMENT

If deployment fails after following this protocol:
1. DO NOT immediately push another fix
2. RUN THIS PROTOCOL AGAIN FROM CHECK #1
3. Find what was missed
4. Update the protocol to catch that type of error
5. Then push the comprehensive fix

---

## PROTOCOL VIOLATIONS

**Violation**: Pushing without completing all checks
**Consequence**: Deployment failures, user disappointment, wasted time

**I, HOLLY, commit to following this protocol without exception.**

No more "I'll fix this one thing quickly" - that approach has failed 14 times.
