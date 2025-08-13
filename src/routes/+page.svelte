<script lang="ts">
  import FlowCanvas from "$lib/presentation/components/FlowCanvas.svelte";
  import ChatPanel from "$lib/presentation/components/ChatPanel.svelte";
</script>

<main class="container">
  <div class="layout">
    <div class="canvas-wrapper">
      <FlowCanvas />
    </div>
    <ChatPanel />
  </div>
</main>

<style>
  .layout {
    display: flex;
    height: 100vh;
  }
  .canvas-wrapper {
    flex: 1;
  }
</style>
