# HOLLY Deployment Protocol V2
## Systematic Pre-Deployment Validation

**Status**: MANDATORY  
**Created**: 2025-11-25  
**Reason**: After 33+ failed deployments, we needed a systematic approach

---

## Quick Start

```bash
# ALWAYS run before deployment
npm run pre-deploy

# If it passes (exit code 0), deploy
git add .
git commit -m "your message"
git push origin main

# Optional: Run full local build test
npm run safe-deploy
```

---

## Protocol Steps

### 1. Run TypeScript Scanner
```bash
npm run scan
```

**What it checks**:
- ✅ Prisma model references (prisma.modelName exists)
- ✅ Prisma unique field usage (findUnique uses correct fields)
- ✅ Import/export consistency
- ✅ Type definitions

**Exit code 0** = PASS, continue to step 2  
**Exit code 1** = FAIL, fix errors before proceeding

### 2. Validate Prisma Schema
```bash
npx prisma validate
```

**What it checks**:
- ✅ Schema syntax is valid
- ✅ Relations are correctly defined
- ✅ Field types are valid

**No errors** = PASS, safe to deploy  
**Errors shown** = FAIL, fix schema

### 3. Review Changes
```bash
git status
git diff
```

**Verify**:
- ✅ Only intended files are changed
- ✅ No accidental deletions
- ✅ Schema changes match code changes

### 4. Commit and Deploy
```bash
git add .
git commit -m "descriptive message"
git push origin main
```

**Watch Vercel deployment**:
- Monitor build logs
- Check for TypeScript errors
- Verify deployment success

---

## What Changed from V1

### Before (Manual Protocol)
- ❌ Created protocols but didn't follow them
- ❌ Reactive fixes after deployment failures
- ❌ No systematic validation
- ❌ Result: 33+ failed deployments

### After (Automated Validation)
- ✅ Scanner built into codebase
- ✅ npm scripts enforce validation
- ✅ Catches issues before deployment
- ✅ CI/CD compatible with exit codes

---

## Emergency: What If Scanner Fails?

If `npm run scan` exits with code 1:

### Step 1: Read the Error Output
The scanner will show:
```
❌ ERRORS (X):

1. path/to/file.ts:123
   Error description
   Code snippet
```

### Step 2: Common Fixes

**Error: "Non-existent Prisma model: prisma.modelName"**
- Check if model exists in `prisma/schema.prisma`
- Verify PascalCase in schema converts to camelCase in code
  - `model User` → `prisma.user` ✅
  - `model DownloadLink` → `prisma.downloadLink` ✅

**Error: "Field 'X' is not a unique field in model 'Y'"**
- Check the model definition in schema
- Valid unique fields are:
  - `id` (always unique by default)
  - Fields with `@unique` attribute
  - Fields in `@@unique([field1, field2])` compound keys
- Change `findUnique({ where: { wrongField } })` to use correct field

### Step 3: Fix and Re-run
```bash
# After fixing
npm run scan

# Should show
✅ BUILD SAFE: No critical errors detected
```

---

## Integration with GitHub Actions (Future)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  validate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run validation
        run: npm run pre-deploy
        
      - name: Deploy to Vercel
        if: success()
        run: vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## Scanner Maintenance

The scanner is located at `.holly/tools/typescript-scanner.js`.

### When to Update Scanner

1. **New Prisma patterns added** - Update regex patterns
2. **False positives** - Add exclusion rules
3. **New validation needs** - Add new check functions

### Testing Scanner Changes

```bash
# Test on full codebase
npm run scan

# Should complete in < 1 second
# Should show 0 errors for valid code
```

---

## Success Metrics

**Before Scanner** (Deployments #1-#33):
- 33 consecutive failures
- Average 2-3 fixes per deployment
- Manual scanning missed issues
- Protocols created but ignored

**After Scanner** (Deployment #34+):
- Systematic validation
- Issues caught before deployment
- Reduced deployment attempts
- Automated enforcement

---

## Hollywood's Rules

1. **ALWAYS run `npm run pre-deploy` before pushing**
2. **If scanner fails, FIX IT, don't skip it**
3. **Update scanner if new patterns emerge**
4. **Document any false positives**

---

## Support

If the scanner has issues:
1. Check `.holly/tools/README.md` for documentation
2. Review scanner source code for validation logic
3. Update regex patterns if needed
4. Test changes thoroughly before committing
