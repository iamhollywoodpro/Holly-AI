# Settings System Deployment Notes

## Database Migration Required

The new settings system requires the `user_settings` table. Vercel will automatically create it via `prisma db push` during build.

## Manual Migration (if needed)

If you need to run migrations manually:

```bash
npx prisma db push
npx prisma generate
```

## Settings Schema

The `user_settings` table stores all user preferences as JSON:
- Appearance (theme, colors, fonts)
- Chat preferences (voice, timestamps, code themes)
- AI behavior (style, creativity, context window)
- Notifications (desktop, sounds, alerts)
- Developer tools (debug mode, API logs)

## API Endpoints

- `GET /api/settings` - Load user settings
- `POST /api/settings` - Save user settings
- `GET /api/usage` - Get usage statistics

## Default Values

All settings have defaults in `lib/settings/default-settings.ts`. First-time users get these defaults automatically.

## Testing

1. Visit `/settings` - should redirect to `/settings/integrations`
2. Navigate through all 8 sections via sidebar
3. Toggle settings - should auto-save (check for "Saving..." indicator)
4. Reload page - settings should persist
5. Export settings from Developer Tools section
