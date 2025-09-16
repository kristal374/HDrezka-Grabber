// import { AboutTab } from './SettingsScreen/AboutTab';
// import { ChangeLogTab } from './SettingsScreen/ChangeLogTab';
// import { FAQTab } from './SettingsScreen/FAQTab';
import { SettingsTab } from './SettingsTab/SettingsTab';

// const TAB_LIST = {
//   settings: {
//     label: browser.i18n.getMessage('settings_TabSettings'),
//     icon: undefined,
//     content: <SettingsTab />,
//   },
//   faq: {
//     label: browser.i18n.getMessage('settings_TabFAQ'),
//     icon: undefined,
//     content: <FAQTab />,
//   },
//   changelog: {
//     label: browser.i18n.getMessage('settings_TabChangelog'),
//     icon: undefined,
//     content: <ChangeLogTab />,
//   },
//   about: {
//     label: browser.i18n.getMessage('settings_TabAbout'),
//     icon: undefined,
//     content: <AboutTab />,
//   },
// } as const;

export function SettingsScreen() {
  // const [activeTab, setActiveTab] = useState<keyof typeof TAB_LIST>(() => {
  //   const hash = window.location.hash.replace('#', '');
  //   return (hash in TAB_LIST ? hash : 'settings') as keyof typeof TAB_LIST;
  // });
  //
  // useEffect(() => {
  //   window.location.hash = activeTab;
  // }, [activeTab]);

  return (
    <div className='mt-6 flex w-full flex-col items-center'>
      {/*<SimpleTabs*/}
      {/*  tabsList={Object.entries(TAB_LIST).map(([key, value]) => ({*/}
      {/*    id: key as keyof typeof TAB_LIST,*/}
      {/*    label: value.label,*/}
      {/*    icon: value.icon,*/}
      {/*  }))}*/}
      {/*  activeTabId={activeTab}*/}
      {/*  onValueChange={setActiveTab}*/}
      {/*/>*/}

      <div className='my-10 w-full'>
        {/*{TAB_LIST[activeTab]!.content}*/}
        <SettingsTab />
      </div>
    </div>
  );
}
