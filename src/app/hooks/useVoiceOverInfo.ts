import { PageType, VoiceOverInfo } from '../../lib/types';
import { useEffect, useState } from 'react';

export function useConfigInfo(tabID: number | undefined, pageType: PageType) {
  const [translate, setTranslate] = useState<VoiceOverInfo | null>(null);

  useEffect(() => {
    if (!tabID || !pageType) return;

    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        func: extractTranslate,
      })
      .then((response) => {
        const result = response[0].result;
        // logger.debug(result);
        setTranslate(result as VoiceOverInfo);
      });
  }, [tabID, pageType]);

  return translate;
}

async function extractTranslate(): Promise<VoiceOverInfo[] | null> {
  const translators: VoiceOverInfo[] = [];
  const flags: { [key: string]: string | ArrayBuffer } = {};

  const translatorItems = document.querySelectorAll('.b-translator__item');
  if (translatorItems.length > 0) {
    for (const item of translatorItems) {
      const flagURL = item.querySelector('img')?.src;
      if (!!flagURL) {
        const response = await fetch(flagURL, { mode: 'no-cors' });
        const blob = await response.blob();
        flags[flagURL] = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result!);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      const voiceOver: VoiceOverInfo = {
        id: parseInt(item.getAttribute('data-translator_id')!),
        title: (item as HTMLElement).title.trim() || 'Unknown Translator',
        flag_url: flags.flagURL,
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

    if (elements.length === 0) return null;
    const match = document.documentElement.outerHTML.match(
      /sof\.tv\.([^.]*)\((\d+), (\d+), (\d+), (\d+)/,
    );
    if (match) {
      const translatorName = elements[0].textContent
        ? elements[0].textContent.trim()
        : 'Unknown Translator';
      const voiceOver: VoiceOverInfo = {
        id: parseInt(match[3]),
        title: translatorName,
      };
      translators.push(voiceOver);
    } else return null;
  }

  return translators.length > 0 ? translators : null;
}
