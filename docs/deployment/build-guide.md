# Woodpecker API - Build Guide

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18+ required
- **npm**: Version 8+ (comes with Node.js)
- **macOS**: Required for building macOS packages
- **Xcode Command Line Tools**: Required for native module compilation

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Woodpecker-API

# Install dependencies
npm install

# Install native dependencies for current architecture
npm rebuild
```

## Build Commands

### Development Builds

```bash
# Start development server
npm run dev

# Start Electron in development mode
npm run dev:electron

# Build frontend only
npm run build

# Compile Electron main process
npm run electron:compile
```

### Production Builds

```bash
# Full production build with DMG
npm run build:production

# Alternative: Use the combined command
npm run build:electron

# Build directory only (no DMG)
npm run electron:build:dir

# Verify build output
npm run verify:build
```

## Build Configuration

### Package.json Configuration

The build is configured in `package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.makeshapes.woodpecker-api",
    "productName": "Woodpecker API",
    "copyright": "Copyright © 2025 Makeshapes",
    "directories": {
      "output": "release",
      "buildResources": "assets"
    },
    "mac": {
      "target": [{"target": "dmg", "arch": ["universal"]}],
      "category": "public.app-category.productivity",
      "minimumSystemVersion": "10.14.0",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    }
  }
}
```

### Asset Requirements

Required assets in `assets/` directory:
- `icons/icon.icns` - macOS app icon
- `icons/icon.png` - Generic icon
- `icons/icon.ico` - Windows icon
- `dmg-background.png` - DMG installer background
- `entitlements.plist` - macOS security entitlements

## Build Process Details

### 1. Frontend Build (Vite)
- Compiles React/TypeScript frontend
- Optimizes assets and bundles
- Outputs to `dist/` directory

### 2. Electron Compilation
- Compiles main process TypeScript
- Compiles preload scripts
- Outputs to `dist-electron/` directory

### 3. Native Dependencies
- Rebuilds native modules (better-sqlite3) for target architecture
- Supports both Intel (x64) and Apple Silicon (arm64)

### 4. App Packaging
- Creates universal binary app bundle
- Applies code signing if certificates available
- Packages into DMG installer

## Code Signing

### Automatic Signing
If you have a valid Apple Developer certificate installed:
- electron-builder will automatically detect and use it
- The app will be signed with hardened runtime
- No additional configuration needed

### Manual Certificate Setup
1. Install Apple Developer certificate in Keychain
2. Ensure certificate is valid and not expired
3. electron-builder will use it automatically

### Entitlements
The app uses these entitlements (`assets/entitlements.plist`):
- `com.apple.security.cs.allow-jit` - For V8 JavaScript engine
- `com.apple.security.network.client` - For API calls
- `com.apple.security.files.user-selected.read-write` - For CSV imports

## Build Optimization

### Bundle Size Optimization
- Development dependencies excluded from build
- Node modules filtered to exclude unnecessary files
- Tree shaking applied to frontend code

### Performance Optimization
- Universal binary compilation for broad compatibility
- Optimized asset compression
- Efficient file inclusion patterns

## Troubleshooting

### Common Build Issues

**Native module compilation errors:**
```bash
# Rebuild native modules
npm rebuild

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Code signing failures:**
- Ensure valid Apple Developer certificate is installed
- Check certificate expiration date
- Verify Keychain Access permissions

**DMG creation failures:**
- Ensure sufficient disk space (2GB+ recommended)
- Check that background image exists
- Verify icon files are present

### Build Verification

Run the verification script to check build output:
```bash
npm run verify:build
```

This checks:
- DMG file creation and mounting
- App bundle structure
- Code signing status
- Required assets presence

## Release Workflow

### Automated Release
1. Update version in `package.json`
2. Run full build: `npm run build:production`
3. Verify build: `npm run verify:build`
4. Test installation on clean system
5. Distribute DMG file

### Manual Testing Checklist
- [ ] DMG mounts correctly
- [ ] App installs to Applications
- [ ] App launches without errors
- [ ] All features work in packaged version
- [ ] Database persistence works
- [ ] API connections function
- [ ] CSV import/export works

## Environment Variables

### Production Environment
Set in `.env.production`:
```
NODE_ENV=production
ELECTRON_IS_DEV=false
VITE_ENABLE_DEBUG=false
```

### Build-time Variables
- `NODE_ENV=production` - Enables production optimizations
- `ELECTRON_IS_DEV=false` - Disables development features

## File Structure

```
release/
├── Woodpecker API-1.0.0-universal.dmg    # Main installer
├── Woodpecker API-1.0.0-universal.dmg.blockmap
├── latest-mac.yml                          # Update metadata
├── builder-effective-config.yaml           # Build configuration
└── mac-universal/
    └── Woodpecker API.app/                 # App bundle
```
