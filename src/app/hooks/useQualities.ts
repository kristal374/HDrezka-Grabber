import { useEffect, useState } from 'react';
import { FilmInfo, Message, Quality, SerialInfo } from '../../lib/types';

export function useQualities(movieInfo: FilmInfo | SerialInfo | null) {
  const [qualities, setQualities] = useState<Quality | null>(null);

  useEffect(() => {
    if (!movieInfo) return;
    browser.runtime
      .sendMessage<Message<string>>({
        type: 'decodeURL',
        message: movieInfo.streams,
      })
      .then((response) => {
        const result = response as Quality;
        // logger.debug(result);
        setQualities(result);
      });
  }, [movieInfo]);

  return qualities;
}
