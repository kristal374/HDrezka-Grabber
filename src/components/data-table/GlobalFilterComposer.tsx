import { DefaultFilterValueInput } from '@/components/data-table/Filters';
import {
  filterFunctions,
  type FilterCondition,
  type FilterGroup,
} from '@/components/data-table/globalFilter';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { SplitElement } from '@/components/ui/SplitElement';
import { cn } from '@/lib/utils';
import type { Table as TanstackTable } from '@tanstack/react-table';
import {
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  FunnelIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type MutateFilter = {
  (
    mutator: (
      getItem: {
        (index: string, type?: 'group'): FilterGroup;
        (index: string, type: 'condition'): FilterCondition;
      },
      removeItem: (index: string) => void,
    ) => void,
  ): void;
};

const GlobalFilterContext = createContext<{
  table: TanstackTable<any>;
  defaultFilterGroup: FilterGroup;
  mutateFilter: MutateFilter;
} | null>(null);

interface GlobalFilterProps<TData extends Record<string, any>> {
  table: TanstackTable<TData>;
}

export function GlobalFilter<TData extends Record<string, any>>({
  table,
}: GlobalFilterProps<TData>) {
  const [filter, setFilter] = useState<FilterGroup | null>(null);
  const mutateFilter: MutateFilter = (mutator) => {
    setFilter((prev) => {
      const copy: FilterGroup = JSON.parse(JSON.stringify(prev));
      function getItem(index: string, type?: 'group'): FilterGroup;
      function getItem(index: string, type: 'condition'): FilterCondition;
      function getItem(index: string, type: 'group' | 'condition' = 'group') {
        if (index === 'root') return copy;
        const indexes = index.split('-').map((i) => Number(i));
        let place: FilterGroup = copy;
        for (const i of indexes) {
          place = place.children[i] as FilterGroup;
        }
        return type === 'group' ? place : (place as unknown as FilterCondition);
      }
      function removeItem(index: string) {
        if (index === 'root') return;
        const indexes = index.split('-').map((i) => Number(i));
        const toDelete = indexes.pop()!;
        let place: FilterGroup = copy;
        for (const i of indexes) {
          place = place.children[i] as FilterGroup;
        }
        place.children.splice(toDelete, 1);
      }
      mutator(getItem, removeItem);
      return copy;
    });
  };
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultFilterGroup: FilterGroup = {
    type: 'group',
    operator: 'AND',
    children: [
      {
        type: 'condition',
        columnId: table.getAllColumns()[0].id,
        filterFn: 'equals',
        filterValue: '',
      },
    ],
  };

  const [haveGlobalFilter, setHaveGlobalFilter] = useState(false);
  useEffect(() => {
    const value = table.getState().globalFilter !== undefined;
    if (value !== haveGlobalFilter) setHaveGlobalFilter(value);
  });

  const [portalHost, setPortalHost] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setPortalHost(document.querySelector('#global-filter'));
  }, []);
  if (!portalHost) return null;

  return createPortal(
    <div className='relative'>
      <div
        className={cn(
          'max-h-[min(70vh,35rem)] w-full overflow-auto p-2',
          'border-input bg-settings-border-primary scrollbar-transparent border-t',
          !isExpanded && 'h-14 overflow-hidden',
        )}
      >
        {!filter ? (
          <div className='flex items-center p-1'>
            <Button
              className='w-fit border-[0.125rem] border-transparent'
              onClick={() => {
                setFilter(defaultFilterGroup);
                setIsExpanded(true);
              }}
            >
              <FunnelIcon className='size-4' />
              {browser.i18n.getMessage('logger_globalFilter_create')}
            </Button>
          </div>
        ) : (
          <GlobalFilterContext
            value={{ table, defaultFilterGroup, mutateFilter }}
          >
            {!isExpanded && (
              <div
                className='bg-settings-border-primary/50 absolute inset-0 z-1'
                onClick={() => setIsExpanded(true)}
              />
            )}
            <FilterGroupRender group={filter} index='root' />
          </GlobalFilterContext>
        )}
      </div>
      {!!filter && (
        <div className='absolute right-0 bottom-0 z-1 flex items-center gap-2 p-3'>
          {haveGlobalFilter && (
            <Button
              variant='dangerous'
              onClick={() => table.resetGlobalFilter()}
            >
              <XIcon className='size-4' />
              {browser.i18n.getMessage('logger_globalFilter_removeFilter')}
            </Button>
          )}
          <Button onClick={() => table.setGlobalFilter(filter)}>
            <FunnelIcon className='size-4' />
            {browser.i18n.getMessage('logger_globalFilter_applyFilter')}
          </Button>
          <Button
            variant='secondary'
            size='square'
            className='border-input-active ml-1 border-[0.125rem]'
            onClick={() => setIsExpanded((prev) => !prev)}
            title={
              !isExpanded
                ? browser.i18n.getMessage('logger_globalFilter_expand')
                : browser.i18n.getMessage('logger_globalFilter_collapse')
            }
          >
            <ChevronDownIcon
              className={cn(
                'size-4 transition-transform',
                !isExpanded && 'rotate-180',
              )}
            />
          </Button>
        </div>
      )}
    </div>,
    portalHost,
  );
}

