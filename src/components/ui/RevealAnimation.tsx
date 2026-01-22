import { cn } from '@/lib/utils';
import {
  Activity,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type RevealAnimationProps = {
  opened: boolean;
  className?: string;
} & React.PropsWithChildren;

type CalculatedHeight = {
  opened: number | null;
  closed: number | null;
};

type RevealContextType = {
  className?: string;
  state: 'opened' | 'closed';
};

const RevealContext = createContext<RevealContextType | null>(null);

export function RevealAnimation({
  opened,
  className,
  children,
}: RevealAnimationProps) {
  const state = opened ? 'opened' : 'closed';
  const [calculatedHeight, setCalculatedHeight] = useState<CalculatedHeight>({
    opened: null,
    closed: null,
  });
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    console.log(ref.current.clientHeight);
    if (calculatedHeight[state] === null) {
      setCalculatedHeight((prev) => ({
        ...prev,
        [state]: ref.current!.clientHeight,
      }));
    }
  }, [state]);
  return (
    <RevealContext value={{ className, state }}>
      <div
        className={cn(
          'overflow-clip transition-[height] duration-300',
          className,
        )}
        style={{ height: calculatedHeight[state] || 'auto' }}
        ref={ref}
      >
        {children}
      </div>
    </RevealContext>
  );
}

export function RevealAnimationContent({ children }: React.PropsWithChildren) {
  const context = useContext(RevealContext);
  if (!context) {
    throw new Error(
      '<RevealAnimationContent /> should be placed inside <RevealAnimation />, wrapping elements that should be revealed',
    );
  }
  const { className, state } = context;
  return (
    <Activity mode={state === 'opened' ? 'visible' : 'hidden'}>
      {state === 'closed' ? (
        <div className={className}>{children}</div>
      ) : (
        children
      )}
    </Activity>
  );
}
