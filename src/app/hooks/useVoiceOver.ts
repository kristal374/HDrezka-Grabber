import { useEffect } from 'react';
import { VoiceOverInfo } from '../../lib/types';
import { useInitData } from '../providers/InitialDataProvider';
import { useStorage } from './useStorage';

export function useVoiceOver() {
  const { tabId } = useInitData();
  const [voiceOversList, setVoiceOversList] = useStorage<
    VoiceOverInfo[] | null
  >('voiceOversList', null);

  useEffect(() => {
    browser.scripting
      .executeScript({
        target: { tabId },
        func: extractVoiceOversList,
      })
      .then((response) => {
        const result = response[0].result as VoiceOverInfo[] | null;

        setVoiceOversList(result);
      });
  }, []);

  return voiceOversList;
}

async function extractVoiceOversList(): Promise<VoiceOverInfo[] | null> {
  const translators: VoiceOverInfo[] = [];

  const translatorItems = document.querySelectorAll('.b-translator__item');
  if (translatorItems.length > 0) {
    for (const item of translatorItems) {
      const itemID = item.getAttribute('data-translator_id')!;
      const itemTitle = (item as HTMLElement).title.trim();
      const voiceOver: VoiceOverInfo = {
        id: itemID,
        title:
          // TODO: useI18n
          itemTitle ||
          (itemID === '110'
            ? 'Оригинал'
            : itemID === '0'
              ? 'Озвучка #1'
              : 'Unknown Translator'),
        flag_country:
          item.querySelector('img')?.src.split('/').at(-1)?.split('.')[0] ||
          null,
        prem_content: item.classList.contains('b-prem_translator'),
        is_camrip: item.getAttribute('data-camrip'),
        is_ads: item.getAttribute('data-ads'),
        is_director: item.getAttribute('data-director'),
      };
      translators.push(voiceOver);
    }
  } else {
    const postInfo = document.getElementsByClassName('b-post__info');
    const trTagList = postInfo[0].querySelectorAll('tr');
    const elements = Array.from(trTagList || []).filter(
      (element) => element.cells[0].textContent === 'В переводе:',
    );
    // @ts-ignore
    const [_, initiator, _movieID, translatorID, param_1, param_2, param_3] =
      document.documentElement.outerHTML.match(
        /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true),/,
      );
    const translatorName =
      elements.length !== 0
        ? elements[0].children[1].textContent!.trim()
        : translatorID === '110'
          ? 'Оригинал'
          : translatorID === '0'
            ? 'Озвучка #1'
            : 'Unknown Translator';
    const voiceOver: VoiceOverInfo = {
      id: translatorID,
      title: translatorName,
      flag_country: null,
      prem_content: false,
      is_camrip: initiator === 'initCDNMoviesEvents' ? param_1 : null,
      is_ads: initiator === 'initCDNMoviesEvents' ? param_2 : null,
      is_director: initiator === 'initCDNMoviesEvents' ? param_3 : null,
    };
    translators.push(voiceOver);
  }

  return translators.length > 0 ? translators : null;
}
