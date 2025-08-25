import { useState } from 'react';
import { SimpleTabs } from '../../components/SimpleTabs';
import { AboutTab } from './SettingsScreen/AboutTab';
import { ChangeLogTab } from './SettingsScreen/ChangeLogTab';
import { FAQTab } from './SettingsScreen/FAQTab';
import { SettingsTab } from './SettingsScreen/SettingsTab';

const TAB_LIST = {
  settings: {
    label: 'Настройки',
    icon: undefined,
    content: <SettingsTab />,
  },
  faq: {
    label: 'FAQ',
    icon: undefined,
    content: <FAQTab />,
  },
  changelog: {
    label: 'История изменений',
    icon: undefined,
    content: <ChangeLogTab />,
  },
  about: {
    label: 'О расширении',
    icon: undefined,
    content: <AboutTab />,
  },
} as const;

export function SettingsScreen() {
  const [active, setActive] = useState<keyof typeof TAB_LIST>('settings');

  return (
    <div className='mt-6 flex w-full flex-col items-center'>
      <SimpleTabs
        tabsList={Object.entries(TAB_LIST).map(([key, value]) => ({
          id: key as keyof typeof TAB_LIST,
          label: value.label,
          icon: value.icon,
        }))}
        activeTabId={active}
        onValueChange={setActive}
      />

      <div className='my-10 w-full text-center'>
        {TAB_LIST[active]!.content}
      </div>
    </div>
  );
}
