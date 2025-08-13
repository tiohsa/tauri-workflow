<script lang="ts">
  import FlowCanvas from "$lib/presentation/components/FlowCanvas.svelte";
  import ChatPanel from "$lib/presentation/components/ChatPanel.svelte";
</script>

<main class="h-full">
  <div class="flex h-full">
    <div class="flex-1">
      <FlowCanvas />
    </div>
    <ChatPanel />
  </div>
</main>
