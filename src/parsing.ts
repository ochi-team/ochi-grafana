import { OchiApiField } from './types';

export function parsePairs(input: string): OchiApiField[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const divider = part.indexOf('=');
      if (divider < 1 || divider === part.length - 1) {
        throw new Error(`Invalid pair "${part}". Use key=value format.`);
      }

      const key = part.slice(0, divider).trim();
      const value = part.slice(divider + 1).trim();
      if (!key || !value) {
        throw new Error(`Invalid pair "${part}". Use key=value format.`);
      }

      return { key, value };
    });
}