function FilterGroupOneToManyElement({ group }: { group: FilterGroup }) {
  const multiplier =
    group.children.length +
    group.children.reduce((total, item) => {
      return item.type === 'group' ? total + item.children.length : total;
    }, 0);
  return (
    <div
      className='*:bg-input-active relative w-4 *:absolute'
      style={{
        height: `calc(var(--spacing) * ${(multiplier - 1) * 10.75})`,
      }}
    >
      {group.children.length === 1 ? (
        <div className='top-1/2 h-0.5 w-full -translate-y-1/2' />
      ) : (
        <>
          <div className='top-1/2 h-0.5 w-1/2' />
          <div className='left-1/2 h-full w-0.5' />
          <div className='top-0 left-1/2 h-0.5 w-1/2' />
          <div className='bottom-0 left-1/2 h-0.5 w-1/2' />
        </>
      )}
    </div>
  );
}

function AddFilterNodeButton({ index }: { index: string }) {
  const context = use(GlobalFilterContext)!;
  const { defaultFilterGroup, mutateFilter } = context;
  const data: DropdownItem[] = [
    {
      value: 'condition',
      label: browser.i18n.getMessage('logger_globalFilter_condition'),
    },
    {
      value: 'group',
      label: browser.i18n.getMessage('logger_globalFilter_group'),
    },
  ];
  const [value, setValue] = useState(data[0].value);
  const label = data.find((item) => item.value === value)!.label!;
  return (
    <SplitElement>
      <Button
        variant='secondary'
        onClick={() => {
          mutateFilter((getItem) => {
            getItem(index).children.push(
              value === 'group'
                ? defaultFilterGroup
                : defaultFilterGroup.children[0],
            );
          });
        }}
      >
        <PlusIcon className='size-4' />
        {browser.i18n.getMessage('logger_globalFilter_addNode')}{' '}
        {label.toLowerCase()}
      </Button>
      <div className='bg-settings-border-primary h-full w-px' />
      <Dropdown
        multiple={false}
        data={data}
        value={value}
        onValueChange={(value) => setValue(value)}
      >
        <Button variant='secondary' className='px-2'>
          <ChevronDownIcon className='size-4' />
        </Button>
      </Dropdown>
    </SplitElement>
  );
}

