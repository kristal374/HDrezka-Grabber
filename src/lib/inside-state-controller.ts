import { getFromStorage } from '@/lib/storage';
import { FileItem } from '@/lib/types';
import { getActiveFileItem } from '@/lib/utils';

const STORAGE_KEY = 'isFirstRun';

export async function isFirstRunExtension() {
  const storage = await browser.storage.session.get(STORAGE_KEY);
  const isFirstRun = (storage[STORAGE_KEY] as false | undefined) ?? true;
  logger.debug(`Extension is first run: ${isFirstRun}`);

  if (isFirstRun) {
    await browser.storage.session.set({ [STORAGE_KEY]: false });
    return isFirstRun;
  }
  return isFirstRun;
}

export async function findBrokenDownloadsInActiveDownloads(strictMode = false) {
  const brokenDownloads: FileItem[] = [];

  // Сначала получаем объекты активных загрузок, которые отслеживает расширение
  const activeDownloads =
    (await getFromStorage<number[]>('activeDownloads')) ?? [];
  const extensionActiveFiles = await getActiveFileItem(activeDownloads);

  // Далее получаем активные загрузки браузера, что отслеживает сам браузер,
  // и отсеиваем те, которые НЕ принадлежат расширению
  const browserActiveDownloads = await browser.downloads.search({
    state: 'in_progress',
  });
  const filteredBrowserActiveDownloadsId = browserActiveDownloads
    .filter((item) => item.byExtensionId === browser.runtime.id)
    .map((item) => item.id);

  // Если у загрузки есть downloadId и её одновременно отслеживает
  // и браузер и расширение, значит загрузка корректна
  const inappropriateDownloads = extensionActiveFiles.filter(
    (item) =>
      !(
        item.downloadId &&
        filteredBrowserActiveDownloadsId.includes(item.downloadId)
      ),
  );

  // В режиме strictMode мы считаем, что любая загрузка, которая не
  // отслеживается браузером, является сломанной, это необходимо, когда
  // расширение пробуждается не в стандартном режиме, а при старте браузера,
  // когда никакие события об окончании загрузки не могли прийти априори
  if (strictMode) return inappropriateDownloads;

  // Но возможна ситуация, когда браузер уже закончил загрузку файла,
  // а расширение ещё не успело об этом узнать. Такая ситуация тоже корректна,
  // и мы должны исключить такие объекты из списка сломанных загрузок
  for (const item of inappropriateDownloads) {
    if (item.downloadId !== null) {
      const downloadObjectList = await browser.downloads.search({
        id: item.downloadId,
      });
      if (
        downloadObjectList.length > 0 &&
        downloadObjectList[0].state !== 'in_progress'
      ) {
        continue;
      }
    }
    brokenDownloads.push(item);
  }

  // TODO: если filteredBrowserActiveDownloadsId.length > activeDownloads.length,
  //  тогда внутреннее состояние так же сломано
  return brokenDownloads;
}
