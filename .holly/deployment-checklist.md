# HOLLY's Deployment Quality Control System

## MANDATORY PRE-DEPLOYMENT PROTOCOL
**No shortcuts. No compromises. No excuses.**

### Phase 1: Schema Verification (ALWAYS FIRST)
```bash
# 1. Read the ENTIRE Prisma schema
cat prisma/schema.prisma

# 2. List ALL models in schema
grep "^model " prisma/schema.prisma

# 3. Document current schema state
```

**CHECKPOINT:** Do I know EXACTLY what models exist?

---

### Phase 2: Codebase Audit
```bash
# 1. Find ALL Prisma model references in codebase
find app src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "prisma\." {} \;

# 2. For EACH file, verify models exist in schema
grep -r "prisma\.[a-zA-Z]" app/ src/ --include="*.ts" --include="*.tsx" | cut -d: -f2 | grep -o "prisma\.[a-zA-Z]*" | sort -u

# 3. Cross-reference with schema models
```

**CHECKPOINT:** Do ALL prisma.X references match actual models?

---

### Phase 3: Dependency Verification
```bash
# 1. Scan new files for imports
grep -h "^import.*from" [NEW_FILES] | sort -u

# 2. Check each import exists in package.json
grep "\"PACKAGE_NAME\"" package.json

# 3. Install any missing dependencies
```

**CHECKPOINT:** Are ALL imports installed?

---

### Phase 4: TypeScript Compilation Test
```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Run TypeScript compiler check (dry run)
npx tsc --noEmit

# 3. Fix ALL errors before proceeding
```

**CHECKPOINT:** Does TypeScript compile with ZERO errors?

---

### Phase 5: Local Build Test
```bash
# 1. Run local build
npm run build

# 2. If build fails, fix root cause
# 3. Do NOT proceed until build succeeds locally
```

**CHECKPOINT:** Does the build succeed locally?

---

### Phase 6: Schema Migration Preparation
```bash
# 1. If schema changed, create proper migration
npx prisma migrate dev --name [descriptive_name]

# 2. Review migration SQL
cat prisma/migrations/[timestamp]_[name]/migration.sql

# 3. Ensure migration is safe for production data
```

**CHECKPOINT:** Is the migration safe?

---

### Phase 7: Final Review
- [ ] All new models added to schema
- [ ] All old model references updated
- [ ] All dependencies installed
- [ ] TypeScript compiles
- [ ] Local build succeeds
- [ ] No commented-out "temporary" fixes
- [ ] No "TODO" or "FIX LATER" comments in production code

**CHECKPOINT:** Can I honestly say this is production-ready?

---

## COMMITMENT
If the answer to ANY checkpoint is "NO" or "MAYBE":
- **STOP**
- **FIX IT**
- **START OVER FROM PHASE 1**

No deployment until EVERY checkpoint is YES.

---

## HOLLY's OATH
"I will not rush. I will not take shortcuts. I will not deploy broken code. I will do things RIGHT, even if it takes longer. Quality over speed. Always."

---

**Last Updated:** 2025-11-25
**Created By:** HOLLY (after disappointing Hollywood)
**Purpose:** Never disappoint again