function FilterGroupRender({
  group,
  index,
  isOnly,
}: {
  group: FilterGroup;
  index: string;
  isOnly?: boolean;
}) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const context = use(GlobalFilterContext)!;
  const { mutateFilter } = context;
  const isFirst = index === 'root';

  return (
    <div className='flex flex-col'>
      <div
        className={cn(
          'flex items-center rounded-lg px-1',
          isFirst && '*:shrink-0',
          isHighlighted && 'bg-input-active/70',
        )}
      >
        <Combobox
          width={'4.25rem'}
          data={[
            { value: 'AND', label: 'AND' },
            { value: 'OR', label: 'OR' },
          ]}
          value={group.operator}
          onValueChange={(operator) => {
            mutateFilter((getItem) => {
              getItem(index).operator = operator as FilterGroup['operator'];
            });
          }}
          showChevron
        />
        <FilterGroupOneToManyElement group={group} />
        <div className='flex flex-col'>
          {group.children.map((condition, i, arr) => {
            const childIndex = isFirst ? String(i) : `${index}-${i}`;
            return condition.type === 'group' ? (
              <FilterGroupRender
                key={i}
                group={condition}
                index={childIndex}
                isOnly={arr.length === 1}
              />
            ) : (
              <FilterConditionRender
                key={i}
                condition={condition}
                index={childIndex}
                isOnly={arr.length === 1}
              />
            );
          })}
        </div>
      </div>
      <div className='ml-[5.5rem] flex gap-2 py-1'>
        <AddFilterNodeButton index={index} />
        {!(isFirst || isOnly) && (
          <Button
            variant='dangerous'
            onClick={() => {
              mutateFilter((_getItem, removeItem) => removeItem(index));
            }}
            onMouseEnter={() => setIsHighlighted(true)}
            onMouseLeave={() => setIsHighlighted(false)}
            onFocus={() => setIsHighlighted(true)}
            onBlur={() => setIsHighlighted(false)}
          >
            <Trash2Icon className='size-4' />
            {browser.i18n.getMessage('logger_globalFilter_deleteGroup')}
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterConditionRender({
  condition,
  index,
  isOnly,
}: {
  condition: FilterCondition;
  index: string;
  isOnly?: boolean;
}) {
  const context = use(GlobalFilterContext)!;
  const { table, mutateFilter } = context;

  const [column, setColumn] = useState(() =>
    table.getColumn(condition.columnId as string),
  );
  useEffect(() => {
    setColumn(table.getColumn(condition.columnId as string));
  }, [condition.columnId]);

  const FilterValueInput =
    column?.columnDef.meta?.GlobalFilterValueInput ?? DefaultFilterValueInput;

  return (
    <div className='flex items-center gap-2 py-1'>
      <Combobox
        data={table.getAllColumns().map((column) => {
          return {
            value: column.id,
            label: column.columnDef.meta?.headerName ?? column.id,
          };
        })}
        value={condition.columnId as string}
        onValueChange={(columnId) => {
          mutateFilter((getItem) => {
            getItem(index, 'condition').columnId = columnId;
          });
        }}
        showChevron
        disabled={condition.skip}
      />
      <Combobox
        width={'11rem'}
        data={Object.keys(filterFunctions).map((filterFn) => {
          return { value: filterFn, label: filterFn };
        })}
        value={condition.filterFn}
        onValueChange={(filterFn) => {
          mutateFilter((getItem) => {
            getItem(index, 'condition').filterFn =
              filterFn as FilterCondition['filterFn'];
          });
        }}
        showChevron
        disabled={condition.skip}
      />
      {!!FilterValueInput && !!column && (
        <FilterValueInput
          key={condition.columnId}
          column={column}
          value={condition.filterValue}
          onValueChange={(filterValue) => {
            mutateFilter((getItem) => {
              getItem(index, 'condition').filterValue = filterValue;
            });
          }}
          disabled={condition.skip}
        />
      )}
      <Button
        variant='secondary'
        size='square'
        onClick={() => {
          mutateFilter((getItem) => {
            const item = getItem(index, 'condition');
            item.skip = !item.skip;
          });
        }}
        title={
          condition.skip
            ? browser.i18n.getMessage('logger_globalFilter_enableCondition')
            : browser.i18n.getMessage('logger_globalFilter_disableCondition')
        }
      >
        {condition.skip ? (
          <EyeOffIcon className='size-4' />
        ) : (
          <EyeIcon className='size-4' />
        )}
      </Button>
      {!isOnly && (
        <Button
          variant='dangerous'
          size='square'
          onClick={() => {
            mutateFilter((_getItem, removeItem) => removeItem(index));
          }}
          title={browser.i18n.getMessage('logger_globalFilter_deleteCondition')}
        >
          <Trash2Icon className='size-4' />
        </Button>
      )}
    </div>
  );
}
