import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/Select';
import { useVoiceOver } from '../../hooks/useVoiceOver';
import { useEffect, useState } from 'react';
import { PageType, SetState, VoiceOverInfo } from '../../../lib/types';
import { PremiumIcon } from '../../../components/Icons';

type Props = {
  pageType: PageType;
  defaultVoiceOverId: string;
  is_camrip?: string;
  is_director?: string;
  is_ads?: string;
  voiceOver: VoiceOverInfo | null;
  setVoiceOver: SetState<VoiceOverInfo | null>;
};

export function VoiceOverSelector({
  pageType,
  defaultVoiceOverId,
  is_camrip,
  is_director,
  is_ads,
  voiceOver,
  setVoiceOver,
}: Props) {
  const voiceOverList = useVoiceOver(pageType);

  useEffect(() => {
    if (!voiceOverList) return;
    const targetVoiceOver =
      voiceOverList?.find((voiceOver) =>
        pageType === 'SERIAL'
          ? voiceOver.id === defaultVoiceOverId
          : voiceOver.id === defaultVoiceOverId &&
            voiceOver.is_camrip === is_camrip &&
            voiceOver.is_director === is_director &&
            voiceOver.is_ads === is_ads,
      ) || null;
    setVoiceOver(targetVoiceOver);
  }, [voiceOverList]);

  if (!voiceOverList) return null;

  return (
    <div className='flex items-center gap-2.5'>
      <label htmlFor='voiceOver' className='ml-auto text-sm'>
        {browser.i18n.getMessage('popup_translate')}
      </label>
      <Select
        value={JSON.stringify(voiceOver)}
        onValueChange={(v) => setVoiceOver(JSON.parse(v))}
      >
        <SelectTrigger id='voiceOver' className='w-[225px] py-1.5'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {voiceOverList.map((voiceOverInfo) => {
            return (
              <SelectItem
                value={JSON.stringify(voiceOverInfo)}
                key={JSON.stringify(voiceOverInfo)}
              >
                {voiceOverInfo.title}
                {voiceOverInfo.flag_country && (
                  <span>({voiceOverInfo.flag_country.toUpperCase()})</span>
                )}
                {voiceOverInfo.prem_content && <PremiumIcon />}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
