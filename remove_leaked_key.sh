#!/bin/bash
# Remove all files containing the leaked API key

echo "Removing files with leaked API key..."

# Documentation files with leaked key
rm -f FINAL_DEPLOYMENT_GUIDE.md
rm -f WORK_LOG_COMPLETE_SUMMARY.md
rm -f test_google_api.js
rm -f test_google_api_v1.js
rm -f test_gemini_2.5.js
rm -f HOLLY_FINAL_FIX_GEMINI_2.5.md
rm -f VERIFICATION_CHECKLIST.md
rm -f HOLLY_500_ERROR_FIX_COMPLETE.md
rm -f HOLLY_FINAL_STATUS_REPORT.md

echo "Files removed. Committing..."
git add -A
git commit -m "SECURITY: Remove files containing leaked Google API key"

echo "Done. You MUST:"
echo "1. Generate a NEW Google API key immediately"
echo "2. Update GOOGLE_API_KEY in Vercel environment variables"
echo "3. Never commit API keys to git again"
