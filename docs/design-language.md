# Design language (#453)

One rule: **UI comes from `@components/ui`, icons from `@components/ui/icons`. Nothing else imports `@mui/*`** (ESLint warns; only `src/web/components/ui/` and `custom-styles/theme.tsx` may).

Two places hold the look:

| Where                                 | What it holds                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `custom-styles/theme.tsx` (MUI theme) | Colours (`THEME_TOKENS`), radius, font, shared component defaults and overrides. Change how something _looks everywhere_ here.      |
| `components/ui/*` (wrappers)          | Which variants, colours and sizes exist at all (the types), and where MUI is imported. Change _what is allowed_, or swap MUI, here. |

A theme alone cannot do this: it styles components but cannot stop a new `variant` or colour being passed, and every file would still import MUI.

## What is allowed

| Component                                                         | Allowed                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                          | variant `contained` / `outlined` / `text`; colour `primary` (accent), `secondary` (AI only, use `AiButton`), `error`, `neutral` (grey outline, for Cancel / Close / See results); size `small` / `medium` / `large` |
| `IconButton`                                                      | colour `default` / `inherit` / `primary` / `secondary` / `error`; size `small` / `medium` / `large`. Always an `aria-label`                                                                                         |
| `Alert`                                                           | severity `error` / `warning` / `info` / `success`                                                                                                                                                                   |
| `Chip`                                                            | size `small` / `medium`                                                                                                                                                                                             |
| `Typography`                                                      | variant `body1` `body2` `caption` `subtitle1` `subtitle2` `overline` `h4` `h5` `h6`; use `component` for the HTML tag (`h1` to `h3` are tags, not looks)                                                            |
| `Link`                                                            | underline `none` / `hover` / `always`; colour `inherit` / `primary` / `secondary` / `error` / `text.secondary`                                                                                                      |
| `TextField`, `Select`                                             | variant `outlined` / `standard`; size `small` / `medium`                                                                                                                                                            |
| `FormControl`, `Checkbox`, `Radio`, `Switch`, `ToggleButtonGroup` | size `small` / `medium`                                                                                                                                                                                             |
| `Paper`                                                           | variant `outlined` / `elevation`                                                                                                                                                                                    |
| `Dialog`                                                          | max width `xs` / `sm` / `md` / `lg` (or `false`)                                                                                                                                                                    |

Everything else (`Box`, `Stack`, `Grid`, `Tooltip`, `Menu`, `MenuItem`, `Tabs`, tables, lists, ...) is exported from `ui/mui.ts` as it is. They are the swap point too: to restyle or restrict one, write a wrapper file in `ui/`, export it from `index.ts` and remove it from `mui.ts`.

## Rules

- **Icons:** the `*Outlined` set only (`InfoOutlined`, not `Info`). Add a new icon to `ui/icons.ts`. `LinkedIn` is the only exception (no outlined version exists).
- **AI:** purple and the sparkle always (`AiButton`, `AiIcon`, `AiBadge`); see `CLAUDE.md`.
- **Colours:** use the theme tokens (`cssVar("pn")`, `var(--ai)`, palette keys), never a literal hex in a component.
- **Text:** a `Typography` variant, not a font size in `sx`.
- **Adding a look:** add it to the type in the wrapper (and the theme if it needs styling), then use it. A prop value the type does not list is a compile error on purpose.
- **Swapping MUI:** replace the imports in `ui/*.ts(x)`; no other file changes.
