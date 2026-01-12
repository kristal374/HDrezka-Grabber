type NormalizeArgs<T> = T extends undefined | void
  ? []
  : T extends any[]
    ? T
    : [T];

type TupleEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

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
