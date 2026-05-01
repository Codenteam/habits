### Pack to Bundle

```bash
# Pack a showcase to cortex-bundle.js
pnpm nx dev habits pack --format bundle --config {{config}}
```

### Pack to .habit

```bash
# Pack a showcase to .habit file
pnpm nx run habits pack --format habit --config {{config}}
```

### Pack with .env

```bash
# Pack with .env values included (YOU MUST KNOW WHAT YOU ARE DOING!!!)
pnpm nx dev habits pack --format habit --config {{config}} --include-env
```

### Build Habits

```bash
# Build Habits
pnpm nx build habits
```

### Pack Habits

```bash
# Pack Habits
pnpm nx pack habits
```

### Publish Habits (latest)

```bash
# Publish Habits (latest)
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/
```

### Publish Habits @next

```bash
# Publish Habits @next
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/ --tag next
```

### Run Example

```bash
# Run Example (e.g., hello-world)
pnpm nx cortex habits --config {{config}}
```

### Pack Showcase App (mobile-full)

```bash
# Pack Showcase App (interactive, example for mixed showcase)
pnpm tsx packages/habits/app/src/main.ts pack --config {{config}} --format mobile-full --mobile-target {{mobileTarget}} --app-name "{{appName}}" --output {{output}}
```

### Pack SEA Binary

```bash
# Pack SEA Binary (single executable)
node dist/packages/habits/app/main.cjs pack --config {{config}} --format single-executable -o {{output}}
```

### Pack Desktop App

```bash
# Pack Desktop App (Electron dmg)
node dist/packages/habits/app/main.cjs pack --config {{config}} --format desktop --backend-url {{backendUrl}} --desktop-platform {{desktopPlatform}} -o {{output}}
```

### Pack Mobile App

```bash
# Pack Mobile App (Cordova)
node dist/packages/habits/app/main.cjs pack --config {{config}} --format mobile --backend-url {{backendUrl}} --mobile-target {{mobileTarget}} -o {{output}}
```

### Pack Mobile + Sign

```bash
# Pack Mobile + Sign (release APK with debug sign)
pnpm tsx packages/habits/app/src/main.ts pack --config {{config}} --format mobile-full --mobile-target {{mobileTarget}}
```

### Sign APK

```bash
# Sign APK (with debug keystore)
jarsigner -verbose -keystore ~/.android/debug.keystore -storepass android -keypass android {{apkPath}} androiddebugkey
```
