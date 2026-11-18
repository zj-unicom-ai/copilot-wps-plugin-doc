<p align="center">
  <img src="docs/assets/logo.png" alt="Social Preview" width="240" />
</p>

# AI智写

> **中文** | [English](README_EN.md)

一款 WPS Office 插件，将 AI 驱动的写作、润色、排版、思维导图和翻译功能直接融入你的文档工作流。它在 WPS 功能区中集成了功能完整的 **AI智写** 助手，让你无需离开编辑器即可起草、打磨和排版内容。

## 功能特性

- **自由写作** — 任务窗格中的 AI 聊天助手，支持自然语言指令起草完整段落、多轮对话、将结果直接插入文档，并在会话中保持上下文。
- **场景写作** — 预置提示词卡片，覆盖职场、媒体、教育、营销等场景；每张卡片点击后打开聊天窗格并自动载入领域调优的提示词，一键产出贴合场景的内容。
- **润色** — 对选中文本进行改写、扩写、缩写、续写，可调节语气与长度，快速完成结构性修改而无需手动遣词造句。
- **校对** — 智能纠错，扫描文本中的错别字、语法问题和用词不当，并将修改建议就地插入供你审阅。
- **排版** — 智能文档排版模板，为内容统一应用标题、间距、编号等格式，一步将初稿变为整洁规范的结构化文档。
- **思维导图** — 将选中文本或整篇文档转为可交互的思维导图，直观梳理思路；导图可折叠、展开并回写到文档。
- **翻译** — 在主要语种之间翻译选中内容或全文，译文写回文档的同时保留原文结构。
- **工具箱** — 一键文档实用工具，如去除多余空格、敏感信息脱敏等常用清理操作。

## 环境要求

- 支持 JS 插件的 WPS Office
 一个 OpenAI 兼容的 LLM API（接口地址 + API Key）

> **仅源码编译安装需要：** Node.js 18+

## 快速开始

### 方式一 — 下载安装包（推荐）

1. 前往 [Releases 发布页](../../releases)，下载最新的 `wps-copilot-plugin-x.y.z.exe` Windows 安装包。
2. 如 WPS Office 正在运行，请先关闭。
3. 双击下载的 `.exe`，按安装向导提示完成安装。
4. 启动 WPS Office，插件功能区将自动出现。随后参照 **首次配置** 完成设置。

> 此方式仅需 WPS Office（支持 JS 插件）和一个 LLM API。

### 方式二 — 源码编译安装（开发者）

```bash
npm install
npm i -g wpsjs
wpsjs debug
```

或直接使用 Vite：

```bash
npm run dev
```

> **本地开发与跨域：** 通过 `npm run dev` / `wpsjs debug` 运行时，跨域 LLM 接口请求会自动经 `/llm-proxy` 代理，无需在设置中修改 API 地址。若更新涉及 `vite.config.js`，拉取代码后请重启开发服务器。

## 首次配置

1. 在 WPS 中打开本插件。
2. 进入 **帮助 → 设置**。
3. 配置 **模型配置**：
   - **API 地址** — 例如 `https://www.uni-router.net/v1/chat/completions`
   - **API Key** — 你的服务商 API 密钥
   - **模型** — 例如 `gpt-4o-mini`
4. 保存后即可开始使用 AI 功能。

> API Key 仅保存在本地，不会上传至本项目服务器。

## 推荐接入的模型供应商

推荐使用 [UniRouter（联通词元服务平台）](https://www.uni-router.net/)。它提供 OpenAI 兼容的统一 API，一站式聚合 200+ 主流大模型（如 DeepSeek、通义千问、智谱、MiniMax 等），用一套接口即可完成多模型调用与切换。

主要能力：

- **统一接入** — 一个 API Key、一行代码即可调用全站模型，显著降低对接成本
- **智能调度** — 按时延、成本与负载择优路由，高峰分流与故障毫秒级切换
- **透明计费** — 实时用量与明细账单，支持多维度成本管控
- **灵活密钥** — 支持平台统一密钥与自有密钥（BYOK）两种接入方式
- **安全合规** — 调用链路可审计，适配企业与政企场景的管控需求

在本插件中，进入 **帮助 → 设置**，模型平台选择 **UniRouter**（默认 API 地址为 `https://www.uni-router.net`），前往 [UniRouter 控制台](https://www.uni-router.net/) 获取 API Key 并选择模型后保存即可使用。更多说明见 [首次调用 API 文档](https://www.uni-router.net/docs)。

## 构建与打包

在线加载项：

```bash
npm run build
echo 'online add-in' | wpsjs build
```

产物输出到 `dist/` 和 `wps-addon-build/`。

打包为 Windows 安装包（`.exe`）：

```bash
wpsjs build --exe
```

## 卸载

关闭 WPS Office 后，打开系统目录 `%appdata%\kingsoft\wps\jsaddons`，删除本加载项相关文件即可完成卸载。

## 项目结构

```
public/
  ribbon.xml              # WPS 功能区菜单定义
src/
  features/
    chat/                 # AI 聊天任务窗格
      composables/        # useChatStream, useTranslate, usePaibanFonts …
      components/         # FontMissingModal …
    writing/              # 场景写作（提示词卡片 → 聊天窗格）
    polish/               # 校对与润色任务窗格
      composables/        # usePolishStream, useFixPolishData
    formatting/           # 智能排版模板
    mindmap/              # 思维导图视图
    settings/             # 设置页
  shared/
    wps/                  # WPS API 封装（func_wps, util, toolbox/…）
    components/           # TagInput, RadioGroup
    styles/               # 全局样式
  services/               # llmService, promptService, settingsService
  config/prompts/         # 提示词模板
  ribbon/                 # WPS 功能区入口（actions, image map）
  shared/markdown/        # 共享 markdown-it 工厂
  utils/                  # messageUtil, polishChannelUtil, format helpers
```

## 常见问题

**本插件支持非 OpenAI 格式的接口吗？**

暂不支持。目前仅支持 OpenAI 兼容的 `chat/completions` 接口，非 OpenAI API 格式暂不支持。

**本插件支持 `response` 接口吗？**

不支持。仅支持 `chat/completions` 接口，`response` 接口暂不支持。

## 联系我们

加入 QQ 群获取技术支持与交流：

| 项目 | QQ 一群 |
|------|--------|
| 群名称 | AI智写交流一群 |
| 群号 | 1077784605 |
| 二维码 | ![QQ 群](docs/assets/qrcode_qq1_1784703937347.jpg) |

## 许可证

[MIT](LICENSE)
