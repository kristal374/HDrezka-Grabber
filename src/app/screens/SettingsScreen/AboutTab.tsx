import {
  Coffee,
  Copy,
  CopyCheck,
  DollarSign,
  ExternalLink,
  Github,
  Heart,
  Mail,
  Scale,
  UserCircle2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Panel } from '../../../components/Panel';

type StoreLink = {
  name: string;
  url: string;
  icon: string;
};

type Card = {
  cardTitle: string;
  cardIcon: React.ReactNode;
  cardContent: string;
  cardUrl?: string;
  needCopyButton?: boolean;
};

type DonationPlatform = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  link: string;
};

type Helper = {
  name: string;
  url?: string;
  description: string;
};

interface AboutTabProps {
  extensionName?: string;
  extensionVersion?: string;
  extensionShortDescription?: string;
  extensionLongDescription?: string;
  githubLink?: string;
  storeLinks?: StoreLink[];
  infoCards?: Card[];
  donations?: DonationPlatform[];
  helpers?: Helper[];
}

function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);

      if (resetTimeout.current) clearTimeout(resetTimeout.current);
      resetTimeout.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', content, err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className='hover:bg-settings-background-tertiary rounded p-1 transition-all duration-200'
      title={browser.i18n.getMessage('settings_CopyTitle')}
    >
      <div className='transition-all duration-200'>
        {isCopied ? (
          <CopyCheck className='h-4 w-4 animate-pulse text-green-500' />
        ) : (
          <Copy className='text-settings-text-tertiary hover:text-settings-text-accent h-4 w-4 transition-all duration-200 hover:scale-110' />
        )}
      </div>
    </button>
  );
}

function ExtensionStoreLink({ name, url, icon }: StoreLink) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      title={name}
      aria-label={name}
      className='border-settings-border-primary group bg-settings-background-primary hover:bg-settings-background-tertiary inline-flex h-10 items-center gap-2 rounded-lg border px-3 py-2 transition-transform duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2'
    >
      <img
        src={icon}
        alt={`${name} icon`}
        width={20}
        height={20}
        loading='lazy'
        className='h-5 w-5 flex-shrink-0 rounded-sm transition-transform duration-200 group-hover:scale-110'
      />
      <span className='text-sm leading-none font-bold whitespace-nowrap'>
        {name}
      </span>
    </a>
  );
}

