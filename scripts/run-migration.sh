#!/bin/bash
# Auto-run Prisma migrations on Vercel deployment

echo "🔄 Running Prisma migrations..."

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

echo "✅ Migrations complete!"
