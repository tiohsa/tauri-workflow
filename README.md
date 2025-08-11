# Tauri Workflow

**Tauri Workflow** is a **flowchart-based workflow and project management application** built with **Tauri + SvelteKit + TypeScript**.

With an intuitive node-based UI, you can visually define tasks and dependencies,
perform **Critical Path Analysis**, and manage your projects more effectively.

---

## Key Features

* **Visual Flowchart UI**
  Create and arrange tasks via drag-and-drop, and set dependencies intuitively.

* **Critical Path Analysis**
  Automatically identify the sequence of essential tasks required to complete the project.

* **Data Persistence**
  Save and load your workflows as files for future editing.

* **Flexible Node Settings**
  Customize each task node with a name, estimated effort hours, and detailed information.

---

## Tech Stack

| Category            | Technology                                                             |
| ------------------- | ---------------------------------------------------------------------- |
| Desktop Framework   | [Tauri v2](https://tauri.app/)                                         |
| Frontend            | [Svelte v5](https://svelte.dev/), [SvelteKit](https://kit.svelte.dev/) |
| Build Tool          | [Vite](https://vitejs.dev/)                                            |
| Flowchart Rendering | [@xyflow/svelte](https://xyflow.com/svelte)                            |
| Languages           | TypeScript, Rust                                                       |

---

## Setup (For Developers)

### Prerequisites

Make sure you have the following installed:

* [Node.js](https://nodejs.org/)
* [pnpm](https://pnpm.io/)
* [Rust](https://www.rust-lang.org/tools/install)

### Installation & Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

---

## Build (For Distribution)

```bash
pnpm tauri build
```

The built executable will be generated in:

```
src-tauri/target/release/
```
