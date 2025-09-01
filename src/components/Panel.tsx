import { cn } from '../lib/utils';

type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return (
    <div className='mx-auto mb-4 max-w-4xl px-4'>
      <div
        className={cn(
          'border-settings-border-primary bg-settings-background-secondary text-settings-text-secondary rounded-lg border p-8 shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
