---
name: squeezy-cv-reference
description: Detailed architecture notes for Squeezy CV (templates and jobs, vault, routing, AI routes and privacy masking, pagination, auto-fit, PDF, workspace UI, saving, applications). Read the matching file before changing that area; CLAUDE.md only has the short version.
---

# Squeezy CV reference

Read only the file for the area you touch:

- `references/data-model.md`: templates and jobs, vault format and migrations, bullets, saving, server and storage, data repo, applications.
- `references/routing.md`: the hand-written router and every address.
- `references/ai.md`: `/api/ai/*` routes, providers, Send to AI dialog, scrubbing and masking, chat, AI import.
- `references/layout-fit-pdf.md`: page look, pagination, fit numbers, auto-fit, skill display, hide to fit, PDF, export dialog.
- `references/workspace-ui.md`: top bar, rail, panels, outline, theme, canvas shortcuts, style settings, resizable panels.

The notes were moved out of CLAUDE.md and can lag behind the code. When you find a stale detail, fix it in the same change.
