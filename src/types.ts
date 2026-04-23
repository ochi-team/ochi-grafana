import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface OchiQuery extends DataQuery {
  tags: string;
  fields: string;
}

export const defaultQuery: Partial<OchiQuery> = {
  tags: '',
  fields: '',
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
