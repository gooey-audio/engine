# PR Preview Environment Setup

This setup creates independent fly.io deployments for each pull request, allowing you to test changes before merging.

## How it Works

1. **PR Created/Updated**: A new fly.io app is created (or updated) with the name pattern `engine-pr-{PR_NUMBER}`
2. **Preview URL**: The deployment URL is posted as a comment on the PR
3. **PR Closed**: The fly.io app is automatically destroyed to save resources

## Setup Instructions

### 1. Move Workflow Files

Move the workflow files from the temporary `workflows-to-add/` directory to your `.github/workflows/` directory:

```bash
mv workflows-to-add/pr-preview-deploy.yml .github/workflows/
mv workflows-to-add/pr-preview-cleanup.yml .github/workflows/
```

### 2. Verify fly.io Token

Make sure your repository has the `FLY_API_TOKEN` secret configured:
- Go to your repository Settings → Secrets and variables → Actions
- Verify `FLY_API_TOKEN` is present (it should already be there from your main deployment)

### 3. Test the Setup

1. Create a test pull request
2. The preview deployment should trigger automatically
3. Check the PR comments for the preview URL
4. Close the PR to verify cleanup works

## App Naming Convention

- Main app: `engine-sparkling-sea-2896` (existing)
- PR previews: `engine-pr-{NUMBER}` (e.g., `engine-pr-123`)

## Resource Management

- Preview apps are automatically cleaned up when PRs are closed/merged
- Apps use the same configuration as your main app (512MB RAM, 1 CPU)
- Each preview app will have its own unique `.fly.dev` URL

## Limitations

- Only works for PRs from the same repository (not from forks, for security)
- Requires the `FLY_API_TOKEN` secret to be configured
- Preview apps are destroyed when PRs are closed (no persistence)

## Manual Operations

If you need to manually manage preview apps:

```bash
# List all apps
flyctl apps list

# Delete a specific preview app
flyctl apps destroy engine-pr-123 --yes

# Clean up all preview apps
flyctl apps list | grep "engine-pr-" | awk '{print $1}' | xargs -I {} flyctl apps destroy {} --yes
```

## Cost Considerations

- Preview apps use the same resources as your main app
- Apps are set to auto-stop when idle (`auto_stop_machines = 'stop'`)
- Automatic cleanup prevents abandoned preview apps from accumulating costs