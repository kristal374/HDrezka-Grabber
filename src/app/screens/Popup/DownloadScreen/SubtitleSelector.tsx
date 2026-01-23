import { CheckboxWithLabel } from '@/components/ui/Checkbox';
import { Combobox } from '@/components/ui/Combobox';
import {
  Reveal,
  RevealContent,
  RevealTrigger,
} from '@/components/ui/RevealAnimation';
import { Subtitle } from '@/lib/types';
import { useAppDispatch, useAppSelector } from './store/store';
import {
  selectCurrentSubtitle,
  selectDownloadOnlySubtitle,
  selectDownloadSubtitle,
  selectSubtitleList,
  setCurrentSubtitleAction,
  setDownloadOnlySubtitleAction,
  setDownloadSubtitleAction,
} from './store/SubtitleSelector.slice';

export function SubtitleSelector() {
  const dispatch = useAppDispatch();
  const subtitleLang = useAppSelector(selectCurrentSubtitle);
  const subtitlesList = useAppSelector(selectSubtitleList);
  const downloadSubtitle = useAppSelector(selectDownloadSubtitle);
  const downloadOnlySubtitle = useAppSelector(selectDownloadOnlySubtitle);

  if (subtitlesList === null) return null;

  const onOpenChange = (open: boolean) => {
    dispatch(
      setDownloadSubtitleAction({
        downloadSubtitle: open,
      }),
    );
  };

  logger.info('New render SubtitleSelector component.');

  return (
    <>
      <Reveal open={downloadSubtitle} onOpenChange={onOpenChange}>
        <RevealTrigger>
          <CheckboxWithLabel
            id='downloadSubtitle'
            checked={downloadSubtitle}
            onCheckedChange={onOpenChange}
          >
            {browser.i18n.getMessage('popup_loadSubtitle')}
          </CheckboxWithLabel>
        </RevealTrigger>

       <RevealContent>
        <div className='mt-3 flex flex-col gap-2.5'>
          <CheckboxWithLabel
            id='downloadOnlySubtitle'
            className='ml-7.5'
            checked={downloadOnlySubtitle}
            onCheckedChange={(value) =>
              dispatch(
                setDownloadOnlySubtitleAction({
                  downloadOnlySubtitle: value,
                }),
              )
            }
          >
            {browser.i18n.getMessage('popup_downloadOnlySubtitle')}
          </CheckboxWithLabel>

            <div className='flex items-center gap-2.5'>
              <label
                htmlFor='subtitles'
                className='ml-auto text-sm select-none'
              >
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
          </div>
        </RevealContent>
      </Reveal>
    </>
  );
}
