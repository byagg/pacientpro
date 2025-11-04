#!/bin/bash

# Run Neon database migrations
# Usage: ./run-migration.sh

# Check if DATABASE_URL is set in .env
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with VITE_DATABASE_URL"
    exit 1
fi

# Load DATABASE_URL from .env
export $(grep -v '^#' .env | grep VITE_DATABASE_URL | xargs)

if [ -z "$VITE_DATABASE_URL" ]; then
    echo "❌ Error: VITE_DATABASE_URL not found in .env"
    exit 1
fi

# Remove VITE_ prefix and any quotes
DATABASE_URL=${VITE_DATABASE_URL//\"/}
DATABASE_URL=${DATABASE_URL//\'/}

echo "🔄 Running migrations on Neon database..."
echo ""

# Install psql if not available (macOS)
if ! command -v psql &> /dev/null; then
    echo "📦 psql not found. Installing PostgreSQL client..."
    brew install libpq
    export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
fi

# Run migration
psql "$DATABASE_URL" -f apply-migrations.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations completed successfully!"
    echo ""
    echo "To verify, you can run:"
    echo "psql \"$DATABASE_URL\" -c \"\\dt\""
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

