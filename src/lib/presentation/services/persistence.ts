import { getContext, setContext } from 'svelte';
import type { PersistencePort } from '$lib/usecases/ports/persistencePort';

const persistencePortKey = Symbol('persistencePort');

/** Make a persistence port available via Svelte context. */
export function providePersistencePort(port: PersistencePort): void {
  setContext(persistencePortKey, port);
}

/** Retrieve the persistence port from Svelte context. */
export function usePersistencePort(): PersistencePort {
  const port = getContext<PersistencePort>(persistencePortKey);
  if (!port) {
    throw new Error('PersistencePort が提供されていません');
  }
  return port;
}

