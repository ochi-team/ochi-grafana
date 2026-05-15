import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface OchiQuery extends DataQuery {
  query: string;
}

export const defaultQuery: Partial<OchiQuery> = {
  query: '[-15m,now] {env=prod}',
};

export interface OchiDataSourceOptions extends DataSourceJsonData {}

export interface OchiApiField {
  key: string;
  value: string;
}

export interface OchiApiLine {
  timestampNs: number;
  fields: OchiApiField[];
}
