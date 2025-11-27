import { CheckboxWithLabel } from '@/components/ui/Checkbox';
import { Combobox } from '@/components/ui/Combobox';
import { Subtitle } from '@/lib/types';
import { useAppDispatch, useAppSelector } from './store/store';
import {
  selectCurrentSubtitle,
  selectDownloadSubtitle,
  selectSubtitleList,
  setCurrentSubtitleAction,
  setDownloadSubtitleAction,
} from './store/SubtitleSelector.slice';

export function SubtitleSelector() {
  const dispatch = useAppDispatch();
  const subtitleLang = useAppSelector((state) => selectCurrentSubtitle(state));
  const subtitlesList = useAppSelector((state) => selectSubtitleList(state));
  const downloadSubtitle = useAppSelector((state) =>
    selectDownloadSubtitle(state),
  );

  if (subtitlesList === null) return null;

  logger.info('New render SubtitleSelector component.');
  return (
    <>
      <CheckboxWithLabel
        id='downloadSubtitle'
        checked={downloadSubtitle}
        onCheckedChange={(value) =>
          dispatch(
            setDownloadSubtitleAction({ downloadSubtitle: value as boolean }),
          )
        }
      >
        {browser.i18n.getMessage('popup_loadSubtitle')}
      </CheckboxWithLabel>

      {downloadSubtitle && (
        <div className='flex items-center gap-2.5'>
          <label htmlFor='subtitles' className='ml-auto text-sm select-none'>
            {browser.i18n.getMessage('popup_subtitleLang')}
          </label>
          <Combobox
            id='subtitles'
            width='14.4rem'
            data={subtitlesList.map((subtitle) => ({
              value: JSON.stringify(subtitle),
              label: subtitle.lang,
            }))}
            value={JSON.stringify(subtitleLang)}
            onValueChange={(value) =>
              dispatch(
                setCurrentSubtitleAction({
                  subtitle: JSON.parse(value) as Subtitle,
                }),
              )
            }
          />
        </div>
      )}
    </>
  );
}
