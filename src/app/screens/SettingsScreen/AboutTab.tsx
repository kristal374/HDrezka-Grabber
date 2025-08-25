import {
  Code,
  Coffee,
  DollarSign,
  ExternalLink,
  Github,
  Heart,
  Mail,
  Scale,
} from 'lucide-react';

type StoreLink = {
  name: string;
  url: string;
  icon: string;
};

interface Props {
  extensionName?: string;
  extensionVersion?: string;
  extensionShortDescription?: string;
  extensionLongDescription?: string;
  githubLink?: string;
  storeLinks?: StoreLink[];
}

function ExtensionStoreLink({ name, url, icon }: StoreLink) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='hover:bg-muted inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 transition-colors'
    >
      <img src={icon} className='h-5 w-5' alt={`${name} icon`} />
      <span className='text-sm font-medium'>{name}</span>
    </a>
  );
}

function InfoCard({
  title,
  icon,
  content,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  return (
    <div className='rounded-lg border border-slate-200 bg-slate-50/50 shadow-sm'>
      <div className='p-4'>
        <div className='mb-2 flex items-center gap-3'>
          {icon}
          <span className='font-medium'>{title}</span>
        </div>
        <span className='inline-flex items-center rounded border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-900'>
          {content}
        </span>
      </div>
    </div>
  );
}

export function AboutTab({
  extensionName = 'ReactExt Pro',
  extensionVersion = 'v1.2.4',
  extensionShortDescription = 'Мощное React расширение для улучшения разработки и отладки приложений',
  extensionLongDescription = 'ReactExt Pro — это open source браузерное расширение, разработанное для упрощения и ускорения разработки React приложений. Наша цель — предоставить разработчикам инструменты для более эффективной отладки, анализа производительности и оптимизации React компонентов.',
  githubLink = 'https://github.com/yourname/react-ext-pro',
  storeLinks = [
    {
      name: 'Chrome Web Store',
      url: 'https://chrome.google.com/webstore/detail/your-extension-id',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/64px-Google_Chrome_icon_%28February_2022%29.svg.png',
    },
    {
      name: 'Firefox Add-ons',
      url: 'https://addons.mozilla.org/en-US/firefox/addon/your-addon',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Firefox_logo%2C_2019.svg/64px-Firefox_logo%2C_2019.svg.png',
    },
    {
      name: 'Opera Add-ons',
      url: 'https://addons.opera.com/en/extensions/details/your-extension',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Opera_2015_icon.svg/64px-Opera_2015_icon.svg.png',
    },
    {
      name: 'Microsoft Edge',
      url: 'https://microsoftedge.microsoft.com/addons/detail/your-extension-id',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Microsoft_Edge_logo_%282019%29.svg/64px-Microsoft_Edge_logo_%282019%29.svg.png',
    },
  ],
}: Props) {
  return (
    <div className='mx-auto max-w-4xl px-4 text-justify'>
      <div className='rounded-lg border bg-background text-foreground shadow-lg'>
        <div className='flex flex-col space-y-1.5 border-b p-6 pb-6'>
          <div className='flex flex-col items-start gap-4'>
            <div className='flex w-full items-center justify-between'>
              <div className='flex-1'>
                <h1 className='text-primary text-3xl font-bold'>
                  {extensionName}
                </h1>
              </div>
              <div className='bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center rounded-sm border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'>
                <span>{extensionVersion}</span>
              </div>
            </div>

            <div className='w-full'>
              <p className='text-muted-foreground mb-4 text-lg'>
                <span>{extensionShortDescription}</span>
              </p>

              <div className='mb-4 flex items-center gap-3'>
                <a
                  href={githubLink}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hover:text-primary inline-flex items-center gap-2 text-sm text-foreground transition-colors'
                >
                  <Github className='h-4 w-4' />
                  <span>Исходный код на GitHub</span>
                  <ExternalLink className='h-3 w-3' />
                </a>
              </div>

              <div className='space-y-3'>
                <div className='text-muted-foreground text-sm font-medium'>
                  Скачать расширение:
                </div>
                <div className='flex flex-wrap gap-3'>
                  {storeLinks.map((data) => (
                    <ExtensionStoreLink {...data} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='space-y-8 p-8'>
          <section>
            <h2 className='mb-4 text-2xl font-medium'>О проекте</h2>
            <p className='mb-6 leading-relaxed text-slate-900'>
              {extensionLongDescription}
            </p>

            <div className='grid gap-4 md:grid-cols-2'>
              <InfoCard
                title={'Лицензия'}
                icon={<Scale className='h-5 w-5 text-slate-500' />}
                content={'MIT License'}
              />
              <InfoCard
                title={'Контакты'}
                icon={<Mail className='h-5 w-5 text-slate-500' />}
                content={'contact@reactext.dev'}
              />
            </div>
          </section>

          <section>
            <h2 className='mb-4 text-2xl font-medium'>Основные возможности</h2>
            <div className='grid gap-3'>
              {[
                {
                  title: 'Анализ компонентов',
                  description:
                    'Глубокий анализ структуры и производительности React компонентов',
                },
                {
                  title: 'Отладка состояний',
                  description:
                    'Визуализация и отслеживание изменений состояний в реальном времени',
                },
                {
                  title: 'Профилирование',
                  description:
                    'Детальное профилирование рендеринга для оптимизации производительности',
                },
                {
                  title: 'Интеграция с DevTools',
                  description: 'Seamless интеграция с React Developer Tools',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className='flex items-start gap-3 rounded-lg bg-slate-50/30 p-3'
                >
                  <Code className='mt-0.5 h-5 w-5 text-slate-500' />
                  <div>
                    <div className='mb-1 font-medium'>{feature.title}</div>
                    <div className='text-sm text-slate-600'>
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className='mb-4 text-2xl font-medium'>Статистика проекта</h2>
            <div className='grid gap-4 md:grid-cols-3'>
              {[
                { value: '15k+', label: 'Активных пользователей' },
                { value: '250+', label: 'GitHub звёзд' },
                { value: '12', label: 'Участников' },
              ].map((stat, index) => (
                <div
                  key={index}
                  className='rounded-lg border border-slate-200 bg-slate-50/50 text-center shadow-sm'
                >
                  <div className='p-4'>
                    <div className='mb-1 text-2xl font-bold text-black'>
                      {stat.value}
                    </div>
                    <div className='text-sm text-slate-600'>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Support Section */}
          <section className='border-t border-slate-200 pt-8'>
            <div className='mb-6 text-center'>
              <div className='mb-2 flex items-center justify-center gap-2'>
                <Heart className='h-6 w-6 text-red-500' />
                <h2 className='text-2xl font-medium'>Поддержать проект</h2>
              </div>
              <p className='mx-auto max-w-2xl text-slate-600'>
                Ваша поддержка помогает нам продолжать разработку и улучшение
                расширения. Мы благодарны за любую помощь в развитии open source
                сообщества!
              </p>
            </div>

            <div className='mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {[
                {
                  icon: <Coffee className='mx-auto h-8 w-8 text-orange-500' />,
                  title: 'Patreon',
                  subtitle: 'Ежемесячная поддержка',
                  link: 'https://patreon.com/reactextpro',
                },
                {
                  icon: (
                    <DollarSign className='mx-auto h-8 w-8 text-blue-500' />
                  ),
                  title: 'PayPal',
                  subtitle: 'Разовое пожертвование',
                  link: 'https://paypal.me/reactextpro',
                },
                {
                  icon: (
                    <div className='mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white'>
                      XMR
                    </div>
                  ),
                  title: 'Monero',
                  subtitle: 'Криптовалютная поддержка',
                  link: 'monero:86RqzukEyoYLt4Q4wnRJJNL5yDdEMvZ7GYfVJWcUhQc7234567890',
                },
                {
                  icon: <Heart className='mx-auto h-8 w-8 text-red-500' />,
                  title: 'GitHub Sponsors',
                  subtitle: 'Спонсорство через GitHub',
                  link: 'https://github.com/sponsors/yourname',
                },
              ].map((support, index) => (
                <div
                  key={index}
                  className='rounded-lg border border-slate-200 bg-slate-50/50 shadow-sm transition-colors hover:bg-slate-50/80'
                >
                  <div className='p-4 text-center'>
                    <div className='mb-3'>{support.icon}</div>
                    <div className='mb-2 font-medium'>{support.title}</div>
                    <div className='mb-3 text-sm text-slate-600'>
                      {support.subtitle}
                    </div>
                    <a
                      href={support.link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 text-sm text-blue-600 transition-colors hover:text-blue-500'
                    >
                      <span>Поддержать</span>
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className='rounded-lg border border-blue-200 bg-blue-50/50 shadow-sm'>
              <div className='p-6 text-center'>
                <h3 className='mb-2 text-lg font-medium'>
                  Спасибо нашим спонсорам!
                </h3>
                <p className='text-slate-600'>
                  Благодаря вашей поддержке мы можем продолжать развивать проект
                  и делать его лучше для всего сообщества разработчиков.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
