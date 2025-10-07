import { cn } from '@/lib/utils';

type OutsideLinkProps = {
  url: string;
  text?: string;
  className?: string;
};

export function OutsideLink({ url, text, className }: OutsideLinkProps) {
  return (
    <a
      href={url}
      target='_blank'
      className={cn(
        'text-link-color focus-ring rounded font-bold underline underline-offset-4',
        className,
      )}
    >
      {text ?? url}
    </a>
  );
}
