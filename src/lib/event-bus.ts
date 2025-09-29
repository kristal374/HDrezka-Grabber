/** Нормализуем форму аргументов события в кортеж */
type NormalizeArgs<T> = T extends undefined | void
  ? []
  : T extends any[]
    ? T
    : [T];

/** Проверка на "тождество" типов-кортежей */
type TupleEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

/** Пояснительный тип, дающий полезную ошибку в случае несовместимости */
type EnsureParamsMatch<
  EventArgs extends unknown[],
  SourceParams extends unknown[],
> =
  TupleEqual<EventArgs, SourceParams> extends true
    ? {}
    : {
        __INCOMPATIBLE__: [
          'Event expects',
          EventArgs,
          'but source listener has',
          SourceParams,
        ];
      };

/** Конкретные интерфейсы источников */
type ListenerSource<P extends unknown[]> = {
  addListener(callback: (...args: P) => any): void;
  removeListener(callback: (...args: P) => any): void;
};

type EventTargetSource<P extends unknown[]> = {
  addEventListener(type: string, callback: (...args: P) => void): void;
  removeEventListener(type: string, callback: (...args: P) => void): void;
};

type Handler<T extends Record<string, unknown>, K extends keyof T = keyof T> = (
  ...args: NormalizeArgs<T[K]>
) => unknown;

type QueueItem<
  T extends Record<string, unknown>,
  K extends keyof T = keyof T,
> = {
  type: K;
  args: NormalizeArgs<T[K]>;
  resolve?: (v: any) => void;
  reject?: (e: any) => void;
};

export class BufferedEventBus<T extends Record<string, unknown>> {
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
  public addMessageSource<K extends keyof T>(
    eventName: K,
    source: ListenerSource<any> | EventTargetSource<any>,
  ): void {
    this.assertIsObject(source);

    let map =
      this.sourceHandlers.get(source) ??
      new Map<keyof T, Handler<T, keyof T>>();
    if (map.has(eventName)) return;

    const handler = this.modifyHandler(eventName);
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
  public removeMessageSource<K extends keyof T>(
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

  private assertIsObject(source: any): void {
    if (!source || typeof source !== 'object') {
      throw new Error(
        'Argument "source" must be an object with addListener or addEventListener',
      );
    }
  }

  private modifyHandler<K extends keyof T>(type: K): Handler<T, K> {
    return (...args) => {
      if (this.isReady && this.listeners.get(type)?.size) {
        return this.callHandlersAndCollect(type, args);
      } else {
        return new Promise((resolve, reject) => {
          this.queue.push({ type, args, resolve, reject });
        });
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
        // представим синхронную ошибку как отклонённый Promise, чтобы унифицировать обработку
        return Promise.reject(err);
      }
    });

    const hasPromise = results.some(
      (result) => result && typeof (result as any).then === 'function',
    );

    if (!hasPromise) {
      return results.length === 1 ? results[0] : results;
    }

    return Promise.all(results).then((resolved) =>
      resolved.length === 1 ? resolved[0] : resolved,
    );
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
