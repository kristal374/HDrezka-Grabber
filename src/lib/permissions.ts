import type { Permissions } from 'webextension-polyfill';
type AnyPermissions = Permissions.AnyPermissions;

export function hasPermissionsToAllSites(permission: AnyPermissions) {
  return permission.origins?.includes('*://*/*') ?? false;
}

function patternToRegExpSource(pattern: string): string {
  return (
    '^' +
    pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*') +
    '$'
  );
}

export function patternsToRegExp(...patterns: string[]) {
  if (patterns.length === 0) {
    return /$./;
  }
  return new RegExp(patterns.map(patternToRegExpSource).join('|'));
}
