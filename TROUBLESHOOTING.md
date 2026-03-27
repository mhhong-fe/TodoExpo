# Expo Go 开发环境版本问题排查总结

> 环境：macOS + Node.js 18.17.1 + iPhone（iOS 26.2 beta）

---

## 问题一：`react-native init` 报错 `styleText is not a function`

### 现象
```
TypeError: styleText is not a function
```

### 原因
`react-native@0.76+` 的 CLI 使用了 Node.js 18.17 中不存在的 `util.styleText` API（该 API 在 Node.js 20 中才引入）。

### 解决
改用 `@react-native-community/cli` 初始化，并指定兼容 Node 18 的旧版本：
```bash
npx @react-native-community/cli init TodoApp --version 0.73.0
```

---

## 问题二：Xcode 构建失败 `iOS 26.2 is not installed`

### 现象
```
error: iOS 26.2 is not installed. Please download and install the platform from Xcode > Settings > Components.
```

### 原因
手机运行 iOS 26.2 beta，但 Xcode 本地没有安装对应的 SDK。

### 解决
`Xcode → Settings → Platforms` 下载 iOS 26 组件（需要几 GB 空间）。

---

## 问题三：Expo Go 与项目 SDK 版本不匹配（项目版本过低）

### 现象
```
Project is incompatible with this version of Expo Go
• The installed version of Expo Go is for SDK 54.0.0.
• The project you opened uses SDK 50.
```

### 原因
`create-expo-app` 默认创建最新 SDK 项目，但手机上的 Expo Go 是旧版本。

### 解决
升级项目的 Expo SDK：
```bash
npx expo install expo@^54.0.0 --fix
```

---

## 问题四：Expo Go 与项目 SDK 版本不匹配（项目版本过高）

### 现象
```
Project is incompatible with this version of Expo Go
The project you requested requires a newer version of Expo Go.
```

### 原因
`create-expo-app@latest` 创建了 SDK 55 项目（RN 0.83.2），但 Expo Go App Store 当时只有 SDK 54（RN 0.81.4）。

### 解决
两种方案二选一：

**方案 A：更新 Expo Go**（去 App Store 更新）

**方案 B：降级项目到对应 SDK**
```bash
# package.json 中修改 expo 版本后重新安装
npm install --legacy-peer-deps
```

---

## 问题五：React Native 版本不匹配 `version mismatch`

### 现象
```
[runtime not ready]: console.error: React Native version mismatch.
JavaScript version: 0.83.2
Native version: 0.81.4
```

### 原因
`create-expo-app@latest` 安装了 SDK 55 对应的 RN 0.83.2，但 Expo Go 内置 RN 0.81.4（SDK 54）。JS bundle 与原生层版本不一致。

### 解决
手动将 `package.json` 中 `react-native` 降到与 Expo Go 匹配的版本，并重装依赖：
```bash
npm install --legacy-peer-deps
npx expo start --clear
```

---

## 问题六：`PlatformConstants could not be found`

### 现象
```
[runtime not ready]: Invariant Violation:
TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found.
```

### 原因
项目 `react-native` 版本（0.76.9）与 Expo Go 内置的原生层（0.81.4）差距过大，TurboModule 注册表中找不到老版本模块。

### 解决
不能手动猜测 RN 版本，应让 `expo install --fix` 自动对齐：
```bash
npx expo install --fix
npm install --legacy-peer-deps
```

---

## 问题七：`npm install --fix` 依赖冲突

### 现象
```
npm ERR! ERESOLVE could not resolve
npm ERR! Conflicting peer dependency: @types/react@19.x
```

### 原因
不同包对 `@types/react`、`react-native` 的 peer dependency 要求互相冲突，npm 默认严格模式下无法自动解决。

### 解决
加 `--legacy-peer-deps` 跳过严格检查：
```bash
npm install --legacy-peer-deps
```

---

## 问题八：iOS 26 beta 导致 Expo Go 版本被锁死

### 现象
App Store 显示 Expo Go 已是最新版，但仍报 "requires newer version of Expo Go"。

### 根本原因
iPhone 运行 **iOS 26.2 beta**，App Store 只能安装为正式 iOS 编译的 Expo Go（SDK 54），无法安装 SDK 55+ 版本。

### 解决
项目必须固定在 **SDK 54 + RN 0.81.x**，无法使用更新的 SDK。

---

## 版本对应关系速查表

| Expo SDK | React Native | React | Expo Go 可用状态 |
|----------|-------------|-------|----------------|
| 50       | 0.73.x      | 18.2  | ✅ 旧版          |
| 52       | 0.76.x      | 18.3  | ✅              |
| 53       | 0.79.x      | 18.3  | ✅              |
| **54**   | **0.81.x**  | **19.1** | **✅ App Store 最新（iOS 26）** |
| 55       | 0.83.x      | 19.1  | ❌ iOS 26 不可用  |

---

## 最终可用配置

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "expo-av": "~16.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-status-bar": "~3.0.9",
    "react-native-safe-area-context": "~5.4.0",
    "react-native-screens": "~4.5.0",
    "@react-navigation/native": "^7.x",
    "@react-navigation/bottom-tabs": "^7.x"
  }
}
```

启动命令：
```bash
npx expo start --clear
```

---

## 经验总结

1. **永远不要手动猜测 RN 版本**，用 `npx expo install --fix` 让 Expo 自动对齐。
2. **iOS beta 系统会卡住 Expo Go 版本**，项目 SDK 必须与 App Store 可用的最新 Expo Go 保持一致。
3. **Node.js 版本也有要求**，Expo SDK 54+ 建议 Node.js ≥ 20，Node 18 虽然能跑但会有 `EBADENGINE` 警告。
4. **依赖冲突时优先用 `--legacy-peer-deps`**，不要用 `--force`（后者会强制覆盖可能破坏运行时）。
5. **每次改完版本都要加 `--clear`** 清除 Metro 缓存，否则可能用旧 bundle。
