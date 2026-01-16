interface MutexInterface {
  acquire(priority?: number): Promise<MutexInterface.Releaser>;

  runExclusive<T>(
    callback: MutexInterface.Worker<T>,
    priority?: number,
  ): Promise<T>;

  release(): void;

  cancel(): void;

  isLocked(): boolean;
}

namespace MutexInterface {
  export interface Releaser {
    (): void;
  }

  export interface Worker<T> {
    (): Promise<T> | T;
  }
}

interface MutexWithSoftLockInterface extends MutexInterface {
  isSoftLocked(): boolean;

  markAsSoftLock(): MutexWithSoftLockInterface.Releaser;
}

namespace MutexWithSoftLockInterface {
  export interface Releaser {
    (): Promise<boolean>;
  }
}

export { MutexInterface, MutexWithSoftLockInterface };
