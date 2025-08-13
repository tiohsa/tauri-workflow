import { getContext, setContext } from 'svelte';
import type { PersistencePort } from '$lib/usecases/ports/persistencePort';

const persistencePortKey = Symbol('persistencePort');

export function providePersistencePort(port: PersistencePort): void {
  setContext(persistencePortKey, port);
}

export function usePersistencePort(): PersistencePort {
  const port = getContext<PersistencePort>(persistencePortKey);
  if (!port) {
    throw new Error('PersistencePort が提供されていません');
  }
  return port;
}

