import { EventType, Message } from '@/lib/types';
import type { Runtime } from 'webextension-polyfill';

type MessageSender = Runtime.MessageSender;

type MessageTarget = string | '*';
export type PopupNotification = {
  stackable: boolean;
  message: string;
  type: 'error' | 'critical' | 'warning' | 'info' | 'success';
};
type NotificationMessage = {
  movieId: MessageTarget;
  notification: PopupNotification;
};

export class MessageBroker {
  private readonly DB_NAME = 'lost-notifications';
  private readonly OK_STATUS = 'ok';

  async sendMessage(movieId: MessageTarget, notification: PopupNotification) {
    const message = { movieId, notification };
    // Сначала пытаемся отправить уведомление стандартным способом
    await browser.runtime
      .sendMessage<Message<NotificationMessage>>({
        type: 'setNotification',
        message,
      })
      .then(async (response) => {
        const popupResponse = response as typeof this.OK_STATUS | undefined;

        // Если ответ "ok", то мы считаем, что уведомление доставлено корректно,
        // иначе пробуем повторить отправку в контекст, в котором находимся
        if (popupResponse !== this.OK_STATUS) {
          throw new Error('Notification was not delivered.');
        }
      })
      .catch(async () => {
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
      })
      .catch(async () => {
        // В случае провала доставки, сохраняем уведомление "на потом"
        // в сессионное хранилище, если позже пользователь откроет попап
        // с нужным фильмом, уведомления будут показаны сразу.
        const lostNotifications = await this.getLostNotifications();

        if (!lostNotifications.hasOwnProperty(movieId))
          lostNotifications[movieId] = [];

        lostNotifications[movieId]!.push(notification);
        await browser.storage.session.set({
          [this.DB_NAME]: lostNotifications,
        });
      });
  }

  trackNotifications(
    movieId: string,
    callback: (notifications: PopupNotification) => Promise<void>,
  ) {
    const messageIsAddressedToUs = (message: NotificationMessage) => {
      return message.movieId === movieId || message.movieId === '*';
    };
    eventBus.on(
      EventType.NotificationMessage,
      (
        message: unknown,
        _sender: MessageSender,
        sendResponse: (message: unknown) => void,
      ) => {
        const data = message as Message<NotificationMessage>;

        if (data.type === 'setNotification') {
          if (!messageIsAddressedToUs(data.message)) return;
          callback(data.message.notification).then(() => {
            sendResponse(this.OK_STATUS);
          });
          return true;
        } else return;
      },
    );

    eventBus.on(EventType.NotificationEvent, async (event) => {
      const detail: {
        message: NotificationMessage;
        resolve: (value: unknown) => void;
      } = (event as CustomEvent).detail;

      if (!messageIsAddressedToUs(detail.message)) return;

      detail.resolve(this.OK_STATUS);
      await callback(JSON.parse(JSON.stringify(detail.message.notification)));
    });
  }

  private async getLostNotifications() {
    const sessionStorageData = await browser.storage.session.get();
    return (sessionStorageData[this.DB_NAME] ?? {}) as Partial<
      Record<MessageTarget, PopupNotification[]>
    >;
  }

  async getNotificationsFromStorage(movieId: string) {
    const lostNotifications = await this.getLostNotifications();
    const notificationsToUs = lostNotifications[movieId] ?? [];
    const notificationsForAnyone = lostNotifications['*'] ?? [];
    return [...notificationsToUs, ...notificationsForAnyone];
  }

  async clearNotificationsFromStorage(movieId: string) {
    const lostNotifications = await this.getLostNotifications();

    let needToUpdate = false;
    if (lostNotifications.hasOwnProperty(movieId)) {
      delete lostNotifications[movieId];
      needToUpdate = true;
    }
    if (lostNotifications.hasOwnProperty('*')) {
      delete lostNotifications['*'];
      needToUpdate = true;
    }
    if (needToUpdate) {
      await browser.storage.session.set({
        [this.DB_NAME]: lostNotifications,
      });
    }
  }
}
