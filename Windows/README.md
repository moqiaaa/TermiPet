# TermiPet Windows

TermiPet 的 Windows 版本，使用 Tauri v2 + React + TypeScript 构建。

## 环境要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (通过 rustup 安装)
- Windows 10/11
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ 桌面开发工作负载)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 11 已自带)

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（热重载）
npm run tauri dev

# 3. 构建安装包（生成 .msi 和 .exe）
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`：
- `nsis/TermiPet_1.0.0_x64-setup.exe` — NSIS 安装包
- `msi/TermiPet_1.0.0_x64_en-US.msi` — MSI 安装包

## 功能列表

所有功能与 Mac 版保持一致：

- 🐾 桌面悬浮宠物（15 种宠物可选，spritesheet 动画）
- 🎨 3 种皮肤主题（玻璃 / 暗黑 / 像素）
- 🌐 5 种语言（简中 / 繁中 / 英 / 日 / 韩）
- 📋 Claude Code 命令面板（18 个默认命令 + 自定义）
- 💬 宠物聊天（Ollama / OpenAI / Google Gemini / 自定义 API）
- 🎭 10 种性格预设
- 🔌 Claude Code Hook 集成（TCP 服务器 23456-23460）
- 📊 AI 用量追踪（Claude Code / Codex / Copilot）
- ⏰ 番茄钟（25 分钟专注 + 5 分钟休息）
- ⚙️ 系统托盘常驻

## 项目结构

```
Windows/
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   │   ├── pet/            # 宠物面板（动画、工具栏、命令、用量）
│   │   ├── chat/           # 聊天覆盖层
│   │   ├── settings/       # 设置窗口（7 个标签页）
│   │   └── common/         # 通用组件
│   ├── stores/             # Zustand 状态管理
│   ├── hooks/              # 自定义 hooks（动画、拖拽、悬停）
│   ├── locales/            # 多语言翻译
│   ├── styles/             # 主题和全局样式
│   └── types/              # TypeScript 类型定义
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── lib.rs          # 应用入口、插件注册
│   │   ├── commands.rs     # IPC 命令（宠物、设置、聊天）
│   │   ├── hook_server.rs  # Claude Code TCP Hook 服务器
│   │   └── tray.rs         # 系统托盘
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
├── public/pets/            # 宠物资源包
└── package.json            # Node.js 依赖
```
