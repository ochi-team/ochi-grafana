import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type OchiFilterGroup = 'tag' | 'field';
export type OchiFilterOp = '=' | '!=';

export interface OchiFilter {
  key: string;
  op: OchiFilterOp;
  value: string;
}

export interface OchiQuery extends DataQuery {
  query: string;
  tagFilters?: OchiFilter[];
  fieldFilters?: OchiFilter[];
}

export const defaultQuery: Partial<OchiQuery> = {
  query: '{env=prod}',
  tagFilters: [{ key: 'env', op: '=', value: 'prod' }],
  fieldFilters: [],
};

export interface OchiDataSourceOptions extends DataSourceJsonData {
  tenantId?: string;
}

export interface OchiApiLine {
  _time?: string;
  _msg?: string;
  [key: string]: string | undefined;
}

export interface OchiQueryResponse {
  lines: OchiApiLine[];
}
