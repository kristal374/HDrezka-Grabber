import { Button, type ButtonProps } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface CopyButtonProps extends Omit<
  ButtonProps,
  'size' | 'title' | 'onClick'
> {
  content: string;
  noIcon?: boolean;
}

export function CopyButton({
  content,
  noIcon,
  variant = 'secondary',
  className,
  children,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeout = useRef<number | null>(null);
  const showIcon = !!children ? !noIcon : true;

  const handleCopy = async () => {
    if (resetTimeout.current) return;
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      if (!showIcon) {
        toast.success(browser.i18n.getMessage('ui_copySuccess'), {
          duration: 1500,
        });
      }

      resetTimeout.current = window.setTimeout(() => {
        setIsCopied(false);
        resetTimeout.current = null;
      }, 1500);
    } catch (err) {
      console.error('Failed to copy content:', content, err);
    }
  };

  return (
    <Button
      variant={variant}
      size={!!children ? 'default' : 'square'}
      className={className}
      onClick={handleCopy}
      title={
        isCopied
          ? browser.i18n.getMessage('ui_copySuccess')
          : browser.i18n.getMessage('ui_copyButton')
      }
      {...props}
    >
      {children}
      {showIcon && (
        <div className='grid-stack *:transition-[scale,opacity]'>
          <CheckIcon
            className={cn(
              'size-4 scale-65 text-green-500 opacity-0',
              isCopied && 'scale-100 opacity-100',
            )}
          />
          <CopyIcon
            className={cn(
              'size-4 scale-100 group-hover:scale-110',
              isCopied && 'scale-70 opacity-0',
            )}
          />
        </div>
      )}
    </Button>
  );
}
