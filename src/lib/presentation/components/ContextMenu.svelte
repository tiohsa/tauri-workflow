<script lang="ts">
  export let top: number | undefined;
  export let left: number | undefined;
  export let right: number | undefined;
  export let bottom: number | undefined;
  export let actions: { label: string, onSelect: () => void }[] = [];

  function handleClick(onSelect: () => void) {
    onSelect();
  }
</script>

<div
  style:top={top ? `${top}px` : 'auto'}
  style:left={left ? `${left}px` : 'auto'}
  style:right={right ? `${right}px` : 'auto'}
  style:bottom={bottom ? `${bottom}px` : 'auto'}
  class="context-menu"
>
  <ul>
    {#each actions as action}
      <li>
        <button on:click={() => handleClick(action.onSelect)}>
          {action.label}
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .context-menu {
    position: absolute;
    min-width: 150px;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    z-index: 10;
    padding: 0.5rem 0;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
  }
  li button:hover {
    background-color: #f1f5f9;
  }
</style>
