import { useEffect } from 'react';
import { PremiumIcon } from '../../../components/Icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/Select';
import { getVoiceOverList } from '../../../extraction-scripts/extractVoiceOverList';
import { useAppDispatch, useAppSelector } from '../../../store';
import { useInitData } from '../../providers/InitialDataProvider';
import {
  selectCurrentVoiceOver,
  selectVoiceOverList,
  setVoiceOverAction,
  setVoiceOverListAction,
} from './VoiceOverSelector.slice';

type Props = {
  defaultVoiceOverId: string;
  is_camrip?: string;
  is_director?: string;
  is_ads?: string;
};

export function VoiceOverSelector({
  defaultVoiceOverId,
  is_camrip,
  is_director,
  is_ads,
}: Props) {
  const dispatch = useAppDispatch();
  const { tabId, pageType } = useInitData();
  const voiceOverList = useAppSelector((state) => selectVoiceOverList(state));
  const voiceOver = useAppSelector((state) => selectCurrentVoiceOver(state));

  useEffect(() => {
    if (voiceOverList !== null) return;
    getVoiceOverList(tabId).then((result) => {
      dispatch(setVoiceOverListAction({ voiceOverList: result }));
      const targetVoiceOver =
        result?.find((voiceOver) =>
          pageType === 'SERIAL'
            ? voiceOver.id === defaultVoiceOverId
            : voiceOver.id === defaultVoiceOverId &&
              voiceOver.is_camrip === is_camrip &&
              voiceOver.is_director === is_director &&
              voiceOver.is_ads === is_ads,
        ) || null;
      dispatch(setVoiceOverAction({ voiceOver: targetVoiceOver }));
    });
  }, [voiceOverList]);

  if (!voiceOverList) return null;

  logger.info('New render VoiceOverSelector component.');
  return (
    <div className='flex items-center gap-2.5'>
      <label htmlFor='voiceOver' className='ml-auto text-sm'>
        {browser.i18n.getMessage('popup_translate')}
      </label>
      <Select
        value={JSON.stringify(voiceOver)}
        onValueChange={(v) =>
          dispatch(setVoiceOverAction({ voiceOver: JSON.parse(v) }))
        }
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
