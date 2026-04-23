import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
  dateTime,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { firstValueFrom, from, map, mergeMap, toArray } from 'rxjs';

import { parsePairs } from './parsing';
import { OchiApiField, OchiApiLine, OchiDataSourceOptions, OchiQuery, defaultQuery } from './types';

interface OchiQueryPayload {
  start: number;
  end: number;
  tags: OchiApiField[];
  fields: OchiApiField[];
}

function nsToMs(ns: number): number {
  return Math.floor(ns / 1_000_000);
}

function fieldValue(lineFields: OchiApiField[], key: string): string {
  const found = lineFields.find((item) => item.key === key);
  return found?.value ?? '';
}

function messageValue(lineFields: OchiApiField[]): string {
  const empty = lineFields.find((item) => item.key === '');
  return empty?.value ?? '';
}

function normalizeQuery(query: OchiQuery): OchiQuery {
  return {
    ...defaultQuery,
    ...query,
  };
}

export class DataSource extends DataSourceApi<OchiQuery, OchiDataSourceOptions> {
  private readonly baseUrl: string;

  constructor(instanceSettings: DataSourceInstanceSettings<OchiDataSourceOptions>) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url ?? '';
  }

  async query(options: DataQueryRequest<OchiQuery>): Promise<DataQueryResponse> {
    const data = await firstValueFrom(
      from(options.targets).pipe(
        mergeMap(async (target): Promise<DataFrame | null> => {
          const query = normalizeQuery(target);
          if (target.hide) {
            return null;
          }

          const tags = parsePairs(query.tags);
          const fields = parsePairs(query.fields);

          const payload: OchiQueryPayload = {
            start: options.range.from.valueOf() * 1_000_000,
            end: options.range.to.valueOf() * 1_000_000,
            tags,
            fields,
          };

          const lines = await firstValueFrom(
            getBackendSrv().fetch<OchiApiLine[]>({
              method: 'POST',
              url: `${this.baseUrl}/query`,
              data: payload,
            }),
          );

          const rows = lines.data;
          const displayFieldNames = [...new Set([...tags.map((f) => f.key), ...fields.map((f) => f.key)])];

          const frame = new MutableDataFrame({
            refId: target.refId,
            name: target.refId,
            fields: [
              { name: 'Time', type: FieldType.time },
              { name: 'Line', type: FieldType.string },
              ...displayFieldNames.map((key) => ({ name: key, type: FieldType.string })),
            ],
            meta: {
              preferredVisualisationType: 'logs',
              custom: {
                app: options.app ?? CoreApp.Unknown,
              },
            },
          });

          for (const row of rows) {
            frame.add({
              Time: dateTime(nsToMs(row.timestampNs)).toDate(),
              Line: messageValue(row.fields),
              ...Object.fromEntries(displayFieldNames.map((key) => [key, fieldValue(row.fields, key)])),
            });
          }

          return frame;
        }),
        toArray(),
        map((frames) => ({ data: frames.filter((frame): frame is DataFrame => frame !== null) })),
      ),
    );

    return data;
  }

  async testDatasource() {
    try {
      const resp = await firstValueFrom(
        getBackendSrv().fetch({
          method: 'GET',
          url: `${this.baseUrl}/insert/loki/ready`,
        }),
      );

      if (resp.status === 200) {
        return {
          status: 'success',
          message: 'Connected to Ochi server',
        };
      }

      return {
        status: 'error',
        message: `Unexpected status: ${resp.status}`,
      };
    } catch (err: unknown) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }
}
