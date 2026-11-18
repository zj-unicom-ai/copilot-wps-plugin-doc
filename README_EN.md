<p align="center">
  <img src="docs/assets/logo.png" alt="Social Preview" width="240" />
</p>

# copilot-wps-plugin-doc （AI智写）

> [中文](README.md) | **English**

A WPS Office plug-in that brings AI-powered writing, polishing, formatting, mind mapping, and translation directly into your document workflow. It integrates **AI智写** into the WPS ribbon so you can draft, refine, and lay out content without ever leaving your editor.

## Features

- **Free Writing** — An AI chat assistant living in a task pane that drafts full passages from natural-language instructions, supports multi-turn conversation, inserts results directly into the document, and keeps context across the session.
- **Scene Writing** — Preset prompt cards covering workplace, media, education, and marketing scenarios; each card opens the chat pane pre-loaded with a domain-tuned prompt so you get relevant output with one click.
- **Polish** — Rewrite, expand, abbreviate, and continue selected text with adjustable tone and length, giving you quick structural edits without manual re-wording.
- **Proofreading** — Intelligent error correction that scans text for typos, grammar faults, and wording slips, and inserts corrections in place for your review.
- **Formatting** — Smart document layout templates that apply consistent headings, spacing, and numbering to your content, turning raw drafts into clean, structured documents in one step.
- **Mind Map** — Convert selected text or an entire document into an interactive mind map for outlining ideas visually; the map can be folded, expanded, and exported back to the document.
- **Translation** — Translate selected passages or the full document between major languages, with the result written back into the document and the source structure preserved.
- **Toolbox** — One-click document utilities such as removing redundant spaces, desensitizing sensitive information, and other common clean-up actions.

## Requirements

- WPS Office with JS plug-in support
- An OpenAI-compatible LLM API (endpoint URL + API key)

> **For building from source only:** Node.js 18+

## Quick Start

### Option A — Download the pre-built installer (recommended)

1. Go to the [Releases page](../../releases) and download the latest `wps-copilot-plugin-x.y.z.exe` installer for Windows.
2. Close WPS Office if it is running.
3. Double-click the downloaded `.exe` and follow the setup wizard.
4. Launch WPS Office — the plug-in ribbon appears automatically. Proceed to **First-Time Setup**.

> Only WPS Office (with JS plug-in support) and an LLM API are required for this path.

### Option B — Build from source (developers)

```bash
npm install
npm i -g wpsjs
wpsjs debug
```

Or use Vite directly:

```bash
npm run dev
```

> **Local development & CORS:** When running via `npm run dev` / `wpsjs debug`, cross-origin LLM API calls are automatically proxied through `/llm-proxy` so you don't need to change your API URL in settings. Restart the dev server after pulling updates that touch `vite.config.js`.

## First-Time Setup

1. Open the plug-in in WPS.
2. Go to **Help → Settings**.
3. Configure **Model Configuration**:
   - **API URL** — e.g. `https://www.uni-router.net/v1/chat/completions`
   - **API Key** — your provider API key
   - **Model** — e.g. `gpt-4o-mini`
4. Save and start using AI features.

> API keys are stored locally on your machine and are never uploaded to this project's servers.

## Recommended Model Providers

We recommend [UniRouter](https://www.uni-router.net/) (China Unicom token service platform). It offers an OpenAI-compatible unified API that aggregates 200+ mainstream models (such as DeepSeek, Qwen, Zhipu, and MiniMax), so you can call and switch models through a single interface.

Key capabilities:

- **Unified access** — One API key and one line of code to reach the full model catalog, with much lower integration cost
- **Smart routing** — Preferential routing by latency, cost, and load, with peak-time offload and millisecond failover
- **Transparent billing** — Real-time usage and itemized invoices for multi-dimensional cost control
- **Flexible keys** — Platform-issued keys or bring-your-own-key (BYOK)
- **Security & compliance** — Auditable call trails suited to enterprise and government scenarios

In this plug-in, open **Help → Settings**, choose **UniRouter** as the model platform (default API URL: `https://www.uni-router.net`), create an API key in the [UniRouter console](https://www.uni-router.net/), pick a model, and save. See the [API getting-started docs](https://www.uni-router.net/docs) for details.

## Build & Package

Online add-in:

```bash
npm run build
echo 'online add-in' | wpsjs build
```

Output is written to `dist/` and `wps-addon-build/`.

Package as a Windows installer (`.exe`):

```bash
wpsjs build --exe
```

## Uninstall

After closing WPS Office, open `%appdata%\kingsoft\wps\jsaddons` and delete the files related to this add-in to uninstall it.

## Project Structure

```
public/
  ribbon.xml              # WPS ribbon menu definition
src/
  features/
    chat/                 # AI chat task pane
      composables/        # useChatStream, useTranslate, usePaibanFonts …
      components/         # FontMissingModal …
    writing/              # Scene writing (prompt cards → chat pane)
    polish/               # Proofreading & polish task pane
      composables/        # usePolishStream, useFixPolishData
    formatting/           # Smart layout templates
    mindmap/              # Mind map view
    settings/             # Settings page
  shared/
    wps/                  # WPS API wrappers (func_wps, util, toolbox/…)
    components/           # TagInput, RadioGroup
    styles/               # Global styles
  services/               # llmService, promptService, settingsService
  config/prompts/         # Prompt templates
  ribbon/                 # WPS ribbon entry (actions, image map)
  shared/markdown/        # Shared markdown-it factory
  utils/                  # messageUtil, polishChannelUtil, format helpers
```

## FAQ

**Does the plug-in support non-OpenAI-compatible API endpoints?**

Not at this time. The plug-in currently only supports OpenAI-compatible `chat/completions` endpoints. Non-OpenAI API formats are not supported.

**Does the plug-in support the `response` API endpoint?**

No. Only the `chat/completions` interface is supported; the `response` endpoint is not supported.

## Contact Us

Join our QQ group for support and discussion:

| Item | QQ 一群 |
|------|---------|
| Group Name | AI智写交流一群 |
| Group Number | 1077784605 |
| QR Code | ![QQ group](docs/assets/qrcode_qq1_1784703937347.jpg) |

## License

[MIT](LICENSE)
