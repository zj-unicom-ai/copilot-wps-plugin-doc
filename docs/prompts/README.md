# Prompt documentation

This folder holds contributor notes about prompt templates.

**Do not commit** customer documents, internal news drafts, or real organization/person names.

## Source of truth

| Path | Role |
| --- | --- |
| `src/config/prompts/domains/*.json` | Edit here |
| `src/config/prompts/prompts.json` | Generated merge — **do not hand-edit** |
| `src/features/polish/data/polishPrompts.js` | UI tips / labels only (no LLM prompt bodies) |

After editing `domains/*.json`, regenerate:

```bash
npm run extract-prompts
```

`extract-prompts` merges `domains/*.json` into `prompts.json` (and regenerates `codes.js`).  
If a legacy CSV is present under `docs/prompts/`, it is preferred for import.

Runtime code uses `resolvePrompt()` from `src/services/promptService.js`, which reads `prompts.json`.
