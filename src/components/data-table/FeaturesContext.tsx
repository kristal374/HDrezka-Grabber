import { createContext, use } from 'react';

interface DataTableFeatures {
  searchBy?: string;
  allowRegex?: boolean;
}

const DataTableFeaturesContext = createContext<DataTableFeatures>({});

export function DataTableFeatures({
  children,
  ...props
}: React.PropsWithChildren<DataTableFeatures>) {
  return (
    <DataTableFeaturesContext value={props}>
      {children}
    </DataTableFeaturesContext>
  );
}

export function useDataTableFeatures() {
  const value = use(DataTableFeaturesContext);
  if (!value) {
    throw new Error(
      `Any of DataTable compoennts must be wrapped in a <DataTableFeatures /> provider`,
    );
  }
  return value;
}
