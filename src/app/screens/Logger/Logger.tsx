import { ObjectInspector } from 'react-inspector';

export function MyComponent({ data }: { data: object }) {
  return <ObjectInspector theme='chromeDark' data={data} />;
}
