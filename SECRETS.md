# Secrets Management Guide

This document explains how to set up and manage API keys securely using GitHub Actions secrets instead of storing them in `.env` files.

## Overview

API keys and other sensitive configuration are managed through GitHub's secrets system to ensure they are not exposed in the codebase.

## Required Secrets

### GitHub Repository Secrets

Set these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions > New repository secret`):

1. **CLAUDE_API_KEY**
   - Your Anthropic Claude API key
   - Used for AI content generation (main process only)
   - Format: `sk-ant-api03-...`

2. **WOODPECKER_API_KEY**
   - Your Woodpecker.co API key
   - Used for campaign integration (main process only)
   - Obtain from: Woodpecker > Marketplace > Integrations > API keys

### GitHub Repository Variables (Optional)

Set these variables for non-sensitive configuration (`Settings > Secrets and variables > Actions > Variables`):

- **VITE_API_BASE_URL**: API base URL (default: `http://localhost:3000/api`)
- **VITE_AUTH_ENABLED**: Enable authentication (default: `false`)
- **VITE_ENABLE_DEBUG**: Enable debug mode (default: `false`)

## Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual API keys in `.env`:
   ```bash
   CLAUDE_API_KEY=your_actual_claude_api_key
   WOODPECKER_API_KEY=your_actual_woodpecker_api_key
   ```

3. **Never commit your `.env` file** - it's already in `.gitignore`

## GitHub Actions Deployment

The deployment workflow (`.github/workflows/deploy.yml`) automatically:

1. Injects secrets as environment variables during the build process
2. Uses fallback values for non-sensitive configuration
3. Ensures API keys are never exposed in logs or artifacts

## Security Best Practices

- ✅ API keys stored in GitHub Secrets
- ✅ `.env` file excluded from version control
- ✅ `.env.example` provides template without real keys
- ✅ Build process injects secrets at runtime
- ✅ No sensitive data in CI/CD logs

## Troubleshooting

### Build Fails with Missing API Keys

1. Verify secrets are set in GitHub repository settings
2. Check secret names match exactly (case-sensitive)
3. Ensure workflow has access to secrets

### Local Development Issues

1. Ensure `.env` file exists and contains valid keys
2. Restart development server after changing `.env`
3. Check browser console for API errors

## Adding New Secrets

1. Add the secret to GitHub repository settings
2. Update `.env.example` with placeholder
3. Update `.github/workflows/deploy.yml` to inject the secret
4. Update this documentation