import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { XIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { selectMovieInfo } from './store/DownloadScreen.slice';
import {
  deleteNotificationsAction,
  selectNotifications,
  setNotificationAction,
} from './store/NotificationField.slice';
import { useAppDispatch, useAppSelector } from './store/store';

const NOTIFICATIONS_COLLAPSE_THRESHOLD = 2;
const NOTIFICATIONS_COLLAPSE_GAP = '0.5rem';

export function NotificationField() {
  const dispatch = useAppDispatch();
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const notifications = useAppSelector((state) => selectNotifications(state));

  const notificationsToShow = useMemo(() => {
    return notifications.slice().reverse();
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
          Number(movieInfo.data.id),
          async (notification) => {
            dispatch(setNotificationAction({ notification }));
          },
        );
      });
  }, []);

  const amount = notificationsToShow.length;
  const shouldCollapse = amount > NOTIFICATIONS_COLLAPSE_THRESHOLD;
  const [isCollapsed, setCollapsed] = useState(shouldCollapse);
  const isCollapsedOpened = shouldCollapse && !isCollapsed;

  useEffect(() => {
    if (isCollapsedOpened) return;
    setCollapsed(shouldCollapse);
  }, [amount]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [calculatedFirstElemHeight, setFirstElemHeight] = useState(0);
  const [calculatedTotalHeight, setTotalHeight] = useState(0);
  const [calculatedTranslates, setTranslate] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const gap = containerRef.current.clientHeight ?? 0;
    const elemHeights: number[] = [];
    const elemTranslates: number[] = [];
    Array.from(
      containerRef.current.querySelectorAll('& > *:not([data-marker])') ?? [],
    ).map((elem, i) => {
      elemHeights.push(elem.clientHeight);
      if (i === 0) {
        elemTranslates.push(0);
      } else {
        elemTranslates.push(elemTranslates[i - 1] + elemHeights[i - 1] + gap);
      }
    });
    setFirstElemHeight(elemHeights[0]);
    // setTotalHeight(elemHeights.reduce((acc, curr) => acc + curr + gap, 0));
    setTotalHeight(
      elemHeights.length ? elemTranslates.at(-1)! + elemHeights.at(-1)! : 0,
    );
    setTranslate(elemTranslates);
  }, [notificationsToShow]);

  const [maxHeight, setMaxHeight] = useState(0);
  useLayoutEffect(() => {
    setMaxHeight(containerRef.current?.clientWidth ?? 0);
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

  // if (!amount) return null;

  const handleCloseNotification = (notificationId: number) => {
    dispatch(deleteNotificationsAction({ notificationId }));
  };

  logger.info('New render of NotificationField component.');
  return (
    <div className='relative'>
      {isCollapsedOpened && calculatedTotalHeight > maxHeight && (
        <>
          <div
            className={cn(
              showTopShadow ? 'opacity-100' : 'opacity-0',
              'pointer-events-none absolute inset-0 z-100 transition-opacity duration-300',
              'from-background bg-gradient-to-b to-transparent to-10%',
            )}
          />
          <div
            className={cn(
              showBottomShadow ? 'opacity-100' : 'opacity-0',
              'pointer-events-none absolute inset-0 z-100 transition-opacity duration-300',
              'from-background bg-gradient-to-t to-transparent to-10%',
            )}
          />
        </>
      )}
      <div
        className={cn(
          'group relative w-full transition-all duration-300',
          isCollapsed
            ? 'hover:overflow-clip'
            : 'max-h-36 overflow-x-hidden overflow-y-auto',
        )}
        style={{
          height: isCollapsed
            ? `calc(${calculatedFirstElemHeight}px + ${NOTIFICATIONS_COLLAPSE_THRESHOLD} * ${NOTIFICATIONS_COLLAPSE_GAP})`
            : calculatedTotalHeight,
          scrollbarWidth: 'thin',
        }}
        onMouseLeave={() => {
          if (isCollapsedOpened) setCollapsed(true);
        }}
      >
        {isCollapsed && (
          <div
            className={cn(
              'absolute inset-0 z-100',
              'flex items-end justify-center',
              'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
              'from-background via-background bg-gradient-to-t via-10% to-transparent',
            )}
          >
            <Button
              variant='ghost'
              className='pointer-events-auto gap-0'
              onClick={() => setCollapsed(false)}
            >
              Показать все (<NumberFlow value={amount} />)
            </Button>
          </div>
        )}

        <div
          // height and width used here to encode numbers to easily get calculated values in runtime
          // height encodes gap value, width encodes max height value
          className={cn('h-1.5 w-36', 'flex flex-col gap-1.5')}
          style={{ '--amount': amount } as React.CSSProperties}
          ref={containerRef}
        >
          <div data-marker='top' className='absolute size-px' />
          {notificationsToShow.map((notification, i) => {
            const isPreview = isCollapsed ? i !== 0 : false;
            return (
              <div
                key={notification.id}
                className={cn(
                  'bg-error text-light-color relative flex items-center gap-2 rounded-md pt-1 pr-1.25 pb-1.25 pl-2.5 text-sm',
                  isCollapsed &&
                    i > NOTIFICATIONS_COLLAPSE_THRESHOLD &&
                    'opacity-0',
                  'absolute w-full shadow-lg transition-transform duration-300',
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
                      ? `0px calc(var(--index) * ${NOTIFICATIONS_COLLAPSE_GAP})`
                      : `0px ${calculatedTranslates[i]}px`,
                    zIndex: 'calc(var(--amount) - var(--index))',
                  } as React.CSSProperties
                }
              >
                <p
                  className={cn(
                    'flex-grow text-balance',
                    isPreview && 'opacity-0 select-none',
                  )}
                >
                  {notification.message}
                </p>
                <Button
                  variant='dangerous'
                  size='square'
                  className={cn(
                    'mt-0.25 !text-white not-disabled:active:scale-92',
                    // !isPreview && 'pointer-events-auto',
                  )}
                  disabled={isCollapsed}
                  onClick={() => handleCloseNotification(notification.id)}
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
