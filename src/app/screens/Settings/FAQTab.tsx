import { Panel } from '@/components/Panel';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

const faqData = [
  {
    id: 1,
    question: browser.i18n.getMessage('settings_FaqQuestion_1'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_1'),
  },
  {
    id: 2,
    question: browser.i18n.getMessage('settings_FaqQuestion_2'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_2'),
  },
  {
    id: 3,
    question: browser.i18n.getMessage('settings_FaqQuestion_3'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_3'),
  },
  {
    id: 4,
    question: browser.i18n.getMessage('settings_FaqQuestion_4'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_4'),
  },
  {
    id: 5,
    question: browser.i18n.getMessage('settings_FaqQuestion_5'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_5'),
  },
  {
    id: 6,
    question: browser.i18n.getMessage('settings_FaqQuestion_6'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_6'),
  },
  {
    id: 7,
    question: browser.i18n.getMessage('settings_FaqQuestion_7'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_7'),
  },
  {
    id: 8,
    question: browser.i18n.getMessage('settings_FaqQuestion_8'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_8'),
  },
  {
    id: 9,
    question: browser.i18n.getMessage('settings_FaqQuestion_9'),
    answer: browser.i18n.getMessage('settings_FaqAnswer_9'),
  },
];

type FAQItemProps = {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
};

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className='border-settings-border-secondary border-b last:border-b-0'>
      <button
        className='focus-ring hover:text-settings-text-primary flex w-full items-center justify-between py-4 text-left'
        onClick={onToggle}
      >
        <span className='pr-4 text-lg font-medium'>{question}</span>
        <ChevronDownIcon
          className={cn(
            'text-settings-text-tertiary size-5 flex-shrink-0 transition-transform duration-500',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-500 ease-in-out',
          isOpen ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]',
        )}
      >
        <div className='overflow-hidden'>
          <div className='text-settings-text-tertiary text-justify text-base leading-relaxed'>
            {answer.split('\n').map(
              (paragraph, i) =>
                paragraph.trim() && (
                  <p key={i} className='mb-1 indent-8'>
                    {paragraph}
                  </p>
                ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FAQTab() {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (id: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <Panel>
      {faqData.map((item) => (
        <FAQItem
          key={item.id}
          question={item.question}
          answer={item.answer}
          isOpen={openItems.has(item.id)}
          onToggle={() => toggleItem(item.id)}
        />
      ))}
    </Panel>
  );
}
