import { useEffect, useState } from 'react';
import { Message, QualitiesList, QualityItem, SetState } from '../../lib/types';

export function useQualities(
  streams: string | undefined,
  setQuality: SetState<QualityItem>,
) {
  const [qualitiesList, setQualitiesList] = useState<QualitiesList | null>(
    null,
  );

  useEffect(() => {
    if (!streams) return;
    browser.runtime
      .sendMessage<Message<string>>({
        type: 'decodeURL',
        message: streams,
      })
      .then((response) => {
        const result = response as QualitiesList;
        // logger.debug(result);
        setQualitiesList(result);
        const qualities = Object.keys(result) as QualityItem[];
        setQuality(qualities.at(-1)!);
      });
  }, [streams]);

  return qualitiesList;
}
