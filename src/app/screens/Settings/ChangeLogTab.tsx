import {
  AlertCircle,
  Calendar,
  Edit3,
  ExternalLink,
  Package,
  Plus,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Panel } from '../../../components/Panel';

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

function OutsideLink({ url, text }: { url: string; text: string }) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='group text-link-color hover:text-link-color/80 inline-flex items-center gap-2 transition-all duration-300 hover:underline'
    >
      <span>{text}</span>
      <ExternalLink className='h-4 w-4 transition-transform' />
    </a>
  );
}

function ChangeTypeIcon({ type }: { type: ContentChapter }) {
  const iconProps = {
    className:
      'h-5 w-5 transition-transform duration-300 group-hover:scale-110',
  };

  switch (type) {
    case 'Added':
      return (
        <Plus
          {...iconProps}
          className={`${iconProps.className} text-green-500`}
        />
      );
    case 'Fixed':
      return (
        <Wrench
          {...iconProps}
          className={`${iconProps.className} text-orange-500`}
        />
      );
    case 'Changed':
      return (
        <Edit3
          {...iconProps}
          className={`${iconProps.className} text-blue-500`}
        />
      );
    default:
      return (
        <AlertCircle
          {...iconProps}
          className={`${iconProps.className} text-settings-text-tertiary`}
        />
      );
  }
}

function ReleaseHeader({ release }: { release: Release }) {
  return (
    <div className='flex items-baseline justify-between gap-4'>
      <h1 className='text-settings-text-primary flex items-center gap-3 text-2xl font-bold'>
        <Package className='text-settings-text-tertiary h-6 w-6' />
        {release.url ? (
          <OutsideLink url={release.url} text={release.version} />
        ) : (
          <span className='hover:text-settings-text-accent transition-colors duration-300'>
            {release.version}
          </span>
        )}
      </h1>
      {release.date && (
        <div className='text-settings-text-tertiary flex items-center gap-2 text-lg'>
          <Calendar className='h-4 w-4' />
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
    <section className='mt-8'>
      <h2 className='text-settings-text-accent mb-2 flex items-center gap-2 text-xl font-semibold'>
        <ChangeTypeIcon type={type} />
        {type}
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
          <hr className='border-settings-border-secondary mt-2 border-t-2' />
          <div className='space-y-8'>
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

function LoadingState() {
  return (
    <div className='border-settings-border-secondary bg-settings-background-primary border-y p-8 text-center'>
      <div className='text-settings-text-primary mb-2 flex items-center justify-center gap-3'>
        <RefreshCw className='h-6 w-6 animate-spin' />
        <span className='text-lg'>Загрузка данных...</span>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className='border-settings-border-secondary bg-settings-background-primary border-y p-8 text-center'>
      <div className='text-settings-text-primary mb-2 flex items-center justify-center gap-3'>
        <AlertCircle className='h-6 w-6' />
        <span className='text-xl font-medium'>Ошибка загрузки</span>
      </div>
      <p className='text-settings-text-tertiary'>
        Не удалось загрузить список изменений.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className='border-settings-border-secondary bg-settings-background-primary border-y p-8 text-center'>
      <div className='text-settings-text-primary mb-2 flex items-center justify-center gap-3'>
        <Package className='h-8 w-8' />
        <span className='text-xl font-medium'>Нет данных</span>
      </div>
      <p className='text-settings-text-tertiary'>
        Список изменений пуст или недоступен.
      </p>
    </div>
  );
}

export function ChangeLogTab({
  changelogUrl = 'CHANGELOG.md',
}: ChangeLogTabProps) {
  const [changelogContent, setChangelogContent] = useState<Release[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadChangelog = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const fullChangelogUrl = browser.runtime.getURL(changelogUrl);
        const response = await fetch(fullChangelogUrl);
        const content = await response.text();
        setChangelogContent(parseChangelog(content));
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

  if (isLoading) return <LoadingState />;
  if (hasError) return <ErrorState />;
  if (!changelogContent || changelogContent.length === 0) return <EmptyState />;

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