function InfoCard({
  children,
  title,
  icon,
}: {
  children?: React.ReactNode;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className='border-settings-border-secondary bg-settings-background-tertiary/50 hover:bg-settings-background-tertiary/70 rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md'>
      <div className='p-4'>
        <div className='mb-3 flex items-center gap-3'>
          <div className='transition-transform duration-300 hover:scale-110'>
            {icon}
          </div>
          <span className='text-settings-text-secondary text-base font-medium'>
            {title}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function DonationCard({ donation }: { donation: DonationPlatform }) {
  return (
    <div className='group border-settings-border-secondary bg-settings-background-tertiary/50 hover:bg-settings-background-tertiary/80 rounded-lg border shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg'>
      <div className='p-4 text-center'>
        <div className='mb-3 transition-transform duration-300 group-hover:scale-110'>
          {donation.icon}
        </div>
        <div className='text-settings-text-secondary group-hover:text-settings-text-primary mb-2 text-xl font-bold transition-colors duration-300'>
          {donation.title}
        </div>
        <div className='text-settings-text-tertiary mb-3 text-sm'>
          {donation.subtitle}
        </div>
        <a
          href={donation.link}
          target='_blank'
          rel='noopener noreferrer'
          className='text-link-color hover:text-link-color/80 inline-flex items-center gap-1 text-sm transition-all duration-300 hover:scale-105 hover:underline'
        >
          <span>{browser.i18n.getMessage('settings_SupportButton')}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      </div>
    </div>
  );
}

function HelperCard({ helper }: { helper: Helper }) {
  return (
    <div className='bg-settings-background-tertiary/30 hover:bg-settings-background-tertiary/50 flex items-start gap-3 rounded-lg p-3 transition-all duration-300'>
      <UserCircle2 className='text-settings-text-tertiary mt-0.5 h-5 w-5 flex-shrink-0' />
      <div className='text-settings-text-secondary'>
        <div className='mb-1 text-lg font-medium'>
          {helper.url ? (
            <a
              href={helper.url}
              target='_blank'
              rel='noreferrer'
              className='hover:text-link-color/80 inline-flex items-center gap-2 transition-all duration-300 hover:underline'
            >
              {helper.name}
              <ExternalLink className='h-3 w-3 transition-transform duration-300' />
            </a>
          ) : (
            helper.name
          )}
        </div>
        <div className='text-settings-text-tertiary text-base'>
          {helper.description}
        </div>
      </div>
    </div>
  );
}

function ProjectDescription({
  extensionLongDescription,
  infoCards,
}: {
  extensionLongDescription: string;
  infoCards?: Card[];
}) {
  return (
    <section className='animate-fade-in'>
      <h2 className='text-settings-text-primary mb-4 text-2xl font-medium'>
        {browser.i18n.getMessage('settings_AboutTitle')}
      </h2>
      <p className='text-settings-text-accent mb-6 text-base leading-relaxed'>
        {extensionLongDescription}
      </p>

      {infoCards && (
        <div className='grid gap-4 md:grid-cols-2'>
          {infoCards.map((card, index) => (
            <InfoCard key={index} title={card.cardTitle} icon={card.cardIcon}>
              <div className='flex items-center gap-2'>
                <span className='border-settings-border-secondary text-settings-text-accent bg-settings-background-primary/50 inline-flex items-center rounded border px-2.5 py-0.5 text-sm font-semibold'>
                  {card.cardUrl ? (
                    <a
                      href={card.cardUrl}
                      className='text-settings-text-accent hover:text-link-color transition-colors duration-300'
                    >
                      {card.cardContent}
                    </a>
                  ) : (
                    card.cardContent
                  )}
                </span>
                {card.needCopyButton && (
                  <CopyButton content={card.cardContent} />
                )}
              </div>
            </InfoCard>
          ))}
        </div>
      )}
    </section>
  );
}

function SupportSection({
  extensionName,
  donations,
}: {
  extensionName: string;
  donations?: DonationPlatform[];
}) {
  return (
    <section className='border-settings-border-secondary border-t pt-8'>
      <div className='mb-6 text-center'>
        <div className='mb-2 flex items-center justify-center gap-2'>
          <Heart className='h-6 w-6 animate-pulse fill-current text-red-500' />
          <h2 className='text-settings-text-primary text-2xl font-medium'>
            {browser.i18n.getMessage('settings_SupportTitle')}
          </h2>
        </div>
        <p className='text-settings-text-tertiary mx-auto max-w-2xl text-base'>
          {browser.i18n.getMessage(
            'settings_SupportDescription',
            extensionName,
          )}
        </p>
      </div>

      {donations && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {donations.map((donation, index) => (
            <DonationCard key={index} donation={donation} />
          ))}
        </div>
      )}
    </section>
  );
}

function HelpersSection({ helpers }: { helpers?: Helper[] }) {
  if (!helpers || helpers.length === 0) return null;

  return (
    <section>
      <div className='border-settings-border-tertiary bg-settings-background-accent/50 rounded-lg border shadow-sm'>
        <div className='p-6'>
          <h3 className='text-settings-text-primary mb-4 text-center text-2xl font-medium'>
            {browser.i18n.getMessage('settings_DevelopersTitle')}
          </h3>
          <div className='grid gap-3'>
            {helpers.map((helper, index) => (
              <HelperCard key={index} helper={helper} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExtensionHeader({
  extensionName,
  extensionVersion,
  extensionShortDescription,
  githubLink,
  storeLinks,
}: {
  extensionName: string;
  extensionVersion: string;
  extensionShortDescription: string;
  githubLink: string;
  storeLinks: StoreLink[];
}) {
  return (
    <div className='border-settings-border-primary flex flex-col space-y-1.5 border-b p-6'>
      <div className='flex flex-col items-start gap-4'>
        <div className='flex w-full items-center justify-between'>
          <div className='flex-1'>
            <h1 className='text-settings-text-primary text-3xl font-bold'>
              {extensionName}
            </h1>
          </div>
          <div className='bg-settings-background-primary border-settings-border-primary text-settings-text-primary hover:bg-settings-background-tertiary inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:scale-105'>
            <span>{extensionVersion}</span>
          </div>
        </div>

        <div className='w-full'>
          <p className='text-settings-text-tertiary mb-4 text-lg leading-relaxed'>
            {extensionShortDescription}
          </p>

          <div className='mb-4 flex items-center gap-3'>
            <a
              href={githubLink}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-link-color group text-settings-text-secondary inline-flex items-center gap-2 text-sm'
            >
              <Github className='h-4 w-4 transition-transform' />
              <span>{browser.i18n.getMessage('settings_SourceCode')}</span>
              <ExternalLink className='h-3 w-3 transition-transform' />
            </a>
          </div>

          <div className='space-y-3'>
            <div className='text-settings-text-secondary text-sm font-medium'>
              {browser.i18n.getMessage('settings_DownloadExtension')}:
            </div>
            <div className='flex flex-wrap gap-3'>
              {storeLinks.map((link, index) => (
                <ExtensionStoreLink key={index} {...link} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AboutTab({
  extensionName = browser.runtime.getManifest().name,
  extensionVersion = `v${
    browser.runtime.getManifest().version_name ??
    browser.runtime.getManifest().version
  }`,
  extensionShortDescription = browser.i18n.getMessage(
    'settings_ShortDescription',
  ),
  extensionLongDescription = browser.i18n.getMessage(
    'settings_LongDescription',
  ),
  githubLink = browser.runtime.getManifest().homepage_url!,
  // TODO: добавить ссылки на магазины расширений
  storeLinks = [
    {
      name: 'Chrome Web Store',
      url: 'https://chromewebstore.google.com/detail/hdrezka-grabber/aamnmboocelpaiagegjicbefiinkcoal',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/64px-Google_Chrome_icon_%28February_2022%29.svg.png',
    },
    // {
    //   name: 'Firefox Add-ons',
    //   url: 'https://addons.mozilla.org/en-US/firefox/addon/your-addon',
    //   icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Firefox_logo%2C_2019.svg/64px-Firefox_logo%2C_2019.svg.png',
    // },
    {
      name: 'Opera Add-ons',
      url: 'https://addons.opera.com/ru/extensions/details/hdrezka-grabber/',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Opera_2015_icon.svg/64px-Opera_2015_icon.svg.png',
    },
    // {
    //   name: 'Microsoft Edge',
    //   url: 'https://microsoftedge.microsoft.com/addons/detail/your-extension-id',
    //   icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Microsoft_Edge_logo_%282019%29.svg/64px-Microsoft_Edge_logo_%282019%29.svg.png',
    // },
  ],
  infoCards = [
    {
      cardTitle: browser.i18n.getMessage('settings_LicenseTitle'),
      cardIcon: <Scale className='text-settings-text-tertiary h-5 w-5' />,
      cardContent: 'GPL-3.0',
    },
    {
      cardTitle: browser.i18n.getMessage('settings_ContactsTitle'),
      cardIcon: <Mail className='text-settings-text-tertiary h-5 w-5' />,
      cardContent: browser.runtime.getManifest().author!,
      cardUrl: 'mailto:' + browser.runtime.getManifest().author!,
      needCopyButton: true,
    },
  ],
  // TODO: добавить ссылки на платёжные сервисы
  donations = [
    {
      title: 'Patreon',
      subtitle: browser.i18n.getMessage('settings_patreonSubtitle'),
      icon: <Coffee className='mx-auto h-8 w-8 text-orange-500' />,
      link: 'https://patreon.com/reactextpro',
    },
    {
      title: 'PayPal',
      subtitle: browser.i18n.getMessage('settings_PayPalSubtitle'),
      icon: <DollarSign className='mx-auto h-8 w-8 text-blue-500' />,
      link: 'https://paypal.me/reactextpro',
    },
    {
      title: 'Monero',
      subtitle: browser.i18n.getMessage('settings_MoneroSubtitle'),
      icon: (
        <div className='mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white'>
          XMR
        </div>
      ),
      link: 'monero:',
    },
    {
      title: 'GitHub Sponsors',
      subtitle: browser.i18n.getMessage('settings_GitHubSubtitle'),
      icon: <Heart className='mx-auto h-8 w-8 text-red-500' />,
      link: 'https://github.com/sponsors/yourname',
    },
  ],
  helpers = [
    {
      name: 'kristal374',
      url: 'https://github.com/kristal374/',
      description: browser.i18n.getMessage('settings_AuthorDescription'),
    },
    {
      name: 'lr0pb',
      url: 'https://github.com/lr0pb/',
      description: browser.i18n.getMessage('settings_SecondPilotDescription'),
    },
  ],
}: AboutTabProps) {
  return (
    <Panel className='p-0'>
      <ExtensionHeader
        extensionName={extensionName}
        extensionVersion={extensionVersion}
        extensionShortDescription={extensionShortDescription}
        githubLink={githubLink}
        storeLinks={storeLinks}
      />

      <div className='space-y-8 p-8'>
        <ProjectDescription
          extensionLongDescription={extensionLongDescription}
          infoCards={infoCards}
        />

        <SupportSection extensionName={extensionName} donations={donations} />

        <HelpersSection helpers={helpers} />
      </div>
    </Panel>
  );
}
