import { useEffect, useState } from 'react';
import { Message, Quality, URLsContainer } from '../../lib/types';

export function useQualitySize(qualities: Quality | null) {
  const [sizes, setSizes] = useState<URLsContainer | null>(null);

  useEffect(() => {
    if (!qualities) return;
    browser.runtime
      .sendMessage<Message<Quality>>({
        type: 'getFileSize',
        message: qualities,
      })
      .then((response) => {
        const result = response as URLsContainer;
        // logger.debug(result);
        setSizes(result);
      });
  }, [qualities]);

  return sizes;
}
