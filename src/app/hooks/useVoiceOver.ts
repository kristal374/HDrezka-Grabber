import { useEffect, useState } from 'react';
import { PageType, VoiceOverInfo } from '../../lib/types';
import { useTabID } from '../providers/CurrentTabProvider';

export function useVoiceOver(pageType: PageType) {
  const tabID = useTabID();
  const [translate, setTranslate] = useState<VoiceOverInfo[] | null>(null);

  useEffect(() => {
    if (!tabID || !pageType) return;

    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        func: extractTranslate,
      })
      .then((response) => {
        const result = response[0].result as VoiceOverInfo[] | null;
        // logger.debug(result);
        setTranslate(result);
      });
  }, [tabID, pageType]);

  return translate;
}

async function extractTranslate(): Promise<VoiceOverInfo[] | null> {
  const translators: VoiceOverInfo[] = [];

  const translatorItems = document.querySelectorAll('.b-translator__item');
  if (translatorItems.length > 0) {
    for (const item of translatorItems) {
      const voiceOver: VoiceOverInfo = {
        id: item.getAttribute('data-translator_id')!,
        title: (item as HTMLElement).title.trim() || 'Unknown Translator',
        flag_country: item
          .querySelector('img')
          ?.src.split('/')
          .at(-1)
          ?.split('.')[0],
        prem_content: item.classList.contains('b-prem_translator'),
        is_camrip: item.getAttribute('is_camrip'),
        is_director: item.getAttribute('is_director'),
        is_ads: item.getAttribute('is_ads'),
      };
      translators.push(voiceOver);
    }
  } else {
    const postInfo = document.getElementsByClassName('b-post__info');
    const trTagList = postInfo[0].querySelectorAll('tr');
    const elements = Array.from(trTagList || []).filter(
      (element) => element.cells[0].textContent === 'В переводе:',
    );

    const match = document.documentElement.outerHTML.match(
      /sof\.tv\.([^.]*)\((\d+), (\d+), (\d+), (\d+)/,
    );
    if (match) {
      const translatorName =
        elements.length !== 0
          ? elements[0].children[1].textContent!.trim()
          : 'Unknown Translator';
      const voiceOver: VoiceOverInfo = {
        id: match[3],
        title: translatorName,
      };
      translators.push(voiceOver);
    } else return null;
  }

  return translators.length > 0 ? translators : null;
}
