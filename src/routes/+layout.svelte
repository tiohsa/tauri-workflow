<script lang="ts">
  import HeaderBar from "$lib/presentation/components/HeaderBar.svelte";
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import { TauriFsAdapter } from "$lib/infrastructure/persistence/tauriFsAdapter";
  import { providePersistencePort } from "$lib/presentation/services/persistence";
  import "../app.css";

  providePersistencePort(new TauriFsAdapter());
</script>

<div class="h-screen w-screen flex flex-col">
  <SvelteFlowProvider>
    <HeaderBar />
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
  </SvelteFlowProvider>
</div>

