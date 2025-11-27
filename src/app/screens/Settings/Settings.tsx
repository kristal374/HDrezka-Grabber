import { SimpleTabs } from '@/components/SimpleTabs';
import { SettingsInitialDataContext } from '@/html/settings';
import { useContext, useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AboutTab } from './AboutTab';
import { ChangeLogTab } from './ChangeLogTab';
import { FAQTab } from './FAQTab';
import { SettingsTab } from './SettingsTab/SettingsTab';

const TAB_LIST = {
  settings: {
    label: browser.i18n.getMessage('settings_TabSettings'),
    icon: undefined,
    component: SettingsTab,
  },
  faq: {
    label: browser.i18n.getMessage('settings_TabFAQ'),
    icon: undefined,
    component: FAQTab,
  },
  changelog: {
    label: browser.i18n.getMessage('settings_TabChangelog'),
    icon: undefined,
    component: ChangeLogTab,
  },
  about: {
    label: browser.i18n.getMessage('settings_TabAbout'),
    icon: undefined,
    component: AboutTab,
  },
} as const;

export function Settings() {
  const { settings } = useContext(SettingsInitialDataContext)!;
  const [activeTab, setActiveTab] = useState<keyof typeof TAB_LIST>(() => {
    const hash = window.location.hash.replace('#', '');
    return (hash in TAB_LIST ? hash : 'settings') as keyof typeof TAB_LIST;
  });
  const ActiveComponent = TAB_LIST[activeTab].component;
  document.documentElement.className = settings.darkMode ? 'dark' : 'light';

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  return (
    <>
      <Toaster
        position='bottom-right'
        expand={true}
        richColors
        duration={10_000} // ms
        theme={settings.darkMode ? 'light' : 'dark'}
      />
      <div className='mt-6 flex w-full flex-col items-center'>
        <SimpleTabs
          tabsList={Object.entries(TAB_LIST).map(([key, value]) => ({
            id: key as keyof typeof TAB_LIST,
            label: value.label,
            icon: value.icon,
          }))}
          activeTabId={activeTab}
          onValueChange={setActiveTab}
        />
        <div className='my-10 w-full'>
          <ActiveComponent />
        </div>
      </div>
    </>
  );
}
