# PM-LLM — Electron Build & Deploy Guide

Expo web build → Electron wrapper → Windows installer / macOS DMG

---

## 新增的檔案結構

```
pmlllm/
├── electron/
│   ├── main.js        ← Electron 主程式
│   └── preload.js     ← 安全橋接 (contextBridge)
├── dist/              ← Expo web export 輸出 (build 時產生)
├── release/           ← electron-builder 輸出 (build 時產生)
└── package.json       ← 已加入 Electron scripts + build config
```

---

## Step 1 — 安裝依賴套件

```bash
cd D:\project\ai\ai-project\pmlllm
npm install
```

這會安裝新加入的：
- `electron-serve` (runtime)
- `electron`, `electron-builder`, `concurrently`, `wait-on` (devDependencies)

---

## Step 2 — 開發模式 (本機測試)

```bash
npm run electron:dev
```

這個指令會同時啟動：
1. Expo web server (`localhost:8081`)
2. Electron 視窗載入 `localhost:8081`

> 可即時 hot-reload，用於開發測試。

---

## Step 3 — Build Windows 安裝檔 (.exe)

> **必須在 Windows 機器上執行**

```bash
npm run electron:build:win
```

流程：
1. `expo export -p web --output-dir dist` → 編譯 Expo web bundle
2. `electron-builder --win` → 打包成 NSIS installer

**輸出檔案：**
```
release/
└── PM-LLM Setup 1.0.0.exe    ← Windows 安裝程式
```

安裝後會在桌面與開始選單建立捷徑。

---

## Step 4 — Build macOS DMG

> **必須在 macOS 機器上執行**（Apple 程式碼簽署限制）

```bash
npm run electron:build:mac
```

流程：
1. `expo export -p web --output-dir dist` → 編譯 Expo web bundle
2. `electron-builder --mac` → 打包成 DMG（支援 x64 + Apple Silicon arm64）

**輸出檔案：**
```
release/
├── PM-LLM-1.0.0.dmg           ← x64 Intel Mac
└── PM-LLM-1.0.0-arm64.dmg    ← Apple Silicon Mac
```

---

## Step 5 — 同時 Build Windows + Mac (CI 環境)

```bash
npm run electron:build:all
```

> 注意：cross-build (在 Mac 上 build Windows) 不支援所有格式，建議各平台各自 build。

---

## Deploy / 發佈方式

### Windows
1. 將 `release/PM-LLM Setup 1.0.0.exe` 傳給使用者
2. 使用者雙擊執行安裝精靈
3. 安裝到 `C:\Users\<name>\AppData\Local\Programs\PM-LLM\`

### macOS
1. 將 `release/PM-LLM-1.0.0.dmg` 傳給使用者
2. 使用者掛載 DMG，將 `PM-LLM.app` 拖入 `/Applications`
3. 首次開啟需在「系統設定 → 隱私權與安全性」允許（未簽署時）

### 自動更新（選用）
若需要 auto-update，加入 `electron-updater`：
```bash
npm install electron-updater
```
並搭配 GitHub Releases 或自架伺服器發佈更新。

---

## 原生檔案操作 (Excel Import/Export)

`electron/preload.js` 已暴露 `window.electronAPI`，在 web 環境偵測後可用：

```javascript
// 偵測是否在 Electron 環境
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// 開啟檔案 (取代 expo-document-picker)
if (isElectron) {
  const file = await window.electronAPI.openFile()
  // file.data = base64 string
  // file.name = 'filename.xlsx'
}

// 儲存檔案 (取代 expo-sharing)
if (isElectron) {
  await window.electronAPI.saveFile({
    defaultName: 'export.xlsx',
    data: base64String,   // ArrayBuffer → base64
  })
}
```

---

## 常見問題

| 問題 | 解法 |
|------|------|
| macOS 顯示「無法開啟，因為開發者身份不明」 | 系統設定 → 隱私權與安全性 → 仍要開啟；或購買 Apple Developer 帳號進行簽署 |
| Windows Defender 警告 | 購買 Code Signing 憑證 (EV cert) 並在 electron-builder 設定 `certificateFile` |
| expo export 失敗 | 先執行 `npm run web` 確認 web 版正常，再 export |
| Electron 視窗空白 | 確認 `dist/index.html` 存在；prod 模式需先執行 `electron:build:web` |
| SVG 圖示無法顯示 | 已安裝 `react-native-svg-transformer`，確認 `metro.config.js` 設定正確 |

---

## 版本資訊

- Electron: ^35
- electron-builder: ^25
- electron-serve: ^1.3
