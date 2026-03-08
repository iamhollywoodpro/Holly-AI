# 🔴 MANDATORY PRE-DEPLOYMENT CHECKLIST

**HOLLY - YOU MUST COMPLETE EVERY ITEM BEFORE PUSHING**

## ✅ Validation Steps:

### 1. Schema Validation
```bash
bash /tmp/validate_all_prisma.sh
```
**Result:** _____ (PASS/FAIL)

### 2. TypeScript Compilation
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
**Result:** _____ (must be 0)

### 3. Check Specific Problem Files
```bash
grep -rn "userId_name\|experienceType\|\.name.*FileUpload" app/api --include="*.ts"
```
**Result:** _____ (must be empty)

### 4. Integration Model Verification
```bash
grep -rn "where.*userId" app/api/admin/integrations --include="*.ts" | grep -v "createdBy"
```
**Result:** _____ (must be empty)

---

## 🚫 DO NOT PUSH IF:

- ❌ Any validation step fails
- ❌ TypeScript shows ANY errors
- ❌ Schema validation finds issues
- ❌ Haven't tested changed files

---

## ✅ ONLY PUSH WHEN:

- ✅ ALL validation steps pass
- ✅ TypeScript: 0 errors
- ✅ Schema validation: 0 errors
- ✅ Tested locally

---

**Last Failed Deployment:** #10 (ad361b6 - FileUpload.name field)
**Reason:** Didn't check FileUpload schema, assumed field name
**Lesson:** CHECK THE ACTUAL SCHEMA, DON'T ASSUME

