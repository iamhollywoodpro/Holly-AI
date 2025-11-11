# Missing Dependencies to Add

## Required for Full Functionality

### 1. Radix UI Components (for shadcn/ui)
```bash
npm install @radix-ui/react-label
npm install @radix-ui/react-select
npm install @radix-ui/react-tabs
npm install @radix-ui/react-dialog
npm install class-variance-authority
```

### 2. Web Scraping (Optional - for real sync opportunities)
```bash
npm install puppeteer
# OR
npm install playwright
```

### 3. Email Sending (Optional - for auto-follow-ups)
```bash
npm install @sendgrid/mail
```

### 4. Additional Utils
```bash
npm install date-fns  # For date formatting
```

## Quick Install Command

```bash
npm install @radix-ui/react-label @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-dialog class-variance-authority
```

## Optional (Add Later)
```bash
npm install puppeteer @sendgrid/mail date-fns
```

## Notes
- The core system works without the optional dependencies
- Web scraping needs Puppeteer or Playwright
- Email auto-follow-ups need SendGrid
- All Radix UI components should be installed for shadcn/ui to work properly
