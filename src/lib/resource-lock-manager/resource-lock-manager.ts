import { HDrezkaGrabberDB } from '@/lib/idb-storage';
import { Logger } from '@/lib/logger';
import { MutexWithSoftLock } from '@/lib/resource-lock-manager/mutex-with-soft-lock';

type ResourceTargetType = Extract<keyof HDrezkaGrabberDB, string>;

type ResourceTarget = {
  id: string | number;
  type: ResourceTargetType;
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

  async lock({
    type,
    id,
    priority,
    logger = globalThis.logger,
  }: ResourceTarget & {
    priority?: number;
    logger?: Logger;
  }) {
    const mutex = this.getMutex({ type, id });
    const result = await mutex.acquire(priority ?? 1);
    logger.debug(`Lock for: ${type}:${id}.`);
    return result;
  }

  markAsSoftLock({
    type,
    id,
    logger = globalThis.logger,
  }: ResourceTarget & {
    logger?: Logger;
  }) {
    logger.debug(`Lock: ${type}:${id}, mark as soft lock.`);
    const mutex = this.getMutex({ type, id });
    return mutex.markAsSoftLock();
  }

  async massLock({
    type,
    idsList,
    priority,
    logger = globalThis.logger,
  }: {
    type: ResourceTargetType;
    idsList: number[];
    priority?: number;
    logger?: Logger;
  }) {
    logger.debug(`Mass lock for type: "${type}"`, idsList);
    return Promise.all(
      idsList.map((id) => {
        const mutex = this.getMutex({ type, id });
        return mutex.acquire(priority ?? 1);
      }),
    );
  }

  unlock({
    type,
    id,
    logger = globalThis.logger,
  }: ResourceTarget & { logger?: Logger }) {
    logger.debug(`Unlock for: ${type}:${id}.`);
    const mutex = this.getMutex({ type, id });
    return mutex.release();
  }

  async massUnlock({
    type,
    idsList,
    logger = globalThis.logger,
  }: {
    type: ResourceTargetType;
    idsList: number[];
    logger?: Logger;
  }) {
    logger.debug(`Mass unlock for type: "${type}"`, idsList);
    return await Promise.all(
      idsList.map((id) => {
        const mutex = this.getMutex({ type, id });
        return mutex.release();
      }),
    );
  }

  async run<T>({
    type,
    id,
    fn,
    priority,
    logger = globalThis.logger,
  }: ResourceTarget & {
    fn: () => Promise<T> | T;
    priority?: number;
    logger?: Logger;
  }) {
    const mutex = this.getMutex({ type, id });
    logger.debug(`Lock for: ${type}:${id}.`);
    const result = await mutex.runExclusive<T>(fn, priority);
    logger.debug(`Unlock for: ${type}:${id}.`);
    return result;
  }
}
