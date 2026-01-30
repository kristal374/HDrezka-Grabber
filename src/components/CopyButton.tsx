import { Button, type ButtonProps } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useRef, useState } from 'react';

export function CopyButton({
  content,
  variant = 'secondary',
  className,
  ...props
}: Omit<ButtonProps, 'size' | 'title' | 'onClick'> & { content: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeout = useRef<number | null>(null);

  const handleCopy = async () => {
    if (resetTimeout.current) return;
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);

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
      size='square'
      className={cn('grid-stack *:transition-[scale,opacity]', className)}
      onClick={handleCopy}
      title={
        isCopied
          ? browser.i18n.getMessage('ui_copySuccess')
          : browser.i18n.getMessage('ui_copyButton')
      }
      {...props}
    >
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
    </Button>
  );
}
