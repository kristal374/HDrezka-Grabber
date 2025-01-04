import { useEffect, useState } from 'react';
import { Message, QualitiesList, URLsContainer } from '../../lib/types';

export function useQualitySize(qualitiesList: QualitiesList | null) {
  const [sizes, setSizes] = useState<URLsContainer | null>(null);

  useEffect(() => {
    if (!qualitiesList) return;
    browser.runtime
      .sendMessage<Message<QualitiesList>>({
        type: 'getFileSize',
        message: qualitiesList,
      })
      .then((response) => {
        const result = response as URLsContainer;
        // logger.debug(result);
        setSizes(result);
      });
  }, [qualitiesList]);

  return [sizes, setSizes];
}
