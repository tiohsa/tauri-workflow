# Repository Guidelines

This project is a Tauri + SvelteKit + TypeScript desktop app for flowchart‑based project planning. Keep changes focused, small, and consistent with existing patterns.

## Project Structure & Module Organization
- `src/` app code
  - `routes/` SvelteKit routes (entry pages)
  - `lib/` domain logic and UI
    - `domain/` entities and types
    - `usecases/` core logic (e.g., `autoLayout.ts`, `scheduleBackward.ts`)
    - `presentation/` components, stores, infrastructure
- `src-tauri/` Tauri (Rust) desktop wrapper
- `static/` static assets
- `.env.sample` configuration template (copy to `.env`)

## Build, Test, and Development Commands
- `pnpm tauri dev`: run the desktop app (hot reload). Requires Rust toolchain.
- `pnpm dev`: run web dev server (for quick UI iteration).
- `pnpm build`: build web assets.
- `pnpm tauri build`: create a distributable desktop binary.
- `pnpm check`: type and Svelte diagnostics via `svelte-check`.

## Coding Style & Naming Conventions
- Language: TypeScript + Svelte 5. Use explicit types for exported/public APIs.
- Indentation: 2 spaces; keep imports ordered; prefer early returns.
- Naming: `PascalCase.svelte` for components; `camelCase` for variables/functions; feature‑scoped modules in `lib/`.
- Formatting/Linting: follow existing style; run `pnpm check` before PRs.

## Testing Guidelines
- No formal test suite yet. Use `pnpm check` and manual QA via `pnpm tauri dev`.
- Add targeted unit tests when introducing complex logic (e.g., layout or scheduling). Place alongside implementation or in a nearby `__tests__` folder.

## Commit & Pull Request Guidelines
- Commits: use clear messages; Conventional Commits prefixes are preferred (e.g., `feat:`, `fix:`, `chore:`). Keep diffs focused.
- PRs: include purpose, scope, screenshots/GIFs for UI changes, and steps to verify. Link related issues.
- If changing core logic (e.g., `usecases/autoLayout.ts`), explain rationale and edge cases.

## Security & Configuration Tips
- Copy `.env.sample` to `.env`; add API keys as needed for AI features (e.g., Google Generative AI via LangChain). Do not commit `.env`.
- Tauri FS/dialog/opener plugins are enabled; avoid introducing new native permissions without justification.

## Architecture Overview
- Graph rendered via `@xyflow/svelte` in `presentation/components` (see `FlowCanvas.svelte`).
- Planning logic lives in `lib/usecases/`; persistence via `TauriFsAdapter`.


Please provide all answers in Japanese