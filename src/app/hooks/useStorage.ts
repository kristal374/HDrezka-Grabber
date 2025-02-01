import { useState } from 'react';
import { SetState } from '../../lib/types';
import { useInitData } from '../providers/InitialDataProvider';

export function useStorage<T>(
  itemKey: string,
  defaultValue: T,
): [T, SetState<T>];
export function useStorage<T = undefined>(
  itemKey: string,
  defaultValue: T,
): [T, SetState<T>];

export function useStorage<T>(itemKey: string, defaultValue: T) {
  const { tabID, sessionStorage } = useInitData();
  const key = `t-${tabID}`;
  const [state, setState] = useState(
    sessionStorage[itemKey] === undefined
      ? defaultValue
      : sessionStorage[itemKey],
  );
  const setProxy = (dispatch: T | ((prevState: T) => T)) => {
    setState((prev: T) => {
      const value =
        typeof dispatch === 'function'
          ? (dispatch as (prevState: T) => T)(prev)
          : dispatch;
      sessionStorage[itemKey] = value;
      browser.storage.session.set({ [key]: sessionStorage });
      return value;
    });
  };
  return [state, setProxy] as const;
}
