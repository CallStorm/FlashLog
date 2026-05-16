# FlashLog — Android 构建说明

## 环境要求

| 项 | 要求 |
|----|------|
| Node.js | LTS 18+ |
| JDK | 17 |
| Android Studio | SDK、Build-Tools、Platform（如 API 34） |
| 环境变量 | `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` |

## 首次初始化

```bash
npm install
npm run build
npx cap add android
npx cap sync android
```

## 日常构建

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# Windows: gradlew.bat assembleDebug
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`

## 若本机未安装 Android SDK

跳过 `cap add android`，仅在浏览器或 `npm run dev` 中验证 Web MVP（SQLite 使用 localStorage 回退，密钥使用 Preferences）。

安装 Android Studio 并配置 SDK 后，再执行上述初始化命令。
