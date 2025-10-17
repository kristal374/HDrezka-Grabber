import { HDrezkaGrabberDB } from '@/lib/idb-storage';
import { Mutex } from 'async-mutex';

type ResourceTarget = {
  id: string | number;
  type: Extract<keyof HDrezkaGrabberDB, string>;
};

export class ResourceLockManager {
  private static locks = new Map<string, Mutex>();

  private makeId(resourceType: string, resourceId: string | number): string {
    return `${resourceType}:${resourceId}`;
  }

  private getMutex({ type, id }: ResourceTarget): Mutex {
    const resourceId = this.makeId(type, id);
    if (!ResourceLockManager.locks.has(resourceId)) {
      ResourceLockManager.locks.set(resourceId, new Mutex());
    }

    return ResourceLockManager.locks.get(resourceId)!;
  }

  async lock({ type, id }: ResourceTarget, priority?: number) {
    const mutex = this.getMutex({ type, id });
    return await mutex.acquire(priority ?? 1);
  }

  unlock({ type, id }: ResourceTarget) {
    const mutex = this.getMutex({ type, id });
    return mutex.release();
  }

  async run<T>(
    { type, id }: ResourceTarget,
    fn: () => Promise<T> | T,
    priority?: number,
  ) {
    const mutex = this.getMutex({ type, id });
    return mutex.runExclusive<T>(fn, priority);
  }
}
