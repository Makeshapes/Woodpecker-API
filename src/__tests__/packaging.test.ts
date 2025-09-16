import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('macOS Packaging Configuration', () => {
  let packageJson: any

  beforeAll(() => {
    const packagePath = join(process.cwd(), 'package.json')
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  })

  describe('Package.json Build Configuration', () => {
    it('should have correct app metadata', () => {
      expect(packageJson.name).toBe('woodpecker-app')
      expect(packageJson.version).toBe('1.0.0')
      expect(packageJson.description).toContain('Desktop application for lead management')
      expect(packageJson.author).toContain('Makeshapes')
      expect(packageJson.homepage).toBe('https://makeshapes.com')
    })

    it('should have electron-builder configuration', () => {
      expect(packageJson.build).toBeDefined()
      expect(packageJson.build.appId).toBe('com.makeshapes.woodpecker-api')
      expect(packageJson.build.productName).toBe('Woodpecker API')
      expect(packageJson.build.copyright).toContain('Makeshapes')
    })

    it('should configure universal macOS build', () => {
      const macConfig = packageJson.build.mac
      expect(macConfig).toBeDefined()
      expect(macConfig.target).toEqual([{
        target: 'dmg',
        arch: ['universal']
      }])
      expect(macConfig.category).toBe('public.app-category.productivity')
      expect(macConfig.minimumSystemVersion).toBe('10.14.0')
    })

    it('should configure DMG installer', () => {
      const dmgConfig = packageJson.build.dmg
      expect(dmgConfig).toBeDefined()
      expect(dmgConfig.title).toBe('Woodpecker API Installer')
      expect(dmgConfig.icon).toBe('assets/icons/icon.icns')
      expect(dmgConfig.background).toBe('assets/dmg-background.png')
      expect(dmgConfig.window).toEqual({
        width: 540,
        height: 380
      })
      expect(dmgConfig.contents).toHaveLength(2)
    })

    it('should configure security settings', () => {
      const macConfig = packageJson.build.mac
      expect(macConfig.hardenedRuntime).toBe(true)
      expect(macConfig.gatekeeperAssess).toBe(false)
      expect(macConfig.entitlements).toBe('assets/entitlements.plist')
      expect(macConfig.entitlementsInherit).toBe('assets/entitlements.plist')
    })

    it('should optimize file inclusion', () => {
      const files = packageJson.build.files
      expect(files).toContain('dist/**/*')
      expect(files).toContain('dist-electron/**/*')
      expect(files).toContain('node_modules/**/*')
      expect(files).toContain('!node_modules/**/*.{md,txt}')
      expect(files).toContain('!node_modules/**/test/**/*')
      expect(files).toContain('!node_modules/**/*.d.ts')
    })
  })

  describe('Asset Files', () => {
    it('should have icon assets', () => {
      expect(existsSync('assets/icons/icon.icns')).toBe(true)
      expect(existsSync('assets/icons/icon.png')).toBe(true)
      expect(existsSync('assets/icons/icon.ico')).toBe(true)
    })

    it('should have DMG background', () => {
      expect(existsSync('assets/dmg-background.png')).toBe(true)
    })

    it('should have entitlements file', () => {
      expect(existsSync('assets/entitlements.plist')).toBe(true)
    })

    it('should have proper icon sizes', () => {
      const iconSizes = [16, 32, 64, 128, 256, 512, 1024]
      iconSizes.forEach(size => {
        expect(existsSync(`assets/icons/icon-${size}.png`)).toBe(true)
      })
    })
  })

  describe('Build Scripts', () => {
    it('should have production build scripts', () => {
      const scripts = packageJson.scripts
      expect(scripts['build:electron']).toBeDefined()
      expect(scripts['electron:build']).toBeDefined()
      expect(scripts['dist']).toBeDefined()
      expect(scripts['electron:compile']).toBeDefined()
    })

    it('should have proper script dependencies', () => {
      const scripts = packageJson.scripts
      expect(scripts['build:electron']).toContain('npm run build')
      expect(scripts['electron:build']).toContain('electron-builder')
      expect(scripts['dist']).toBe('npm run build:electron')
    })
  })
})

describe('Build Output Validation', () => {
  it('should generate DMG file', () => {
    const dmgPath = 'release/Woodpecker API-1.0.0-universal.dmg'
    expect(existsSync(dmgPath)).toBe(true)
  })

  it('should generate blockmap file', () => {
    const blockmapPath = 'release/Woodpecker API-1.0.0-universal.dmg.blockmap'
    expect(existsSync(blockmapPath)).toBe(true)
  })

  it('should generate latest-mac.yml', () => {
    const latestPath = 'release/latest-mac.yml'
    expect(existsSync(latestPath)).toBe(true)
  })

  it('should generate universal app bundle', () => {
    const appPath = 'release/mac-universal/Woodpecker API.app'
    expect(existsSync(appPath)).toBe(true)
  })
})
