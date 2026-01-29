import { FlagKZ } from '@/components/icons/FlagKZ';
import { FlagUA } from '@/components/icons/FlagUA';
import { PremiumIcon } from '@/components/icons/PremiumIcon';
import { Combobox } from '@/components/ui/Combobox';
import { getVoiceOverList } from '@/extraction-scripts/extractVoiceOverList';
import { PopupInitialDataContext } from '@/html/popup';
import type { VoiceOverInfo } from '@/lib/types';
import { useContext, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store/store';
import {
  selectCurrentVoiceOver,
  selectVoiceOverList,
  setVoiceOverAction,
  setVoiceOverListAction,
} from './store/VoiceOverSelector.slice';

interface VoiceOverSelectorProps {
  defaultVoiceOverId: string;
  is_camrip?: string;
  is_director?: string;
  is_ads?: string;
}

export function VoiceOverSelector({
  defaultVoiceOverId,
  is_camrip,
  is_director,
  is_ads,
}: VoiceOverSelectorProps) {
  const dispatch = useAppDispatch();
  const { tabId, pageType } = useContext(PopupInitialDataContext)!;

  const voiceOverList = useAppSelector(selectVoiceOverList);
  const currentVoiceOver = useAppSelector(selectCurrentVoiceOver);

  useEffect(() => {
    // Если у нас нет списка озвучек - получаем его со страницы сайта
    if (voiceOverList !== null) return;
    getVoiceOverList(tabId!).then((result) => {
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

  const disabled = voiceOverList.length === 1;

  logger.info('New render VoiceOverSelector component.');

  return (
    <div className='flex items-center gap-2.5'>
      <label htmlFor='voiceOver' className='ml-auto text-sm select-none'>
        {browser.i18n.getMessage('popup_translate')}
      </label>
      <Combobox
        id='voiceOver'
        width='14.4rem'
        needSearch={voiceOverList.length > 12}
        value={JSON.stringify(currentVoiceOver) || ''}
        data={voiceOverList.map((voiceOver) => ({
          value: JSON.stringify(voiceOver),
          label: voiceOver.title,
          labelComponent({ children }) {
            return (
              <>
                {children}
                {voiceOver.flag_country && (
                  <FlagIcon
                    country={voiceOver.flag_country}
                    className='ml-2 size-4 shrink-0'
                  />
                )}
                {voiceOver.prem_content && (
                  <PremiumIcon className='ml-2 size-4 shrink-0' />
                )}
              </>
            );
          },
        }))}
        onValueChange={(value) =>
          dispatch(
            setVoiceOverAction({
              voiceOver: JSON.parse(value) as VoiceOverInfo,
            }),
          )
        }
        title={
          disabled
            ? browser.i18n.getMessage('popup_voiceoverBlock_title')
            : undefined
        }
        disabled={disabled}
      />
    </div>
  );
}

function FlagIcon({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  switch (country) {
    case 'ua':
      return <FlagUA className={className} />;
    case 'kz':
      return <FlagKZ className={className} />;
    default:
      return null;
  }
}
