import { cn } from '@/lib/utils';
import { type JSX, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type TabItem<ID extends string = string> = {
  id: ID;
  label: string;
  icon?: JSX.Element | null;
};

interface SimpleTabsProps<ID extends string> {
  id?: string;
  className?: string;
  tabsList: TabItem<ID>[];
  activeTabId?: ID;
  defaultTabId?: ID;
  onValueChange?: (value: ID) => void;
}

export function SimpleTabs<ID extends string>({
  id,
  className,
  tabsList,
  activeTabId,
  defaultTabId,
  onValueChange,
}: SimpleTabsProps<ID>) {
  const [active, setActive] = useState<ID>(
    activeTabId ?? defaultTabId ?? tabsList[0]?.id,
  );
  const navRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  useEffect(() => {
    if (activeTabId && activeTabId !== active) {
      setActive(activeTabId);
    }
  }, [activeTabId, active]);

  const handleTabClick = (tabId: ID) => {
    setActive(tabId);
    onValueChange?.(tabId);
  };

  useLayoutEffect(() => {
    const update = () => {
      const nav = navRef.current;
      const el = btnRefs.current[active];
      if (!nav || !el) return;
      const flexContainer = nav.querySelector('div');
      if (!flexContainer) return;
      const navStyles = window.getComputedStyle(nav);
      const paddingLeft = parseInt(navStyles.paddingLeft, 10);
      const paddingRight = parseInt(navStyles.paddingRight, 10);
      const containerRect = flexContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const left = elRect.left - containerRect.left - paddingLeft;
      const width = elRect.width + paddingLeft + paddingRight;
      setUnderline({ left, width });
    };

    const timeoutId = window.setTimeout(update, 10);
    window.addEventListener('resize', update);
    document.fonts?.ready.then(update);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', update);
    };
  }, [active]);

  return (
    <div className='w-fit'>
      <nav
        id={id}
        ref={navRef}
        className={cn('relative px-3', className)}
        aria-label='Tabs Navigation'
      >
        <div className='flex items-center gap-6'>
          {tabsList.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  btnRefs.current[tab.id] = el;
                }}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'relative py-3 text-xl leading-none transition-opacity outline-none',
                  isActive ? 'font-extrabold' : 'font-bold',
                  'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400/60',
                )}
                role='tab'
                aria-selected={isActive}
              >
                <span className='text-settings-text-primary inline-flex items-center gap-2'>
                  {tab.icon && (
                    <span className='flex-shrink-0'>{tab.icon}</span>
                  )}
                  <span className='grid'>
                    <span className='pointer-events-none col-start-1 row-start-1 font-semibold opacity-0 select-none'>
                      {tab.label}
                    </span>
                    <span
                      className={cn(
                        'col-start-1 row-start-1',
                        isActive ? 'font-semibold' : 'font-normal',
                      )}
                    >
                      {tab.label}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className='pointer-events-none absolute right-0 bottom-0 left-0 h-[2px] bg-zinc-500/30' />

        <div
          className='pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-violet-500 transition-[width,transform] duration-300 ease-out'
          style={{
            width: underline.width,
            transform: `translateX(${underline.left}px)`,
          }}
        />
      </nav>
    </div>
  );
}
