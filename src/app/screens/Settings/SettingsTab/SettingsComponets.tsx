import { cn } from '@/lib/utils';
import { memo } from 'react';

export const SettingItem = memo(function SettingItem({
  title,
  description,
  footer,
  children,
  className,
}: {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className='flex flex-1 flex-col gap-1 pr-4'>
        <h4 className='text-settings-text-secondary text-base font-medium'>
          {title}
        </h4>
        {description && (
          <p className='text-settings-text-tertiary text-sm text-balance'>
            {description}
          </p>
        )}
        {footer}
      </div>
      <div className='shrink-0'>{children}</div>
    </div>
  );
});

export function SettingsSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-6 rounded-lg border p-6',
        'border-settings-border-primary bg-settings-background-secondary',
        className,
      )}
    >
      <div
        className='text-settings-text-primary absolute -top-4 left-4 flex items-center gap-2.5 px-2 text-base font-medium'
        style={{
          backgroundImage: `linear-gradient(to bottom, var(--settings-background-primary), var(--settings-background-primary) 48%, var(--settings-background-secondary) 64%, var(--settings-background-secondary))`,
        }}
      >
        {Icon && <Icon className='text-settings-text-tertiary size-5' />}
        <h3 className='text-settings-text-primary text-lg font-semibold'>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
