import { CopyButton } from '@/components/CopyButton';
import { ChromeIcon } from '@/components/icons/ChromeIcon';
import { EdgeIcon } from '@/components/icons/EdgeIcon';
import { FirefoxIcon } from '@/components/icons/FirefoxIcon';
import { GitHubIcon } from '@/components/icons/GitHubIcon';
import { OperaIcon } from '@/components/icons/OperaIcon';
import { Panel } from '@/components/Panel';
import { OutsideLink } from '@/components/ui/OutsideLink';
import { HeartIcon, MailIcon, ScaleIcon, UserCircle2Icon } from 'lucide-react';

type StoreLink = {
  name: string;
  url: string;
  Icon: React.FC<React.ComponentProps<'svg'>>;
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

type Person = {
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
  people?: Person[];
}

function ExtensionStoreLink({ name, url, Icon }: StoreLink) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      title={name}
      aria-label={name}
      className='focus-ring border-settings-border-primary group bg-settings-background-primary hover:bg-settings-background-tertiary inline-flex h-10 items-center gap-2 rounded-lg border px-3 py-2 transition-transform duration-200 hover:scale-105'
    >
      <Icon
        width={20}
        height={20}
        className='size-5 shrink-0 rounded-sm transition-transform duration-200 group-hover:scale-110'
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
    <div className='group border-settings-border-secondary bg-settings-background-tertiary/50 hover:bg-settings-background-tertiary/80 flex flex-col items-center rounded-lg border px-3 py-4 text-center shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg'>
      <div className='mb-3 transition-transform duration-300 group-hover:scale-110'>
        {donation.icon}
      </div>
      <div className='text-settings-text-secondary group-hover:text-settings-text-primary mb-2 text-xl font-bold transition-colors duration-300'>
        {donation.title}
      </div>
      <div className='text-settings-text-tertiary mb-3 text-sm text-balance'>
        {donation.subtitle}
      </div>
      <OutsideLink
        url={donation.link}
        text={browser.i18n.getMessage('settings_SupportButton')}
        className='mt-auto text-sm transition-transform duration-300 hover:scale-105'
        icon
        underlineOnHover
      />
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  return (
    <div className='bg-settings-background-tertiary/30 text-settings-text-tertiary hover:bg-settings-background-tertiary/50 flex flex-col gap-1 rounded-lg p-3 transition-colors duration-300'>
      <div className='flex items-center gap-2'>
        <UserCircle2Icon className='size-5' />
        <span className='text-lg font-medium'>
          {person.url ? (
            <OutsideLink
              className='p-1'
              url={person.url}
              text={person.name}
              icon
              underlineOnHover
            />
          ) : (
            person.name
          )}
        </span>
      </div>
      <p className='pl-8 text-base'>{person.description}</p>
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
                      className='focus-ring text-settings-text-accent hover:text-link-color transition-colors'
                    >
                      {card.cardContent}
                    </a>
                  ) : (
                    card.cardContent
                  )}
                </span>
                {card.needCopyButton && (
                  <CopyButton
                    content={card.cardContent}
                    variant='ghost'
                    className='rounded'
                  />
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
          <HeartIcon className='size-6 animate-pulse fill-current text-red-500' />
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

function PersonsSection({ people }: { people?: Person[] }) {
  if (!people || people.length === 0) return null;

  return (
    <section>
      <div className='border-settings-border-tertiary bg-settings-background-accent/50 rounded-lg border shadow-sm'>
        <div className='p-6'>
          <h3 className='text-settings-text-primary mb-4 text-center text-2xl font-medium'>
            {browser.i18n.getMessage('settings_DevelopersTitle')}
          </h3>
          <div className='grid gap-3'>
            {people.map((person, index) => (
              <PersonCard key={index} person={person} />
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
  const split = extensionVersion.split('.');
  const build = split.pop();
  const version = `v${split.join('.')}`;
  return (
    <div className='border-settings-border-primary flex flex-col space-y-1.5 border-b p-6'>
      <div className='flex flex-col items-start gap-4'>
        <div className='flex w-full items-center justify-between'>
          <div className='flex-1'>
            <h1 className='text-settings-text-primary text-3xl font-bold'>
              {extensionName}
            </h1>
          </div>
          <div
            className='bg-settings-background-primary border-settings-border-primary text-settings-text-primary hover:bg-settings-background-tertiary inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-300 hover:scale-105'
            title={`Build number: ${build}`}
          >
            <span>{version}</span>
          </div>
        </div>

        <div className='w-full'>
          <p className='text-settings-text-tertiary mb-4 text-lg leading-relaxed'>
            {extensionShortDescription}
          </p>

          <div className='mb-4 flex items-center gap-1'>
            <GitHubIcon className='light:fill-black size-5 fill-white' />
            <OutsideLink
              url={githubLink}
              text={browser.i18n.getMessage('settings_SourceCode')}
              className='text-settings-text-secondary text-sm'
              icon
              underlineOnHover
            />
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
  extensionVersion = browser.runtime.getManifest().version,
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
      Icon: ChromeIcon,
    },
    {
      name: 'Firefox Add-ons',
      url: 'https://addons.mozilla.org/en-US/firefox/addon/hdrezka-grabber',
      Icon: FirefoxIcon,
    },
    {
      name: 'Opera Add-ons',
      url: 'https://addons.opera.com/ru/extensions/details/hdrezka-grabber/',
      Icon: OperaIcon,
    },
    {
      name: 'Microsoft Edge',
      url: 'https://microsoftedge.microsoft.com/addons/detail/hdrezka-grabber',
      Icon: EdgeIcon,
    },
  ],
  infoCards = [
    {
      cardTitle: browser.i18n.getMessage('settings_LicenseTitle'),
      cardIcon: <ScaleIcon className='text-settings-text-tertiary h-5 w-5' />,
      cardContent: 'GPL-3.0',
    },
    {
      cardTitle: browser.i18n.getMessage('settings_ContactsTitle'),
      cardIcon: <MailIcon className='text-settings-text-tertiary h-5 w-5' />,
      cardContent: browser.runtime.getManifest().author!,
      cardUrl: 'mailto:' + browser.runtime.getManifest().author!,
      needCopyButton: true,
    },
  ],
  // TODO: добавить ссылки на платёжные сервисы
  donations = [
    // {
    //   title: 'Patreon',
    //   subtitle: browser.i18n.getMessage('settings_patreonSubtitle'),
    //   icon: <CoffeeIcon className='mx-auto h-8 w-8 text-orange-500' />,
    //   link: 'https://patreon.com/',
    // },
    // {
    //   title: 'PayPal',
    //   subtitle: browser.i18n.getMessage('settings_PayPalSubtitle'),
    //   icon: <DollarSignIcon className='mx-auto h-8 w-8 text-blue-500' />,
    //   link: 'https://paypal.me/',
    // },
    // {
    //   title: 'Monero',
    //   subtitle: browser.i18n.getMessage('settings_MoneroSubtitle'),
    //   icon: (
    //     <div className='mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white'>
    //       XMR
    //     </div>
    //   ),
    //   link: 'monero:',
    // },
    // {
    //   title: 'GitHub Sponsors',
    //   subtitle: browser.i18n.getMessage('settings_GitHubSubtitle'),
    //   icon: <HeartIcon className='mx-auto h-8 w-8 text-red-500' />,
    //   link: 'https://github.com/sponsors/',
    // },
  ],
  people = [
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

        <PersonsSection people={people} />
      </div>
    </Panel>
  );
}
