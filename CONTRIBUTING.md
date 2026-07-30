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

## Reporting Issues

Please include WPS version, OS, Node.js version, and steps to reproduce.
Do not paste API keys into issues.
