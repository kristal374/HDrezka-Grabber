import { useEffect, useState } from 'react';
import { OutsideLink } from '../../../components/OutsideLink';
import Panel from './SettingsTab';

type ContentChapter = 'Added' | 'Fixed' | 'Changed';

interface Release {
  version: string;
  url: string | null;
  date: string;
  description: string | null;
  content: Record<ContentChapter, string[]>;
}

export function ChangeLogTab() {
  const [changelogContent, setChangelogContent] = useState<Release[] | null>(
    null,
  );

  useEffect(() => {
    const changelogUrl = browser.runtime.getURL('CHANGELOG.md');
    fetch(changelogUrl)
      .then((response) => {
        response
          .text()
          .then((text) => setChangelogContent(parseChangelog(text)));
      })
      .catch(() => setChangelogContent(null));
  }, []);

  if (!changelogContent || changelogContent.length === 0) return null;

  return (
    <div className='space-y-4'>
      {changelogContent.map((r) => (
        <ReleaseElement release={r} />
      ))}
    </div>
  );
}

const ReleaseElement: React.FC<{ release: Release }> = ({ release }) => {
  const content = release.content ?? {};
  const hasAnySections = Object.values(content).some((i) => i.length);

  return (
    <Panel>
      <div className='flex items-baseline justify-between gap-4 text-2xl font-bold'>
        <h1>
          {release.url ? (
            <OutsideLink url={release.url} text={release.version} />
          ) : (
            <span>{release.version}</span>
          )}
        </h1>
        {release.date ? <span className='text-lg'>{release.date}</span> : null}
      </div>

      {release.description ? (
        <div className='mt-4 text-xl leading-relaxed'>
          <p>{release.description}</p>
        </div>
      ) : null}

      {hasAnySections ? (
        <>
          <div className='mt-2 border-t-2 border-[#959595] pt-4' />

          {Object.entries(content).map(([key, value]) => (
            <section className='mt-8'>
              <h2 className='mb-2 text-xl font-semibold md:text-base'>{key}</h2>
              <ul className='ml-6 mt-2 list-outside list-disc space-y-1'>
                {value.map((itm) => (
                  <li className='pt-0.5 text-base'>{itm}</li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : null}
    </Panel>
  );
};

function parseChangelog(changelog: string): Release[] {
  const releases: Release[] = [];

  const chapterRe = /^###\s+(\w+)/;
  const releaseRe =
    /^##\s+\[(?:\[(\S+?)]\((https?:\/\/[^)]+)\)|(.+?))]\s*-\s*(\d{4}-\d{1,2}-\d{1,2}|yyyy-mm-dd)/;
  const listItemRe = /^(?:\*|\+|-|\d+\)|\d+\.)\s+/;

  let currentContentChapter: ContentChapter | null = null;

  const lines = changelog.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const chMatch = line.match(chapterRe);
    if (chMatch) {
      currentContentChapter = chMatch[1] as ContentChapter;
      if (releases.length) {
        const last = releases[releases.length - 1];
        if (!last.content[currentContentChapter]) {
          last.content[currentContentChapter] = [];
        }
      }
      continue;
    }

    const rMatch = line.match(releaseRe);
    if (rMatch) {
      const [, urlVersion, url, stringVersion, date] = rMatch;
      const version = (urlVersion ?? stringVersion)?.trim() ?? '';
      const releaseUrl = url ?? null;
      releases.push({
        version,
        url: releaseUrl,
        date,
        description: null,
        content: {} as Record<ContentChapter, string[]>,
      });
      currentContentChapter = null;
      continue;
    }

    if (releases.length) {
      const last = releases[releases.length - 1];
      const key = currentContentChapter ?? 'description';
      if (key === 'description') {
        if (last.description) {
          last.description += ' ' + line;
        } else {
          last.description = line;
        }
      } else {
        if (!last.content[key]) last.content[key] = [];

        if (listItemRe.test(line)) {
          last.content[key].push(line.replace(listItemRe, '').trim());
        } else {
          const arr = last.content[key];
          if (arr.length > 0) {
            arr[arr.length - 1] = arr[arr.length - 1] + ' ' + line;
          } else {
            arr.push(line);
          }
        }
      }
    }
  }

  return releases;
}
