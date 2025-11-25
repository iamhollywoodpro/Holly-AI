# HOLLY Development Tools

## TypeScript Scanner

**Purpose**: Lightweight pre-deployment validation tool that catches TypeScript errors WITHOUT running out of memory.

### What It Checks

1. **Prisma Model References** - Validates that all `prisma.modelName` references exist in schema
2. **Prisma Unique Fields** - Ensures `findUnique`, `update`, `delete` operations use valid unique fields
3. **Import/Export Consistency** - Warns about potentially missing imports
4. **Type Definitions** - Validates Record<T, any> type definitions

### Usage

```bash
# Run scanner manually
npm run scan

# Run full pre-deployment checks (scanner + Prisma validation)
npm run pre-deploy

# Run complete safe deployment (checks + build)
npm run safe-deploy
```

### Exit Codes

- **0** - No errors detected, safe to deploy
- **1** - Errors found, DO NOT deploy

### Integration with CI/CD

The scanner can be used as a validation gate in deployment pipelines:

```yaml
# Example GitHub Actions workflow
- name: Validate Code
  run: npm run pre-deploy
  
- name: Deploy
  if: success()
  run: vercel deploy --prod
```

### Why This Exists

After 33+ failed deployments due to schema mismatches and missing fields, we needed a systematic way to catch issues **before** deployment, not after.

The built-in TypeScript compiler (`tsc`) runs out of memory in sandbox environments, so this scanner provides:

- ✅ Lightweight regex-based validation
- ✅ Fast execution (< 1 second for 398 files)
- ✅ Focused on common Prisma-related errors
- ✅ CI/CD compatible with exit codes
- ✅ Ignores commented code

### What It Doesn't Check

- Full TypeScript type checking (use `tsc` locally for that)
- Runtime errors
- Logic errors
- Performance issues

### Example Output

```
🔍 HOLLY TypeScript Scanner Starting...

📋 Loaded Prisma Schema:
   Found 35 models: user, conversation, message, ...

📂 Scanning src/ directory...
📂 Scanning app/ directory...

═══════════════════════════════════════════════════════════
  HOLLY TypeScript Scanner Results
═══════════════════════════════════════════════════════════

📊 Scanned 398 TypeScript files

✅ No errors found!

⚠️  WARNINGS (10):
...

═══════════════════════════════════════════════════════════
✅ BUILD SAFE: No critical errors detected
═══════════════════════════════════════════════════════════
```

### Maintenance

The scanner automatically:
- Loads Prisma schema on each run
- Converts PascalCase model names to camelCase (Prisma Client API format)
- Extracts unique fields including `@unique` and `@@unique` compound keys
- Ignores code inside comments (`//` and `/* */`)

### History

- **Created**: 2025-11-25 - After deployment #34 failure
- **Problem**: 33+ consecutive deployment failures due to schema mismatches
- **Solution**: Systematic pre-deployment validation
- **First Success**: Reduced errors from 187 to 0 in first run
