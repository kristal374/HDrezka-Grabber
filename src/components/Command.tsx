import { cn } from '@/lib/utils';
import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        'text-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      className='border-input-active flex w-full items-center border-b'
      cmdk-input-wrapper=''
    >
      <SearchIcon
        className='size-4 shrink-0 opacity-50'
        style={{
          marginLeft: '0.6rem',
          marginRight: '0.5rem',
        }}
      />
      <CommandPrimitive.Input
        className={cn(
          'flex rounded-md bg-transparent py-2 text-sm outline-none',
          'placeholder:text-foreground-secondary disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}

const CommandList = CommandPrimitive.List;

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn('py-6 text-center text-sm', className)}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        'text-foreground [&_[cmdk-group-heading]]:text-foreground-secondary overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn('bg-input-active -mx-1 h-px', className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'data-[selected=true]:bg-link-color data-[selected=true]:text-foreground',
        'relative flex grow cursor-default items-center rounded-sm px-2 py-1.5 text-sm select-none',
        'outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'text-foreground-secondary ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
