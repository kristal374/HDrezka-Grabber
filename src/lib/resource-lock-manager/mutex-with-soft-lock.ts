import { Mutex } from '@/lib/resource-lock-manager/async-mutex';
import { MutexWithSoftLockInterface } from '@/lib/resource-lock-manager/mutex-interface';

type SoftLockState = {
  priority: number;
  isInterrupted: boolean;
  isNeedResuming: boolean;
  resolve?: (isInterrupted: boolean) => void;
  reject?: (error: unknown) => void;
};

export class MutexWithSoftLock
  extends Mutex
  implements MutexWithSoftLockInterface
{
  private _isSubTaskLocked = false;
  private softLockState: SoftLockState | null = null;
  private currentPriority: number = 0;

  isSoftLocked(): boolean {
    return this.softLockState !== null;
  }

  markAsSoftLock(): MutexWithSoftLockInterface.Releaser {
    if (!this.isLocked()) {
      throw new Error('Mutex must be locked before marking as soft lock');
    }
    if (this.isSoftLocked()) {
      throw new Error('Mutex is already soft locked');
    }
    this.softLockState = {
      priority: this.currentPriority,
      isInterrupted: false,
      isNeedResuming: false,
    };
    this._dispatch();

    let called = false;
    return async (): Promise<boolean> => {
      if (called) {
        throw new Error('Mutex soft lock was already released');
      }
      called = true;

      if (!this.softLockState) {
        throw new Error('Mutex is not soft locked');
      }

      if (this.softLockState.isNeedResuming) {
        throw new Error('Mutex awaited resuming');
      }

      this.softLockState.isNeedResuming = true;

      const maxPriorityTask = this.queue.front();
      if (
        this.softLockState.priority < (maxPriorityTask?.priority ?? 0) ||
        this._isSubTaskLocked
      ) {
        await new Promise((resolve, reject) => {
          this.softLockState!.resolve = resolve;
          this.softLockState!.reject = reject;
        });
      }

      const wasInterrupted = this.softLockState.isInterrupted;
      this.softLockState = null;

      return wasInterrupted;
    };
  }

  release(): void {
    if (!this.softLockState) {
      this._isLocked = false;
    } else {
      this._isSubTaskLocked = false;
    }
    this._dispatch();
  }

  cancel(): void {
    this.currentPriority = 0;
    this._isSubTaskLocked = false;
    this._cancelSoftLock();
    super.cancel();
  }

  protected _dispatch() {
    if (this.isLocked() && !this.isSoftLocked()) return;
    if (this.isSoftLocked()) {
      if (this._isSubTaskLocked) return;

      const maxPriorityTask = this.queue.front();
      if (this.softLockState!.priority >= (maxPriorityTask?.priority ?? 0)) {
        if (this.softLockState!.isNeedResuming) {
          const resolve = this.softLockState!.resolve!;
          resolve(this.softLockState!.isInterrupted);
        }
        return;
      }
      this._isSubTaskLocked = true;
      this.softLockState!.isInterrupted = true;
    }

    const task = this.queue.dequeue();
    if (!task) return;

    this._isLocked = true;
    this.currentPriority = task.priority;
    task.resolve(this._newReleaser());
  }

  private _cancelSoftLock() {
    const cancelError = new Error('Task canceled.');

    if (this.softLockState) {
      this.softLockState.reject?.(cancelError);
      this.softLockState = null;
    }
  }
}
