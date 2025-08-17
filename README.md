## Prompt Manager

**GitHub repository**: `https://github.com/Tonvenio/Prompt-Manager`

This repository contains a Next.js 15 (App Router) + TypeScript project for managing and improving prompts with Langfuse integration.

### Getting started
- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

### Project layout
- App code: `langfuse-ui/`
- Next.js routes and API handlers: `langfuse-ui/app/**`

### Git commands (including nested folder fix)

- Initial repo setup and first push:
```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Tonvenio/Prompt-Manager.git
git push -u origin main
```

- If the remote URL was added incorrectly, fix it:
```bash
git remote set-url origin https://github.com/Tonvenio/Prompt-Manager.git
```

- If `langfuse-ui/` was a nested Git repo and you need to convert it to a normal directory:
```bash
# remove the gitlink from the index (files remain on disk)
git rm --cached -r langfuse-ui

# delete the inner Git metadata so the parent repo can track files
rm -rf langfuse-ui/.git

# re-add and commit as normal files
git add langfuse-ui
git commit -m "Convert langfuse-ui from nested repo to normal directory"
git push
```

- Normal workflow after that:
```bash
git add -A
git commit -m "Message"
git push
```


