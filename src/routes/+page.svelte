<script lang="ts">
  import FlowCanvas from "$lib/presentation/components/FlowCanvas.svelte";
  import ChatPanel from "$lib/presentation/components/ChatPanel.svelte";
  import { uiProcessing, chatOpen } from "$lib/presentation/stores/ui";
  import { t } from "$lib/presentation/stores/i18n";
  import { get } from "svelte/store";
  let isProcessing = $state(false);
  let tr = $state(get(t));
  let isChatOpen = $state(true);
  $effect(() => {
    const un = uiProcessing.subscribe((v) => (isProcessing = v));
    return () => un?.();
  });
  $effect(() => {
    const un = t.subscribe((v) => (tr = v));
    return () => un?.();
  });
  $effect(() => {
    const un = chatOpen.subscribe((v) => (isChatOpen = v));
    return () => un?.();
  });
</script>

<main class="h-full">
  <div class="flex h-full">
    <div class="flex-1">
      <FlowCanvas />
    </div>
    {#if isChatOpen}
      <ChatPanel />
    {/if}
  </div>
</main>

{#if isProcessing}
  <div class="global-processing-overlay">{tr?.processing ?? '処理中...'}</div>
{/if}

<style>
  .global-processing-overlay {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    font-size: 14px;
  }
</style>
