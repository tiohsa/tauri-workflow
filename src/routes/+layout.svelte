<script>
    import HeaderBar from "$lib/presentation/components/HeaderBar.svelte";
</script>

<div class="h-screen w-screen flex flex-col">
    <HeaderBar />
    <div class="flex-1 overflow-hidden">
        <slot />
    </div>
</div>
