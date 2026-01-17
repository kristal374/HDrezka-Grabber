// При отправке уведомления в брокер сообщений, мы передаём само сообщение и
// id фильма, далее нам со стороны отправителя без разницы, что происходит
// с сообщением, оно должно быть доставлено, не смотря ни на что.
//
// Со стороны получателя(попап) мы должны иметь возможность подписаться на
// получение новых уведомлений.
//
// В самом попапе мы должны иметь список сообщений, т.к. их может быть больше
// чем одно уведомление (например несколько файлов не удалось загрузить).
// При отображении как вариант одинаковые сообщения можно стакать, показывая
// лишь общее количество этих сообщений. Как следствие, возникает вопрос о
// разделении сообщений на типы: "стакабельные" и "не стакабельные". Помимо
// этого не все сообщения имеют одинаковую важность, значит у сообщений должен
// существовать приоритет, и чем он выше, тем выше сообщение в списке на показ.
// Поскольку место в попапе ограничено, ограничено и место для показа самих
// уведомлений, и возможно, придётся часть уведомлений скрывать. Так же касаемо
// пользовательского интерфейса, возможно, стоит разделить уведомления на уровни
// важности: ошибки, важные/предупреждения, информация, успех. Ещё как вариант
// пользователю, возможно, будет удобней взаимодействовать с отдельным менеджером
// нотификаций чем с ограниченным полем внутри попапа.

import { EventType, Message } from '@/lib/types';
import type { Runtime } from 'webextension-polyfill';

type MessageSender = Runtime.MessageSender;

export type PopupNotification = {
  priority: number;
  stackable: boolean;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
};

export class MessageBroker {
  private readonly DB_NAME = 'lost-notifications';
  private readonly OK_STATUS = 'ok';

  async sendMessage(movieId: number, notification: PopupNotification) {
    const message = { movieId, notification };
    // Сначала пытаемся отправить уведомление стандартным способом
    await browser.runtime
      .sendMessage<
        Message<{ movieId: number; notification: PopupNotification }>
      >({ type: 'setNotification', message })
      .then(async (response) => {
        const popupResponse = response as typeof this.OK_STATUS | undefined;

        // Если ответ "ok", то мы считаем, что уведомление доставлено корректно,
        // иначе пробуем повторить отправку в контекст, в котором находимся
        if (popupResponse !== this.OK_STATUS) {
          // browser.runtime.sendMessage не отправляет сообщения в контекст,
          // из которого вызывается, и если мы хотим так же получать сообщения
          // в этом контексте, мы должны отправить сообщение другим способом,
          // в данном случае через CustomEvent
          let resolveFn;
          const promise = new Promise((resolve, reject) => {
            resolveFn = resolve;
            // Ждём подтверждения получения 50 ms, после чего считаем,
            // что уведомление доставить не удалось
            setTimeout(async () => reject('Timeout.'), 50);
          });

          const event = new CustomEvent('NotificationEvent', {
            detail: { message, resolve: resolveFn },
          });
          globalThis.dispatchEvent(event);
          await promise;
        }
      })
      .catch(async () => {
        // В случае провала доставки, сохраняем уведомление "на потом"
        // в сессионное хранилище, если позже пользователь откроет попап
        // с нужным фильмом, уведомления будут показаны сразу.
        const sessionStorageData = await browser.storage.session.get();

        const lostNotifications =
          (sessionStorageData[this.DB_NAME] as
            | Record<number, PopupNotification[]>
            | undefined) ?? {};

        if (!lostNotifications.hasOwnProperty(movieId))
          lostNotifications[movieId] = [];

        lostNotifications[movieId].push(notification);
        await browser.storage.session.set({
          [this.DB_NAME]: lostNotifications,
        });
      });
  }

  trackNotifications(
    movieId: number,
    callback: (notifications: PopupNotification) => Promise<void>,
  ) {
    eventBus.on(
      EventType.NotificationMessage,
      (
        message: unknown,
        _sender: MessageSender,
        sendResponse: (message: unknown) => void,
      ) => {
        const data = message as Message<any>;

        if (data.type === 'setNotification') {
          if (data.message.movieId !== movieId) return;
          callback(data.message.notification).then(() => {
            sendResponse(this.OK_STATUS);
          });
          return true;
        } else return;
      },
    );

    eventBus.on(EventType.NotificationEvent, async (event) => {
      const detail: {
        message: { movieId: number; notification: PopupNotification };
        resolve: (value: unknown) => void;
      } = (event as CustomEvent).detail;

      if (detail.message.movieId !== movieId) return;

      detail.resolve(this.OK_STATUS);
      await callback(JSON.parse(JSON.stringify(detail.message.notification)));
    });
  }

  private async getLostNotifications() {
    const sessionStorageData = await browser.storage.session.get();

    return (
      (sessionStorageData[this.DB_NAME] as
        | Record<number, PopupNotification[]>
        | undefined) ?? {}
    );
  }

  async getNotificationsFromStorage(movieId: number | string) {
    const lostNotifications = await this.getLostNotifications();
    return lostNotifications[Number(movieId)] ?? [];
  }

  async clearNotificationsFromStorage(movieId: number | string) {
    const lostNotifications = await this.getLostNotifications();

    if (!lostNotifications.hasOwnProperty(Number(movieId))) {
      delete lostNotifications[Number(movieId)];

      await browser.storage.session.set({
        [this.DB_NAME]: lostNotifications,
      });
    }
  }
}
