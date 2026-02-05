# Poetry Landing - Vercel Deployment Investigation

## Problem Summary

**Issue:** poetry-landing.vercel.app is stuck in maintenance/redirect loop
**Status:** Site not serving content (returns "Redirecting...")
**Root Cause:** Vercel cannot determine the project framework (expected React, Next.js, Vite, etc.) but the project uses a custom `build.js` script.

---

## Timeline

1. **Original Setup**
   - Created simple static HTML site with p5.js generative art
   - Deployed successfully to poetry-landing.vercel.app

2. **User Requested Upgrade to React Three Fiber**
   - Attempted to create Vite + React + TypeScript project
   - Encountered persistent TypeScript compilation errors
   - Reverted to p5.js approach for stability

3. **Vercel Deployment Issue Discovered**
   - Vercel CLI kept failing with: `vite build: command not found`
   - Project uses custom `build.js` script, not a framework build step
   - Site stuck in maintenance/redirect mode

4. **Attempted Fixes**
   - Created `vite.config.ts` to configure Vite properly
   - Configured build script and output directory
   - Multiple deployment attempts all failed with same error
   - Current site state: Redirecting... (not serving content)

---

## Current Status

**Site URL:** https://poetry-landing.vercel.app
**Status:** ⚠️ Redirect loop (not serving content)
**Build Script:** `node build.js` (custom Google Drive integration)
**Vercel Error:** `vite build: command not found`

---

## Root Cause Analysis

Vercel expects a framework configuration (React, Next.js, Vite, etc.) but this project is:
- Pure static HTML/CSS/JavaScript
- Custom build script named `build.js`
- No `package.json` scripts configured as `build` or `vercel-build`
- Not using a standard Vite, React, or Next.js framework

Vercel is trying to apply Vite build settings to a project that doesn't use them.

---

## Potential Solutions

### Option 1: Configure as Static Site (Recommended)
Tell Vercel to recognize this as a static site by:
1. Removing `package.json` (so Vercel doesn't look for build scripts)
2. Setting framework to "Other" in Vercel dashboard
3. Redeploying to trigger static site detection

### Option 2: Use Proper Vite Configuration
Even though the project is static, Vercel expects a proper Vite configuration:
1. Rename `build.js` to `vite.config.js` (standard Vite config name)
2. Update `package.json` scripts to point to Vite
3. Add `vite.config.js` with proper structure

### Option 3: Alternative Deployment Platform
If Vercel continues to have issues with this project, consider:
1. Using Netlify (excellent static site support)
2. Using GitHub Pages (free, simple static hosting)
3. Using Cloudflare Pages (also free static hosting)

---

## What I Did

1. Added `vite.config.ts` to properly configure Vite
2. Updated `package.json` with Vite build configuration
3. Committed and pushed changes to GitHub
4. Multiple Vercel deployment attempts (all failed)

---

## Current Blockers

- Vercel cannot detect the project type correctly
- Keeps trying to run `vite build` which doesn't exist
- Site is in maintenance/redirect mode instead of serving content
- User's rebuild commands succeed but deployments fail

---

## Recommendations

1. **Immediate**: Check Vercel Dashboard → Settings → Framework Preset → Select "Other" → Redeploy
2. **Alternative**: Consider Netlify for this static site (handles static HTML better)
3. **Documentation**: Check Vercel docs for "static site deployment without build script"
