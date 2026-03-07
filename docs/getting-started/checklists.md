# Habits Checklist

Actionable checklists for working with Habits stacks. Follow the path that matches your use case.

[[toc]]



## 📋 Habits Stack Preparation Checklist
Do this before exporting your stack

### Basic Stack Requirements
- [ ] Stack has a `name` field in `stack.yaml`
- [ ] Each habit has a unique `name` field
- [ ] Each habit has at least one node
- [ ] All API keys stored in `.env` file (not in habit files)
- [ ] `.env` is in `.gitignore` if you have a version control
- [ ] `.env.example` exists with required variable names

### If using Server-Side or Full-Stack Logic
- [ ] All habits have clear `inputs` defined
- [ ] All habits have clear `outputs` defined
- [ ] UI points to correct backend endpoints
- [ ] CORS configured if frontend/backend on different origins

### If using Manual UI
- [ ] HTML/frontend created manually
- [ ] Endpoints configured in frontend code
- [ ] Form submissions tested end-to-end

---

## 🧪 Testing Checklist

- [ ] All habits tested locally in development
- [ ] Environment variables loaded and working
- [ ] Error handling tested (invalid inputs, missing keys)

---

## 🚀 Building & Running Habits Locally

### If you want to use Base Mode (GUI builder)
- [ ] Create minimal .env to allow serving and installing
- [ ] Run: `npx habits@latest base`
- [ ] Access UI at `http://localhost:3000/habits/base/`

### If you want to use code-first approach (HaC)
- [ ] Directory contains `stack.yaml` file
- [ ] Directory contains at least one habit file (`.yaml` or `.json`)
- [ ] `.env` file exists in same directory
- [ ] Run: `npx habits@latest cortex --config ./stack.yaml`
- [ ] Access UI at `http://localhost:3000`

### If port 3000 is already in use
- [ ] Run with custom port: `--port 8080`
- [ ] Or kill existing process: `lsof -ti:3000 | xargs kill`

### If using global installation instead of npx
- [ ] Install: `npm install -g habits` (or `pnpm`/`yarn`)
- [ ] Run: `habits base` or `habits cortex --config ./stack.yaml`

### If testing next/beta version
- [ ] Use: `npx habits@next base`
- [ ] Or: `npx habits@next cortex --config ./stack.yaml`

---

## 📦 Exporting for Production

### If exporting Server-Side or Full-Stack (Recommended: Docker)
- [ ] Stack tested locally and working
- [ ] Export via Base UI → Export tab → Docker
- [ ] Or POST to `/api/export/pack/docker`
- [ ] Download `{stackName}-docker.zip`
- [ ] Unzip and run: `docker-compose up -d`

### If exporting Server-Side (Alternative: Single Executable)
- [ ] Stack tested locally and working
- [ ] Export via Base UI → Export tab → Binary
- [ ] Or POST to `/api/export/binary`
- [ ] Download binary for target platform
- [ ] Run executable on target machine

### If exporting Desktop App (Experimental)
- [ ] Stack tested locally and working
- [ ] Backend URL configured (where app will connect)
- [ ] Choose framework: `tauri` (recommended) or `electron`
- [ ] Choose platform: `windows`, `mac`, `linux`, or `all`
- [ ] Check build tools: `curl http://localhost:3000/habits/base/api/export/binary/support` or in UI
  - [ ] For Tauri: Rust, Cargo installed
  - [ ] For Electron: Electron Builder available
- [ ] Export via Base UI → Export tab → Desktop
- [ ] Or POST to `/api/export/pack/desktop` (see [export.controller.ts](../packages/base/server/src/controllers/export.controller.ts))
- [ ] If first time: Download scaffold (buildBinary: false)
- [ ] If ready for binary: Enable buildBinary: true
- [ ] Download and test on target platform

### If exporting Mobile App (Experimental)
- [ ] Stack tested locally and working
- [ ] Backend URL configured (must be accessible from mobile device)
- [ ] Choose framework: `tauri` (recommended), `capacitor`, or `cordova`
- [ ] Choose target: `ios`, `android`, or `both`
- [ ] Check build tools: `curl http://localhost:3000/habits/base/api/export/binary/support`
  - [ ] For Android: Java, Gradle, Android SDK installed
  - [ ] For iOS: macOS with Xcode installed (iOS builds only work on macOS)
- [ ] Set environment variables:
  - [ ] `ANDROID_HOME` or `ANDROID_SDK_ROOT` for Android
