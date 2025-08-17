# WorkPath

WorkPath is a desktop application for “flowchart-based project planning” built with Tauri + SvelteKit + TypeScript.
With a node-based intuitive UI, you can visualize tasks and dependencies, and efficiently manage progress using planning methods such as Critical Path and Backward Scheduling.

---

## Main Features

* **Visual Flowchart**: Create nodes via drag & drop and intuitively connect dependencies.
* **Auto Layout**: Avoid overlaps and arrange levels using `autoLayout`.
* **Schedule Calculation**: Backward scheduling from deadlines using `scheduleBackward` (supports buffers and 50% estimate compression).
* **Critical Chain**: Helps identify critical paths (`criticalChain.ts`).
* **Persistence**: Save and load JSON files via Tauri’s file dialog/FS plugin.
* **AI Assistance (optional)**: Automatically generate and decompose tasks from goals (Google Generative AI + LangChain).

---

## Tech Stack

* **Desktop**: Tauri v2 (Rust)
* **Frontend**: Svelte 5 + SvelteKit, Vite
* **Diagram Rendering**: `@xyflow/svelte`
* **Languages**: TypeScript / Rust

---

## Setup

Please prepare the following in advance:

* Node.js / pnpm
* Rust (Tauri toolchain)

Initial setup and development launch:

```bash
pnpm install
pnpm tauri dev
```

If you want to quickly preview the UI for web only:

```bash
pnpm dev
```

Type/diagnostic check:

```bash
pnpm check
```

---

## Build

Create a desktop-distributable binary:

```bash
pnpm tauri build
```

Example output:

```
src-tauri/target/release/
```

Build only web assets:

```bash
pnpm build
```

---

## Project Structure

Main directories:

```
src/
  routes/            # SvelteKit routes
  lib/
    domain/          # Entities / types
    usecases/        # Core logic (autoLayout / scheduleBackward / criticalChain, etc.)
    presentation/    # UI components, stores, infrastructure
    infrastructure/
      persistence/   # Save/load with TauriFsAdapter
      ai/            # LangChain + Google Generative AI integration
src-tauri/           # Tauri (Rust)
static/
```

Key components/modules:

* `presentation/components/FlowCanvas.svelte`: Flowchart canvas (`@xyflow/svelte`).
* `usecases/autoLayout.ts`: Automatic node arrangement.
* `usecases/scheduleBackward.ts`: Backward scheduling from deadlines.
* `infrastructure/persistence/tauriFsAdapter.ts`: Save/load JSON via dialog.
* `infrastructure/ai/taskGenerator.ts`: Task generation/decomposition from goals.

---

## AI Feature Setup (Optional)

To enable AI features, copy `.env.example` to `.env` and set the provider and API keys:

```bash
cp .env.example .env
# Open .env and set the following:
VITE_LLM_PROVIDER=gemini   # or "openai"
VITE_GOOGLE_API_KEY="your_google_api_key"
VITE_OPENAI_API_KEY="your_openai_api_key"
```

* `VITE_LLM_PROVIDER`: `gemini` or `openai`
* `VITE_GOOGLE_API_KEY`: required when using Gemini
* `VITE_OPENAI_API_KEY`: required when using OpenAI
* Implementation: `src/lib/infrastructure/ai/taskGenerator.ts`
* To disable: leave the corresponding API key unset and avoid invoking AI features in the UI.

---

## Tauri Plugins and Permissions

* Plugins used: FS, Dialog, Opener (limited to standard file operations/dialogs).
* Avoid adding new native permissions unless necessary. If needed, document the reason in README/PR.

---

## Development Guidelines

* **Language/Naming**: TypeScript + Svelte 5. Explicitly type public APIs. Use `PascalCase.svelte` for components, and `camelCase` for functions/variables.
* **Style**: 2-space indentation, organized import order, early returns preferred.
* **Testing**: Small unit tests are encouraged for critical logic (layout/scheduling). Main QA via manual testing (`pnpm tauri dev`).
* **Checks**: Run `pnpm check` for type/diagnostic checks.
* **Change size**: Keep PR changes minimal and focused on purpose.

---

## Troubleshooting

* **AI-related error at startup**: `.env`’s `VITE_GOOGLE_API_KEY` is not set. If not using AI features, avoid related UI or disable in code.
* **Tauri build failure**: You may be missing Rust toolchain or OS-specific prerequisites. Refer to the official documentation.

---

## Command List (Excerpt)

* `pnpm tauri dev`: Launch desktop app (hot reload).
* `pnpm dev`: Launch web dev server (quick UI check).
* `pnpm build`: Build web assets.
* `pnpm tauri build`: Create desktop distributables.
* `pnpm check`: Type and Svelte diagnostics.
