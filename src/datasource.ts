import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataFrameType,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { firstValueFrom, from, map, mergeMap, toArray } from 'rxjs';

import { OchiApiLine, OchiDataSourceOptions, OchiQuery, OchiQueryResponse, defaultQuery } from './types';

const timeKey = '_time';
const timestampFieldName = 'timestamp';
const bodyFieldName = 'body';

function normalizeQuery(query: OchiQuery): OchiQuery {
  return {
    ...defaultQuery,
    ...query,
  };
}

function stringKeys(line: OchiApiLine): string[] {
  return Object.entries(line)
    .filter(([, value]) => typeof value === 'string')
    .map(([key]) => key);
}

function lineFieldNames(lines: OchiApiLine[]): string[] {
  return [...new Set(lines.flatMap(stringKeys))]
    .filter((key) => key !== timeKey && key !== timestampFieldName && key !== bodyFieldName)
    .sort((a, b) => a.localeCompare(b));
}

function lineTime(line: OchiApiLine): number {
  const time = line[timeKey];
  if (!time) {
    return 0;
  }

  const millis = Date.parse(time);
  return Number.isFinite(millis) ? millis : 0;
}

function lineMessage(line: OchiApiLine): string {
  return JSON.stringify(line);
}

function tenantHeaders(tenantId: string): Record<string, string> {
  return tenantId ? { 'X-Scope-OrgID': tenantId } : {};
}

function queryWithTimeRange(query: string, options: DataQueryRequest<OchiQuery>): string {
  const payload = query.trim();
  if (!payload || payload.startsWith('[')) {
    return payload;
  }

  return `[${options.range.from.toISOString()},${options.range.to.toISOString()}] ${payload}`;
}

export class DataSource extends DataSourceApi<OchiQuery, OchiDataSourceOptions> {
  private readonly baseUrl: string;
  private readonly tenantId: string;

  constructor(instanceSettings: DataSourceInstanceSettings<OchiDataSourceOptions>) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url ?? '';
    this.tenantId = instanceSettings.jsonData.tenantId?.trim() ?? '';
  }

  async query(options: DataQueryRequest<OchiQuery>): Promise<DataQueryResponse> {
    const data = await firstValueFrom(
      from(options.targets).pipe(
        mergeMap(async (target): Promise<DataFrame | null> => {
          const query = normalizeQuery(target);
          if (target.hide) {
            return null;
          }

          const payload = queryWithTimeRange(query.query, options);
          if (!payload) {
            return null;
          }

          const response = await firstValueFrom(
            getBackendSrv().fetch<OchiQueryResponse>({
              method: 'POST',
              url: `${this.baseUrl}/query`,
              data: payload,
              headers: {
                'content-type': 'application/loql',
                ...tenantHeaders(this.tenantId),
              },
            })
          );

          const lines = response.data.lines ?? [];
          const fields = lineFieldNames(lines);
          const frame = new MutableDataFrame({
            refId: target.refId,
            name: target.refId,
            fields: [
              { name: timestampFieldName, type: FieldType.time },
              { name: bodyFieldName, type: FieldType.string },
              ...fields.map((name) => ({ name, type: FieldType.string })),
            ],
            meta: {
              type: DataFrameType.LogLines,
              preferredVisualisationType: 'logs',
              custom: {
                app: options.app ?? CoreApp.Unknown,
              },
            },
          });

          for (const line of lines) {
            frame.add({
              [timestampFieldName]: lineTime(line),
              [bodyFieldName]: lineMessage(line),
              ...Object.fromEntries(fields.map((name) => [name, line[name] ?? ''])),
            });
          }

          return frame;
        }),
        toArray(),
        map((frames) => ({ data: frames.filter((frame): frame is DataFrame => frame !== null) }))
      )
    );

    return data;
  }

  async testDatasource() {
    try {
      const resp = await firstValueFrom(
        getBackendSrv().fetch({
          method: 'GET',
          url: `${this.baseUrl}/ingest/loki/ready`,
          headers: tenantHeaders(this.tenantId),
        })
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
