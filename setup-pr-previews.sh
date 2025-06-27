#!/bin/bash

# Setup script for PR preview environments
echo "🚀 Setting up PR preview environments..."

# Create workflows directory if it doesn't exist
mkdir -p .github/workflows

# Move workflow files
if [ -f "workflows-to-add/pr-preview-deploy.yml" ]; then
    mv workflows-to-add/pr-preview-deploy.yml .github/workflows/
    echo "✅ Moved pr-preview-deploy.yml to .github/workflows/"
else
    echo "❌ pr-preview-deploy.yml not found in workflows-to-add/"
    exit 1
fi

if [ -f "workflows-to-add/pr-preview-cleanup.yml" ]; then
    mv workflows-to-add/pr-preview-cleanup.yml .github/workflows/
    echo "✅ Moved pr-preview-cleanup.yml to .github/workflows/"
else
    echo "❌ pr-preview-cleanup.yml not found in workflows-to-add/"
    exit 1
fi

# Clean up temporary directory
if [ -d "workflows-to-add" ] && [ -z "$(ls -A workflows-to-add)" ]; then
    rmdir workflows-to-add
    echo "✅ Cleaned up empty workflows-to-add directory"
fi

echo ""
echo "🎉 PR preview setup complete!"
echo ""
echo "Next steps:"
echo "1. Commit and push these workflow files"
echo "2. Create a test PR to verify the setup works"
echo "3. Check the PR comments for the preview URL"
echo ""
echo "See PR_PREVIEW_SETUP.md for detailed documentation."