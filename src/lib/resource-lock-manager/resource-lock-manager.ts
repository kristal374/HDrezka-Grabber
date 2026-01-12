import { HDrezkaGrabberDB } from '@/lib/idb-storage';
import { MutexWithSoftLock } from '@/lib/resource-lock-manager/mutex-with-soft-lock';

type ResourceTarget = {
  id: string | number;
  type: Extract<keyof HDrezkaGrabberDB, string>;
};

export class ResourceLockManager {
  private static locks = new Map<string, MutexWithSoftLock>();

  private makeId(resourceType: string, resourceId: string | number): string {
    return `${resourceType}:${resourceId}`;
  }

  private getMutex({ type, id }: ResourceTarget): MutexWithSoftLock {
    const resourceId = this.makeId(type, id);
    if (!ResourceLockManager.locks.has(resourceId)) {
      ResourceLockManager.locks.set(resourceId, new MutexWithSoftLock());
    }

    return ResourceLockManager.locks.get(resourceId)!;
  }

  async lock({ type, id }: ResourceTarget, priority?: number) {
    const mutex = this.getMutex({ type, id });
    const result = await mutex.acquire(priority ?? 1);
    logger.debug(`Lock for: ${type}:${id}.`);
    return result;
  }

  markAsSoftLock({ type, id }: ResourceTarget) {
    logger.debug(`Lock: ${type}:${id}, mark as soft lock.`);
    const mutex = this.getMutex({ type, id });
    return mutex.markAsSoftLock();
  }

  async massLock(
    type: Extract<keyof HDrezkaGrabberDB, string>,
    idsList: number[],
    priority?: number,
  ) {
    return Promise.all(
      idsList.map((id) => {
        const mutex = this.getMutex({ type, id });
        return mutex.acquire(priority ?? 1);
      }),
    );
  }

  unlock({ type, id }: ResourceTarget) {
    logger.debug(`Unlock for: ${type}:${id}.`);
    const mutex = this.getMutex({ type, id });
    return mutex.release();
  }

  async massUnlock(
    type: Extract<keyof HDrezkaGrabberDB, string>,
    idsList: number[],
  ) {
    return await Promise.all(
      idsList.map((id) => {
        const mutex = this.getMutex({ type, id });
        return mutex.release();
      }),
    );
  }

  async run<T>(
    { type, id }: ResourceTarget,
    fn: () => Promise<T> | T,
    priority?: number,
  ) {
    const mutex = this.getMutex({ type, id });
    logger.debug(`Lock for: ${type}:${id}.`);
    const result = await mutex.runExclusive<T>(fn, priority);
    logger.debug(`Unlock for: ${type}:${id}.`);
    return result;
  }
}
