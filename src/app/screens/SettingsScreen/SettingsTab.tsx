import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';

type PanelProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function Panel({ children, className, style }: PanelProps) {
  return (
    <div
      className={cn(
        'mx-auto mb-4 max-w-[48rem] border-2 p-8 text-justify',
        className,
      )}
      style={{
        borderColor: 'var(--settings-panel-border)',
        backgroundColor: 'var(--settings-panel)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--panel-shadow)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SettingsTab() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const oldTheme = document.documentElement.classList.contains('light');
    if (oldTheme) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  return (
    <div className='text-base'>
      <Panel>
        <h2 className='text-xl font-semibold'>Download list panel</h2>
        <button
          className='mt-2'
          onClick={() => {
            setTheme(theme === 'dark' ? 'light' : 'dark');
          }}
        >
          Change theme to {theme === 'dark' ? 'light' : 'dark'}
        </button>
        <p>
          Here you can do the normal download management: start items
          individually or in groups, pause, resume, cancel, remove items etc.
        </p>
      </Panel>
      <Panel>
        <h2 className='text-xl font-semibold'>Download list panel</h2>
        <p>
          Here you can do the normal download management: start items
          individually or in groups, pause, resume, cancel, remove items etc.
        </p>
      </Panel>
      <Panel>
        <></>
      </Panel>
    </div>
  );
}
