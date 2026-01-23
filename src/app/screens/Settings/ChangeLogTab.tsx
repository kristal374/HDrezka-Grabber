import { Panel } from '@/components/Panel';
import { OutsideLink } from '@/components/ui/OutsideLink';
import {
  AlertCircleIcon,
  CalendarIcon,
  Edit3Icon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  WrenchIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type ContentChapter = 'Added' | 'Fixed' | 'Changed';

interface Release {
  version: string;
  url: string | null;
  date: string;
  description: string | null;
  content: Record<ContentChapter, string[]>;
}

interface ChangeLogTabProps {
  changelogUrl?: string;
}

function ChangeTypeIcon({ type }: { type: ContentChapter }) {
  const iconClassName =
    'size-5 transition-transform duration-300 group-hover:scale-110';

  switch (type) {
    case 'Added':
      return <PlusIcon className={`${iconClassName} text-green-500`} />;
    case 'Fixed':
      return <WrenchIcon className={`${iconClassName} text-orange-500`} />;
    case 'Changed':
      return <Edit3Icon className={`${iconClassName} text-blue-500`} />;
    default:
      return (
        <AlertCircleIcon
          className={`${iconClassName} text-settings-text-tertiary`}
        />
      );
  }
}

function ReleaseHeader({ release }: { release: Release }) {
  return (
    <div className='flex items-baseline justify-between gap-4'>
      <h1 className='text-settings-text-primary flex items-center gap-2 text-2xl font-bold'>
        <PackageIcon className='text-settings-text-tertiary size-6' />
        {release.url ? (
          <OutsideLink
            url={release.url}
            text={release.version}
            icon
            underlineOnHover
          />
        ) : (
          <span className='focus-ring rounded px-1' tabIndex={0}>
            {release.version}
          </span>
        )}
      </h1>
      {release.date && (
        <div className='text-settings-text-tertiary flex items-center gap-2 text-lg'>
          <CalendarIcon className='size-4' />
          <span className='font-medium'>{release.date}</span>
        </div>
      )}
    </div>
  );
}

function ReleaseDescription({ description }: { description: string }) {
  return (
    <div className='bg-settings-background-tertiary/30 mt-4'>
      <p className='text-settings-text-accent text-xl leading-relaxed'>
        {description}
      </p>
    </div>
  );
}

function ChangeSection({
  type,
  items,
}: {
  type: ContentChapter;
  items: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <section>
      <h2 className='text-settings-text-accent mb-2 flex items-center gap-2 text-xl font-semibold'>
        <ChangeTypeIcon type={type} />
        {browser.i18n.getMessage(`settings_Changelog${type}`)}
      </h2>
      <ul className='mt-2 ml-6 list-outside list-disc space-y-1 pl-6'>
        {items.map((itm) => (
          <li className='text-settings-text-tertiary pt-0.5 text-base'>
            {itm}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReleaseElement({ release }: { release: Release }) {
  const content = release.content ?? {};
  const hasAnySections = Object.values(content).some(
    (items) => items && items.length > 0,
  );

  return (
    <Panel>
      <ReleaseHeader release={release} />

      {release.description && (
        <ReleaseDescription description={release.description} />
      )}

      {hasAnySections && (
        <>
          <hr className='border-settings-border-secondary my-5 border-t-2' />
          <div className='flex flex-col gap-8'>
            {Object.entries(content).map(([type, items]) => (
              <ChangeSection
                key={type}
                type={type as ContentChapter}
                items={items}
              />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function EdgeCaseState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Panel className='p-8 text-center'>
      <div className='text-settings-text-primary mb-2 flex items-center justify-center gap-3'>
        {icon}
        <span className='text-xl font-medium'>{title}</span>
      </div>
      {description && (
        <p className='text-settings-text-tertiary'>{description}</p>
      )}
    </Panel>
  );
}

const changelogContentCache: Record<string, Release[]> = {};

export function ChangeLogTab({
  changelogUrl = 'CHANGELOG.md',
}: ChangeLogTabProps) {
  const [changelogContent, setChangelogContent] = useState<Release[] | null>(
    changelogContentCache[changelogUrl] ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (changelogContentCache[changelogUrl]) return;
    const loadChangelog = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const fullChangelogUrl = browser.runtime.getURL(changelogUrl);
        const response = await fetch(fullChangelogUrl);
        const content = await response.text();
        const parsed = parseChangelog(content);
        changelogContentCache[changelogUrl] = parsed;
        setChangelogContent(parsed);
      } catch (error) {
        console.error('Failed to load changelog:', error);
        setHasError(true);
        setChangelogContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadChangelog();
  }, [changelogUrl]);

  if (isLoading)
    return (
      <EdgeCaseState
        icon={<RefreshCwIcon className='size-6 animate-spin' />}
        title={browser.i18n.getMessage('settings_ChangelogProcessing')}
      />
    );
  if (hasError)
    return (
      <EdgeCaseState
        icon={<AlertCircleIcon className='size-6' />}
        title={browser.i18n.getMessage('settings_ChangelogErrorLoading_title')}
        description={browser.i18n.getMessage(
          'settings_ChangelogErrorLoading_description',
        )}
      />
    );
  if (!changelogContent || changelogContent.length === 0)
    return (
      <EdgeCaseState
        icon={<PackageIcon className='size-6' />}
        title={browser.i18n.getMessage('settings_ChangelogNoData_title')}
        description={browser.i18n.getMessage(
          'settings_ChangelogNoData_description',
        )}
      />
    );

  return changelogContent.map((release, index) => (
    <ReleaseElement key={index} release={release} />
  ));
}

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
