import { Checkbox } from '../../../components/Checkbox';
import { Combobox } from '../../../components/Combobox';
import { Subtitle } from '../../../lib/types';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectCurrentSubtitle,
  selectDownloadSubtitle,
  selectSubtitleList,
  setCurrentSubtitleAction,
  setDownloadSubtitleAction,
} from './SubtitleSelector.slice';

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
      <div className='flex items-center gap-2.5'>
        <Checkbox
          id='downloadSubtitle'
          checked={downloadSubtitle}
          onCheckedChange={(value) =>
            dispatch(
              setDownloadSubtitleAction({ downloadSubtitle: value as boolean }),
            )
          }
        />
        <label htmlFor='downloadSubtitle' className='text-base font-bold'>
          {browser.i18n.getMessage('popup_loadSubtitle')}
        </label>
      </div>

      {downloadSubtitle && (
        <div className='flex items-center gap-2.5'>
          <label htmlFor='subtitles' className='ml-auto text-sm'>
            {browser.i18n.getMessage('popup_subtitleLang')}
          </label>
          <Combobox
            id='subtitles'
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
