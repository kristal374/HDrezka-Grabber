import { cn } from '@/lib/utils';
import { ExternalLinkIcon } from 'lucide-react';

interface OutsideLinkProps {
  url: string;
  text?: string;
  icon?: true;
  underlineOnHover?: boolean;
  className?: string;
}

export function OutsideLink({
  url,
  text,
  icon,
  underlineOnHover,
  className,
}: OutsideLinkProps) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(
        'focus-ring text-link-color hover:text-link-color/80 rounded-sm px-1 font-bold underline-offset-4',
        icon && 'inline-flex items-center gap-2',
        underlineOnHover ? 'hover:underline' : 'underline',
        className,
      )}
    >
      {text ?? url}
      {icon && <ExternalLinkIcon className='size-4' />}
    </a>
  );
}
