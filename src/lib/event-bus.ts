import mitt, { Handler } from 'mitt';

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
  addEventListener(type: string, callback: (...args: P) => any): void;
  removeEventListener(type: string, callback: (...args: P) => any): void;
};

export class BufferedEventBus<T extends Record<string, unknown>> {
  private emitter = mitt<{ [K in keyof T]: NormalizeArgs<T[K]> }>();
  private queue: Array<{ type: keyof T; args: NormalizeArgs<T[keyof T]> }> = [];
  private isReady = false;

  public on<
    K extends keyof T,
    H extends (...args: NormalizeArgs<T[K]>) => unknown,
  >(eventName: K, handler: H) {
    const wrapper: Handler<NormalizeArgs<T[K]>> = (tuple) => handler(...tuple);
    this.emitter.on(eventName, wrapper);
    this.emitAll(eventName);
  }

  public off<
    K extends keyof T,
    H extends (...args: NormalizeArgs<T[K]>) => unknown,
  >(eventName: K, handler: H) {
    const wrapper: Handler<NormalizeArgs<T[K]>> = (tuple) => handler(...tuple);
    this.emitter.off(eventName, wrapper);
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
    if (!source || typeof source !== 'object') {
      throw new Error(
        'Argument "source" must be an object with addListener or addEventListener',
      );
    }

    const handler = this.modifyHandler(eventName);
    if ('addListener' in source) {
      source.addListener(handler);
    } else if ('addEventListener' in source) {
      source.addEventListener(eventName as string, handler);
    } else {
      throw new Error(
        'Unsupported message source (no addListener / addEventListener)',
      );
    }
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
    if (!source || typeof source !== 'object') return;

    const handler = this.modifyHandler(eventName);
    if ('removeListener' in source) {
      source.removeListener(handler);
    } else if ('removeEventListener' in source) {
      source.removeEventListener(eventName as string, handler);
    } else {
      throw new Error('Unsupported message source or missing event name');
    }
  }

  private modifyHandler<K extends keyof T>(type: K) {
    return (...argsArray: NormalizeArgs<T[K]>) => {
      if (this.isReady) {
        this.emitter.emit(type, argsArray);
      } else {
        this.queue.push({ type, args: argsArray });
      }
    };
  }

  public setReady() {
    this.isReady = true;
    this.emitAll();
  }

  private emitAll(type?: keyof T) {
    // TODO: Fix it
    if (!this.isReady || this.queue.length === 0) return;

    let n = 0;
    while (true) {
      if (n >= this.queue.length) break;
      if (!type || this.queue[n].type === type) {
        const message = this.queue.splice(n, 1)[0];
        this.emitter.emit(message.type, message.args);
      } else {
        n++;
      }
    }
  }
}
