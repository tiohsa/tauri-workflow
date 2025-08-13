<script>
    import HeaderBar from "$lib/presentation/components/HeaderBar.svelte";
    import { SvelteFlowProvider } from "@xyflow/svelte";
    import "../app.css";
</script>

<div class="h-screen w-screen flex flex-col">
    <SvelteFlowProvider>
        <HeaderBar />
        <div class="flex-1 overflow-hidden">
            <slot />
        </div>
    </SvelteFlowProvider>
</div>
