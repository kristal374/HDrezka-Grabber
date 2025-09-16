import { memo } from 'react';
import { cn } from '../../../../lib/utils';

export const SettingItem = memo(function SettingItem({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 py-3', className)}
    >
      <div className='flex-1 pr-4'>
        <h4 className='text-settings-text-secondary text-base font-medium'>
          {title}
        </h4>
        {description && (
          <p className='text-settings-text-tertiary mt-1 text-sm'>
            {description}
          </p>
        )}
      </div>
      <div className='flex-shrink-0'>{children}</div>
    </div>
  );
});

export function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <div className='mb-8 last:mb-0'>
      <div className='mb-4 flex items-center'>
        {Icon && <Icon className='text-settings-text-tertiary mr-2 h-5 w-5' />}
        <h3 className='text-settings-text-primary text-lg font-semibold'>
          {title}
        </h3>
      </div>
      <div className='divide-settings-border-secondary space-y-0 divide-y'>
        {children}
      </div>
    </div>
  );
}
