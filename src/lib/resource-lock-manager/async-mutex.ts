import { MutexInterface } from '@/lib/resource-lock-manager/mutex-interface';
import { PriorityQueue } from '@datastructures-js/priority-queue';

interface QueueEntry {
  resolve(result: MutexInterface.Releaser): void;
  reject(error: unknown): void;
  priority: number;
  createdAt: number;
}

export class Mutex implements MutexInterface {
  protected queue = new PriorityQueue<QueueEntry>(
    (a, b) => b.priority - a.priority || a.createdAt - b.createdAt,
  );
  protected _isLocked = false;

  async acquire(priority = 0): Promise<MutexInterface.Releaser> {
    return new Promise((resolve, reject) => {
      const createdAt = performance.now();
      const task: QueueEntry = { resolve, reject, priority, createdAt };
      this.queue.enqueue(task);
      this._dispatch();
    });
  }

  async runExclusive<T>(
    callback: MutexInterface.Worker<T>,
    priority = 0,
  ): Promise<T> {
    const release = await this.acquire(priority);

    try {
      return await callback();
    } finally {
      release();
    }
  }

  isLocked(): boolean {
    return this._isLocked;
  }

  release(): void {
    this._isLocked = false;
    this._dispatch();
  }

  cancel(): void {
    const cancelError = new Error('Task canceled.');

    while (!this.queue.isEmpty()) {
      const task = this.queue.dequeue();
      try {
        task?.reject(cancelError);
      } catch (error) {}
    }
    this._isLocked = false;
  }

  protected _dispatch() {
    if (this.isLocked()) return;
    const task = this.queue.dequeue();
    if (!task) return;
    this._isLocked = true;
    task.resolve(this._newReleaser());
  }

  protected _newReleaser(): MutexInterface.Releaser {
    let called = false;

    return () => {
      if (called) return;
      called = true;

      this.release();
    };
  }
}
