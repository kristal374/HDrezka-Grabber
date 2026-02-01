import BufferedEventBusInterface from '@/lib/event-bus/event-bus-interface';

export class BufferedEventBus<
  T extends Record<string, unknown>,
> implements BufferedEventBusInterface<T> {
  private listeners = new Map<keyof T, Set<any>>();
  private sourceHandlers = new WeakMap<object, Map<keyof T, Handler<T>>>();
  private queue: Array<QueueItem<T>> = [];
  private isReady = false;

  public on<K extends keyof T, H extends Handler<T, K>>(
    eventName: K,
    handler: H,
  ) {
    const set = this.listeners.get(eventName) ?? new Set();
    set.add(handler);
    this.listeners.set(eventName, set);

    this.emitAll(eventName);
  }

  public off<K extends keyof T, H extends Handler<T, K>>(
    eventName: K,
    handler: H,
  ) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(eventName);
  }

  public addMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: ListenerSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;
  public addMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: EventTargetSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;
  public addMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: (ListenerSource<P> | EventTargetSource<P>) &
      EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void {
    return this._addMessageSource(eventName, source);
  }

  private _addMessageSource<K extends keyof T>(
    eventName: K,
    source: ListenerSource<any> | EventTargetSource<any>,
  ): void {
    this.assertIsObject(source);

    let map =
      this.sourceHandlers.get(source) ??
      new Map<keyof T, Handler<T, keyof T>>();
    if (map.has(eventName)) return;

    const handler = this.modifyHandler(eventName, source);
    map.set(eventName, handler as Handler<T>);

    if ('addListener' in source) {
      source.addListener(handler);
    } else if ('addEventListener' in source) {
      source.addEventListener(eventName as string, handler);
    } else {
      throw new Error(
        'Unsupported message source (no addListener / addEventListener)',
      );
    }
    this.sourceHandlers.set(source, map);
  }

  public removeMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: ListenerSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;
  public removeMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: EventTargetSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void;
  public removeMessageSource<K extends keyof T, P extends unknown[]>(
    eventName: K,
    source: (ListenerSource<P> | EventTargetSource<P>) &
      EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
  ): void {
    return this._removeMessageSource(eventName, source);
  }

  private _removeMessageSource<K extends keyof T>(
    eventName: K,
    source: ListenerSource<any> | EventTargetSource<any>,
  ): void {
    this.assertIsObject(source);

    const map = this.sourceHandlers.get(source);
    if (!map) return;

    const handler = map.get(eventName);
    if (!handler) return;

    if ('removeListener' in source) {
      source.removeListener(handler);
    } else if ('removeEventListener' in source) {
      source.removeEventListener(eventName as string, handler);
    } else {
      throw new Error('Unsupported message source or missing event name');
    }

    map.delete(eventName);
    if (map.size === 0) this.sourceHandlers.delete(source);
  }

  public mountHandler<
    K extends keyof T,
    P extends unknown[],
    H extends Handler<T, K>,
  >(
    eventName: K,
    source: ListenerSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
    handler: H,
  ): () => void;

  public mountHandler<
    K extends keyof T,
    P extends unknown[],
    H extends Handler<T, K>,
  >(
    eventName: K,
    source: EventTargetSource<P> & EnsureParamsMatch<NormalizeArgs<T[K]>, P>,
    handler: H,
  ): () => void;

  public mountHandler<K extends keyof T, H extends Handler<T, K>>(
    eventName: K,
    source: ListenerSource<any> | EventTargetSource<any>,
    handler: H,
  ): () => void {
    this._addMessageSource(eventName, source);
    this.on(eventName, handler);

    return () => {
      this._removeMessageSource(eventName, source);
      this.off(eventName, handler);
    };
  }

  private assertIsObject(source: any): void {
    if (!source || typeof source !== 'object') {
      throw new Error(
        'Argument "source" must be an object with addListener or addEventListener',
      );
    }
  }

  private modifyHandler<K extends keyof T>(
    type: K,
    source: ListenerSource<any> | EventTargetSource<any>,
  ): Handler<T, K> {
    return (...args) => {
      if (this.isReady && this.listeners.get(type)?.size) {
        return this.callHandlersAndCollect(type, args);
      } else {
        const promise = new Promise((originResolve, reject) => {
          let resolve: (value: unknown) => void = originResolve;
          if (source === browser.runtime.onMessage) {
            resolve = (value: unknown) => {
              if (value === true) {
                // Мы уже пометили, что ответ будет дан асинхронно через sendResponse
              } else if (value === undefined || value === false) {
                // Поскольку мы уже сказали, что ответ будет дан через
                // sendResponse, попытка вернуть false или undefined в качестве
                // отказа от обработки будет принята как ответ обработчика,
                // и поскольку мы не можем асинхронно отказаться от обработки
                // вместо этого мы просто не отправляем никакого ответа
              } else {
                originResolve(value);
              }
            };
          }

          this.queue.push({ type, args, resolve, reject });
        });
        return source === browser.runtime.onMessage ? true : promise;
      }
    };
  }

  private callHandlersAndCollect<K extends keyof T>(
    type: K,
    args: NormalizeArgs<T[K]>,
  ) {
    const set = this.listeners.get(type);
    if (!set || set.size === 0) return;

    const results = Array.from(set).map((handler: Handler<T>) => {
      try {
        return handler(...args);
      } catch (err) {
        return Promise.reject(err);
      }
    });

    const hasPromise = results.some(
      (result) => result && typeof (result as any).then === 'function',
    );

    if (!hasPromise) {
      return results.length === 1 ? results[0] : results;
    }

    return Promise.all(results).then((resolved) => {
      if (resolved.length > 1) {
        resolved = resolved.filter((r) => typeof r !== 'undefined');
      }
      return resolved.length === 1 ? resolved[0] : resolved;
    });
  }

  public setReady() {
    this.isReady = true;
    this.emitAll();
  }

  private emitAll<K extends keyof T>(type?: K) {
    if (!this.isReady || this.queue.length === 0) return;

    let n = 0;
    while (n < this.queue.length) {
      if (
        (type && this.queue[n].type !== type) ||
        !this.listeners.get(this.queue[n].type)?.size
      ) {
        n++;
        continue;
      }

      const message = this.queue.splice(n, 1)[0];
      try {
        const result = this.callHandlersAndCollect(message.type, message.args);
        if (result && typeof (result as any).then === 'function') {
          // асинхронный результат
          (result as Promise<any>).then(
            (r) => message.resolve?.(r),
            (e) => message.reject?.(e),
          );
        } else {
          // синхронный результат
          message.resolve?.(result);
        }
      } catch (err) {
        message.reject?.(err);
      }
    }
  }
}
