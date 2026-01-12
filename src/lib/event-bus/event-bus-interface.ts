export interface BufferedEventBusInterface<T extends Record<string, unknown>> {
  on<K extends keyof T, H extends Handler<T, K>>(
    eventName: K,
    handler: H,
  ): void;

  off<K extends keyof T, H extends Handler<T, K>>(
    eventName: K,
    handler: H,
  ): void;

  addMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: ListenerSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;

  addMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: EventTargetSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;

  removeMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: ListenerSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;

  removeMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: EventTargetSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;

  mountHandler<K extends keyof T, P extends unknown[], H extends Handler<T, K>>(
    eventName: K,
    source: ListenerSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
    handler: H,
  ): () => void;

  mountHandler<K extends keyof T, P extends unknown[], H extends Handler<T, K>>(
    eventName: K,
    source: EventTargetSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
    handler: H,
  ): () => void;

  setReady(): void;
}

export default BufferedEventBusInterface;
