import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { selectMovieInfo } from './store/DownloadScreen.slice';
import {
  deleteNotificationsAction,
  type RenderNotification,
  selectNotifications,
  setNotificationAction,
} from './store/NotificationField.slice';
import { useAppDispatch, useAppSelector } from './store/store';

const NOTIFICATIONS_COLLAPSE_THRESHOLD = 2;
const NOTIFICATIONS_COLLAPSE_GAP = '0.5rem';
const NOTIFICATIONS_COLLAPSE_DELAY = 1500;
const NOTIFICATIONS_COLLAPSE_FADE_CLASS = 'animate-fast-pulse';

type Props = {
  isLimitedMaxHeight?: boolean;
};

export function NotificationField({ isLimitedMaxHeight }: Props) {
  const dispatch = useAppDispatch();
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const notifications = useAppSelector(selectNotifications);

  const notificationsToShow = useMemo(() => {
    const notificationsToShow: RenderNotification[] = [];
    const copiedNotifications: RenderNotification[] = JSON.parse(
      JSON.stringify(notifications),
    );
    // keys are ids of stack, values are index of stack representer in notificationsToShow
    const stacks = new Map<string, number>();
    for (let i = 0; i < copiedNotifications.length; i++) {
      const elem = copiedNotifications[i];
      if (!elem.stackable) {
        notificationsToShow.push(elem);
        continue;
      }
      const stackId = `${elem.type}-${elem.message}`;
      let stackIndex = stacks.get(stackId);

      if (stackIndex === undefined) {
        stackIndex = notificationsToShow.length;
        stacks.set(stackId, stackIndex);
        elem.stack = [elem.id];
        notificationsToShow.push(elem);
      } else {
        const stackRepresenter = notificationsToShow[stackIndex];
        stackRepresenter.stack?.push(elem.id);
      }
    }
    return notificationsToShow.reverse();
  }, [notifications]);

  useEffect(() => {
    // При открытии попапа мы запрашиваем список всех уведомлений,
    // что были оставленны "на потом", и берём только те, которые были
    // адресованы нам (определяем по id фильма)
    messageBroker
      .getNotificationsFromStorage(movieInfo.data.id)
      .then(async (lostNotifications) => {
        lostNotifications.map((notification) =>
          dispatch(setNotificationAction({ notification })),
        );

        // Не забываем удалить из списка на доставку полученные уведомления
        await messageBroker.clearNotificationsFromStorage(movieInfo.data.id);

        messageBroker.trackNotifications(
          movieInfo.data.id,
          async (notification) => {
            dispatch(setNotificationAction({ notification }));
          },
        );
      });
  }, []);

  const handleCloseNotification = (notification: RenderNotification) => {
    dispatch(deleteNotificationsAction({ notification }));
  };

  const amount = notificationsToShow.length;
  const shouldCollapse = amount > NOTIFICATIONS_COLLAPSE_THRESHOLD;
  const [isCollapsed, setCollapsed] = useState(shouldCollapse);
  const isCollapsedOpened = shouldCollapse && !isCollapsed;

  const containerRef = useRef<HTMLDivElement>(null);

  const collapseClosingTimeoutRef = useRef<number | null>(null);
  const clearCollapseClosingTimeout = () => {
    if (!collapseClosingTimeoutRef.current) return;
    clearTimeout(collapseClosingTimeoutRef.current);
    collapseClosingTimeoutRef.current = null;
    containerRef.current?.parentElement?.classList.remove(
      NOTIFICATIONS_COLLAPSE_FADE_CLASS,
    );
  };

  const resolveEncodedValue = (marker: 'gap' | 'max-height') => {
    const elem = containerRef.current?.querySelector(
      `[data-marker="encode-${marker}"]`,
    );
    return elem?.clientWidth ?? 0;
  };

  const [calculatedElemHeights, setElemHeights] = useState<number[]>([]);
  const [calculatedFirstElemHeight, setFirstElemHeight] = useState(0);
  const [calculatedTotalHeight, setTotalHeight] = useState(0);
  const [calculatedTranslates, setTranslate] = useState<number[]>([]);

  const isElementAdded = amount === calculatedElemHeights.length + 1;
  const isElementRemoved = amount === calculatedElemHeights.length - 1;

  useEffect(() => {
    if (isCollapsedOpened) {
      if (isElementAdded && amount === NOTIFICATIONS_COLLAPSE_THRESHOLD + 1) {
        setCollapsed(true);
      }
      return;
    }
    setCollapsed(shouldCollapse);
  }, [amount]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const gap = resolveEncodedValue('gap');
    let elemHeights: number[] = [];
    let elemTranslates: number[] = [];
    const elems =
      containerRef.current.querySelectorAll('& > *:not([data-marker])') ?? [];

    if (!elems.length) {
      // skip if there are no elements
    } else if (!calculatedElemHeights.length || !isCollapsed) {
      Array.from(elems).forEach((elem, i) => {
        elemHeights.push(elem.clientHeight);
        if (i === 0) {
          elemTranslates.push(0);
        } else {
          elemTranslates.push(elemTranslates[i - 1] + elemHeights[i - 1] + gap);
        }
      });
    } else if (isElementAdded) {
      const newFirstElemHeight = elems[0].clientHeight;
      elemHeights = [newFirstElemHeight, ...calculatedElemHeights];
      elemTranslates = [...calculatedTranslates].map(
        (value) => value + newFirstElemHeight + gap,
      );
      elemTranslates.unshift(0);
    } else if (isElementRemoved) {
      elemHeights = [...calculatedElemHeights];
      const firstElemHeight = elemHeights.shift();
      if (firstElemHeight) {
        elemTranslates = [...calculatedTranslates].map(
          (value) => value - (firstElemHeight + gap),
        );
        elemTranslates.shift();
      }
    }

    setElemHeights(elemHeights);
    setFirstElemHeight(elemHeights[0] ?? 0);
    // setTotalHeight(elemHeights.reduce((acc, curr) => acc + curr + gap, 0));
    setTotalHeight(
      elemHeights.length ? elemTranslates.at(-1)! + elemHeights.at(-1)! + 1 : 0,
    );
    setTranslate(elemTranslates);
  }, [notificationsToShow.map((notification) => notification.id).join(',')]);

  const [maxHeight, setMaxHeight] = useState(0);
  useLayoutEffect(() => {
    setMaxHeight(resolveEncodedValue('max-height'));
  }, []);

  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const top = container.querySelector('[data-marker="top"]');
    const bottom = container.querySelector('[data-marker="bottom"]');
    if (!top || !bottom) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === top) {
            setShowTopShadow(!entry.isIntersecting);
          } else if (entry.target === bottom) {
            setShowBottomShadow(!entry.isIntersecting);
          }
        });
      },
      { root: container.parentElement },
    );

    observer.observe(top);
    observer.observe(bottom);
    return () => observer.disconnect();
  }, []);

  const renderCount = useRef(0);
  const isFirstRun = useRef(true);
  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current === 2) isFirstRun.current = false;
  });

  logger.info('New render of NotificationField component.');
  return (
    <div className='relative isolate'>
      {isCollapsedOpened && calculatedTotalHeight > maxHeight && (
        <>
          <div
            className={cn(
              showTopShadow ? 'opacity-100' : 'opacity-0',
              'pointer-events-none absolute inset-0 z-1000 transition-opacity duration-300',
              'from-background bg-linear-to-b to-transparent to-10%',
            )}
          />
          <div
            className={cn(
              showBottomShadow ? 'opacity-100' : 'opacity-0',
              'pointer-events-none absolute inset-0 z-1000 transition-opacity duration-300',
              'from-background bg-linear-to-t to-transparent to-10%',
            )}
          />
        </>
      )}

      {isCollapsedOpened && (
        <div
          data-marker='no-collapse'
          className='absolute h-3 w-full'
          style={{
            translate: `0px ${Math.min(calculatedTotalHeight, maxHeight)}px`,
          }}
          onMouseEnter={clearCollapseClosingTimeout}
        />
      )}

      <div
        className={cn(
          'group relative w-full transition-all',
          isLimitedMaxHeight ? 'max-h-28' : 'max-h-36',
          isCollapsedOpened &&
            'scroll-container overflow-x-hidden overflow-y-auto',
          calculatedTotalHeight < maxHeight && 'overflow-clip',
          isCollapsed &&
            'overflow-visible focus-within:overflow-clip hover:overflow-clip',
        )}
        style={{
          height: isCollapsed
            ? `calc(${calculatedFirstElemHeight}px + ${NOTIFICATIONS_COLLAPSE_THRESHOLD} * ${NOTIFICATIONS_COLLAPSE_GAP})`
            : calculatedTotalHeight,
        }}
        onMouseEnter={clearCollapseClosingTimeout}
        onMouseLeave={() => {
          if (isCollapsedOpened) {
            const containerParent = containerRef.current?.parentElement;
            containerParent?.classList.add(NOTIFICATIONS_COLLAPSE_FADE_CLASS);

            collapseClosingTimeoutRef.current = setTimeout(() => {
              setCollapsed(true);
              containerParent?.classList.remove(
                NOTIFICATIONS_COLLAPSE_FADE_CLASS,
              );
            }, NOTIFICATIONS_COLLAPSE_DELAY) as unknown as number;
          }
        }}
      >
        {isCollapsed && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-1000',
              'flex items-end justify-center',
              'opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100',
              'from-background via-background bg-linear-to-t via-10% to-transparent',
            )}
          >
            <Button
              variant='ghost'
              className='pointer-events-auto mb-1 gap-0'
              onClick={() => setCollapsed(false)}
            >
              {browser.i18n.getMessage('popup_showAllNotification')}
              {` `}(<NumberFlow value={amount} />)
            </Button>
          </div>
        )}

        <div
          className='flex flex-col gap-1.5'
          style={{ '--amount': amount } as React.CSSProperties}
          ref={containerRef}
        >
          {/* value of width used to encode numbers to get real values in runtime */}
          <div data-marker='encode-gap' className='absolute w-1.5' />
          <div
            data-marker='encode-max-height'
            className={cn('absolute', isLimitedMaxHeight ? 'w-28' : 'w-36')}
          />
          <div data-marker='top' className='absolute size-px' />
          {notificationsToShow.map((notification, i) => {
            const isPreview = isCollapsed ? i !== 0 : false;
            return (
              <div
                key={notification.id}
                className={cn(
                  colors[notification.type ?? 'info'].primary,
                  'flex items-center gap-1 rounded-md pt-1 pr-1.25 pb-1.25 pl-2.5 text-sm',
                  'not-light:shadow-lg light:border absolute w-full origin-bottom transition-transform duration-300',
                  i === 0 && 'animate-spawn',
                  isCollapsed &&
                    i > NOTIFICATIONS_COLLAPSE_THRESHOLD &&
                    'invisible duration-0',
                  // notification.message.length > 31 && 'items-start', // this assumes that a message is 2 or more lines
                )}
                style={
                  {
                    '--index': i,
                    height:
                      isPreview && calculatedTranslates.length > 0
                        ? calculatedFirstElemHeight
                        : undefined,
                    scale: isCollapsed ? 'calc(1 - var(--index) * 0.05)' : '1',
                    translate: isCollapsed
                      ? i > NOTIFICATIONS_COLLAPSE_THRESHOLD
                        ? '0px'
                        : `0px calc(var(--index) * ${NOTIFICATIONS_COLLAPSE_GAP})`
                      : `0px ${calculatedTranslates[i]}px`,
                    zIndex: 'calc(var(--amount) - var(--index))',
                  } as React.CSSProperties
                }
              >
                {notification.type === 'critical' && (
                  <AlertTriangleIcon
                    className={cn('size-4', colors.critical.icon)}
                  />
                )}
                <p
                  className={cn(
                    'mr-auto font-medium text-balance',
                    isPreview && 'opacity-0 select-none',
                  )}
                >
                  {notification.message}
                </p>
                {notification.stack?.length && (
                  <span
                    className={cn(
                      'rounded-full border-2 border-transparent px-1.5 text-xs leading-normal font-medium select-none',
                      colors[notification.type ?? 'info'].secondary,
                      (isPreview || notification.stack.length <= 1) &&
                        'opacity-0',
                    )}
                  >
                    <NumberFlow value={notification.stack.length} />
                  </span>
                )}
                <Button
                  variant='ghost'
                  size='square'
                  className={cn(
                    'not-light:text-light-color! mt-0.25 focus-visible:bg-transparent not-disabled:active:scale-92',
                    colors[notification.type ?? 'info'].secondaryHover,
                    !isPreview && 'pointer-events-auto',
                  )}
                  disabled={isPreview}
                  onClick={() => handleCloseNotification(notification)}
                >
                  <XIcon className='size-4' />
                </Button>
              </div>
            );
          })}
          <div
            data-marker='bottom'
            className='absolute size-px'
            style={{
              translate: isCollapsedOpened
                ? `0px ${calculatedTotalHeight - 1}px`
                : '0px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

const colors: Record<
  RenderNotification['type'],
  { primary: string; secondary: string; secondaryHover: string; icon?: string }
> = {
  info: {
    primary: 'bg-input light:border-input-active',
    secondary: 'bg-input-active',
    secondaryHover: 'not-disabled:hover:bg-input-active',
  },
  error: {
    primary:
      'bg-error light:bg-rose-200 light:text-red-900 light:border-rose-400',
    secondary: 'bg-red-500/20',
    secondaryHover: 'not-disabled:hover:bg-red-500/20',
  },
  critical: {
    primary:
      'bg-error light:bg-rose-200 light:text-red-900 light:border-rose-400',
    secondary: 'bg-red-500/20',
    secondaryHover: 'not-disabled:hover:bg-red-500/20',
    icon: 'text-rose-600 text-rose-800',
  },
  warning: {
    primary:
      'bg-yellow-800 light:bg-amber-200 light:text-orange-900 light:border-amber-400',
    secondary: 'bg-amber-500/30',
    secondaryHover: 'not-disabled:hover:bg-amber-500/30',
  },
  success: {
    primary:
      'bg-emerald-800 light:bg-emerald-200 light:text-emerald-900 light:border-emerald-400',
    secondary: 'bg-emerald-500/30',
    secondaryHover: 'not-disabled:hover:bg-emerald-500/30',
  },
};
