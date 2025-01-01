import { useEffect, useState } from 'react';
import { Message, Quality } from '../../lib/types';

export function useQualities(streams: string | undefined) {
  const [qualities, setQualities] = useState<Quality | null>(null);

  useEffect(() => {
    if (!streams) return;
    browser.runtime
      .sendMessage<Message<string>>({
        type: 'decodeURL',
        message: streams,
      })
      .then((response) => {
        const result = response as Quality;
        // logger.debug(result);
        setQualities(result);
      });
  }, [streams]);

  return qualities;
}
