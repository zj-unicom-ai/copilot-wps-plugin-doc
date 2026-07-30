# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please report it privately via GitHub Security Advisories
(or a private channel to maintainers). Do not open a public issue for unfixed vulnerabilities.

## Sensitive Data

- **Never commit API keys, tokens, or credentials** to this repository
- LLM API keys are stored locally in WPS FileSystem / localStorage via user settings
- Do not include internal network IPs or proprietary backend URLs in contributions
- Treat **LLM / model output as untrusted content**: UI paths sanitize Markdown HTML with DOMPurify

## API Key Storage

Users configure their own OpenAI-compatible API endpoint and key in the add-in settings.
Keys remain on the user's machine and are sent only to the configured endpoint.

## Development LLM proxy

`vite-plugins/llmDevProxy.js` forwards Authorization headers to a user-specified upstream
**only while the Vite development server is running**. Do not expose that proxy on a public network.