- [ ] Export via Base UI → Export tab → Mobile
- [ ] Or POST to `/api/export/pack/mobile` (see [export.controller.ts](../packages/base/server/src/controllers/export.controller.ts))
- [ ] If first time: Download scaffold (buildBinary: false)
- [ ] If ready for binary: Enable buildBinary: true
- [ ] Download APK (Android) or IPA (iOS)
- [ ] Test on real device or emulator

---

## 🔧 Troubleshooting Checklist

### If "Cannot find stack.yaml" error
- [ ] Verify `stack.yaml` exists in current directory
- [ ] Or provide full path: `--config /path/to/stack.yaml`

### If "Missing environment variable" error
- [ ] Verify `.env` file exists
- [ ] Check variable names match references in habits (e.g., `${OPENAI_API_KEY}`)
- [ ] Ensure `.env` is in same directory as `stack.yaml`

### If "Port already in use" error
- [ ] Run with different port: `--port 8080`
- [ ] Or kill process: `lsof -ti:3000 | xargs kill`
- [ ] Base can also help you kill a port.

### If "Habit validation failed" error
- [ ] Verify habit has `name` field
- [ ] Verify habit has at least one node
- [ ] Check node IDs are correctly referenced in edges

### If Desktop/Mobile build fails
- [ ] Run: `curl http://localhost:3000/habits/base/api/export/binary/support`
- [ ] Check `mobile` or `desktop` section for missing tools
- [ ] Install missing dependencies
- [ ] Try scaffold export first (buildBinary: false) to verify config
- [ ] Check logs for specific error messages

### If iOS build fails
- [ ] Verify you're on macOS (iOS builds require macOS)
- [ ] Verify Xcode is installed: `xcodebuild -version`
- [ ] Open Xcode at least once to accept license agreements

### If Android build fails 
- [ ] Verify `ANDROID_HOME`/`ANDROID_SDK_ROOT` is set
- [ ] Verify Java and Gradle versions are compatible
- [ ] Check compatibility in support endpoint response
- [ ] Install Android SDK build tools if missing

---

## Documentation Reading Order Checklist

### If you are completely new to Habits
- [ ] Read [Introduction](./introduction.md) - understand what Habits is
- [ ] Read [Motivation](./motivation.md) - understand why Habits exists
- [ ] Read [When to Use](./when-to-use.md) - see if Habits fits your use case
- [ ] Read [Concepts](./concepts.md) - learn core concepts (stacks, habits, nodes)
- [ ] Read [First Habit](./first-habit.md) - build your first habit
- [ ] Browse [Examples Index](../examples/index.md) - see what's possible

### If you want to understand Habits in-depth
- [ ] Read [Variables](../deep-dive/variables.md) - learn how to pass data between nodes
- [ ] Read [Habit Schema](../deep-dive/habit-schema.md) - full schema reference
- [ ] Read [Creating Habits](../deep-dive/creating.md) - advanced creation techniques
- [ ] Read [Running Habits](../deep-dive/running.md) - different modes and options
- [ ] Read [Logging](../deep-dive/logging.md) - debugging and monitoring

### If you want to see working examples
- [ ] Check [Mixed Framework Example](../examples/mixed.md) - combines multiple frameworks
- [ ] Check [AI Cookbook Example](../examples/ai-cookbook.md) - AI-powered recipe generation
- [ ] Check [Email Classification Example](../examples/email-classification.md) - email processing
- [ ] Check [Minimal Blog Example](../examples/minimal-blog.md) - simple content management
- [ ] Browse [Examples Directory](../examples/) - all example stacks with code

### If you want to import from existing tools
- [ ] Read [Importing & Converting](../deep-dive/importing-converting.md) - import from n8n, Activepieces, etc.

### If you want to distribute your habits
- [ ] Read [Pack & Distribute](../deep-dive/pack-distribute.md) - export and distribution options
- [ ] Follow export checklists in this document (Docker, Binary, Desktop, Mobile)

### If you want to contribute or understand internals
- [ ] Browse Development documentation in `docs/development/` folder
- [ ] Browse Roadmap documentation in `docs/roadmap/` folder
- [ ] Check [Stability](../stability.md) - API stability guarantees

### If you have specific questions
- [ ] Check [Security Documentation](../security/index.md) - security best practices
- [ ] Browse Extra Reading in `docs/extra-reading/` folder
- [ ] Browse Misc documentation in `docs/misc/` folder



---

## 📚 Resources

- [Examples](../examples/) - Working example stacks
- [Habits Schema](../schemas/habits.schema.yaml) - Complete schema reference
- [Security Best Practices](../security/) - Security guidelines
