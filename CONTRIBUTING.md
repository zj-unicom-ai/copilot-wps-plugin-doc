# Contributing

Thank you for your interest in contributing to **wps-copilot-plugin** (product UI name: AI智写).

## Language

The add-in UI is **Chinese-only** for now. English source comments and docs are welcome.

## Development Setup

1. Install Node.js 18+
2. Clone the repository and run `npm install`
3. Install the WPS CLI once: `npm i -g wpsjs`
4. Start with `wpsjs debug` or `npm run dev` (port 3890)
5. Configure your LLM API in **Settings → Model Configuration** inside the add-in

## Directory Conventions

- New UI pages go under `src/features/<feature>/`
- Logic shared across features lives in `src/shared/`
- Cross-cutting utilities stay in `src/utils/`
- LLM and settings access go through `src/services/`
- Keep individual files under ~400 lines when practical
- Prompt bodies: edit `src/config/prompts/domains/*.json` then `npm run extract-prompts` (see [docs/prompts/README.md](docs/prompts/README.md))
- Architecture overview: [docs/architecture.md](docs/architecture.md)

## Code Style

- Run `npm run lint`, `npm run format:check`, and `npm test` before submitting
- Prefer Vue 3 Composition API (`<script setup>` when adding new components)
- Keep changes focused; avoid unrelated refactors in the same PR

## Pull Requests

1. Fork and create a feature branch
2. Ensure `npm run build` and `npm test` succeed
3. Describe what changed and how to test it
4. Do **not** commit API keys, tokens, `.env` files, or internal network addresses
5. By submitting a pull request, you accept the [Contribution License](#contribution-license-agreement-贡献许可协议) below

## Contribution License Agreement 贡献许可协议

**English.** By submitting a pull request, patch, or any other contribution to this repository (including via issues or code review), you irrevocably and unconditionally grant the project owner and all recipients of the project a worldwide, royalty-free, perpetual, transferable license to use, copy, modify, merge, publish, distribute, sublicense, and/or sell your contribution as part of the project, under the [MIT License](LICENSE) or any future open-source license the project adopts. You represent that you are entitled to grant this license, and your contribution is submitted **without any additional terms, conditions, or restrictions**. No separate signature is required — submission itself constitutes acceptance of this agreement. Contributions that are accompanied by additional licensing conditions may be rejected.

**中文。** 向本仓库提交 Pull Request、补丁或其他任何形式的贡献（包括通过 Issue 或代码评审提交的内容），即视为您**无条件且不可撤销**地授予本项目所有者及项目所有接收者**全球范围、免版税、永久、可转让**的许可：在 [MIT 许可证](LICENSE) 或本项目未来采用的其他开源许可证之下，将您的贡献作为项目的一部分进行使用、复制、修改、合并、发布、分发、再许可及销售。您声明您有权授予上述许可，且您的贡献**不附带任何额外条款、条件或限制**。无需另行签署文件，提交行为本身即构成对本协议的接受。附带额外许可条件的贡献可能被拒绝接受。

## Reporting Issues

Please include WPS version, OS, Node.js version, and steps to reproduce.
Do not paste API keys into issues.
