---
description: Deploy local changes to remote server and auto-reload the app
---

# Deploy Workflow

This workflow commits local changes, pushes to remote, and deploys to the production server.

## Prerequisites
- SSH access to `zhaofanghan@10.184.17.30`
- Git repository configured with remote origin

---

## Step 1: Summarize and Commit Local Changes

Review the changes and create an appropriate commit message:

```bash
git add -A
git status
```

Then commit with a descriptive message:

// turbo
```bash
git commit -m "Your commit message here"
```

---

## Step 2: Push to Remote Repository

// turbo
```bash
git push origin main
```

---

## Step 3: Deploy on Remote Server

SSH into the remote server and pull the latest changes:

// turbo
```bash
ssh zhaofanghan@10.184.17.30 "bash -i -c 'cd /data1/zhaofanghan/back-translation-app && git pull && npm install && npm run build'"
```

---

## Step 4: Start/Restart with Auto-Reload (Optional)

To enable auto-reload on code changes, use PM2 with file watching. First-time setup:

```bash
ssh zhaofanghan@10.184.17.30 "bash -i -c 'cd /data1/zhaofanghan/back-translation-app && npx pm2 start server.js --name back-translation-app --watch'"
```

To restart an existing PM2 process:

// turbo
```bash
ssh zhaofanghan@10.184.17.30 "bash -i -c 'cd /data1/zhaofanghan/back-translation-app && npx pm2 restart back-translation-app'"
```

To check status:

```bash
ssh zhaofanghan@10.184.17.30 "bash -i -c 'npx pm2 status'"
```

---

## Quick Deploy (All-in-One)

For a single command deploy after committing:

// turbo
```bash
git push origin main && ssh zhaofanghan@10.184.17.30 "bash -i -c 'cd /data1/zhaofanghan/back-translation-app && git pull && npm install && npm run build && npx pm2 restart back-translation-app'"
```

