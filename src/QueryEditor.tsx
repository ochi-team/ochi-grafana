import React, { ChangeEvent, useMemo, useState } from 'react';

import { QueryEditorProps, TimeRange } from '@grafana/data';
import { Button, IconButton, InlineField, InlineFieldRow, Input, RadioButtonGroup, TextArea } from '@grafana/ui';

import { DataSource } from './datasource';
import {
  OchiDataSourceOptions,
  OchiFilter,
  OchiFilterGroup,
  OchiFilterOp,
  OchiQuery,
  defaultQuery,
} from './types';

type Props = QueryEditorProps<DataSource, OchiQuery, OchiDataSourceOptions>;

type LogField = {
  key: string;
  value: string;
};

const opOptions = [
  { label: 'Include', value: '=' as const },
  { label: 'Exclude', value: '!=' as const },
];

function compactFilters(filters?: OchiFilter[]): OchiFilter[] {
  return (filters ?? [])
    .map((filter) => ({
      key: filter.key.trim(),
      op: filter.op,
      value: filter.value.trim(),
    }))
    .filter((filter) => filter.key && filter.value);
}

function queryValue(value: string): string {
  return /^[A-Za-z0-9_.:/-]+$/.test(value) ? value : JSON.stringify(value);
}

function filterExpression(filters?: OchiFilter[]): string {
  return compactFilters(filters)
    .map((filter) => `${filter.key}${filter.op}${queryValue(filter.value)}`)
    .join(' AND ');
}

function buildQuery(query: OchiQuery): string {
  const tags = filterExpression(query.tagFilters);
  const fields = filterExpression(query.fieldFilters);

  return [tags ? `{${tags}}` : '', fields ? `(${fields})` : ''].filter(Boolean).join(' ');
}

function queryWithBuiltString(query: OchiQuery): OchiQuery {
  return {
    ...query,
    query: buildQuery(query),
  };
}

function withTimeRange(query: string, range?: TimeRange): string {
  const payload = query.trim();
  if (!payload || payload.startsWith('[') || !range) {
    return payload;
  }

  return `[${range.from.toISOString()},${range.to.toISOString()}] ${payload}`;
}

function parseLogLine(line: string): LogField[] {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
        .map(([key, value]) => ({ key, value: String(value) }));
    }
  } catch {
    // Fall back to key=value parsing.
  }

  const fields: LogField[] = [];
  const matcher = /([A-Za-z_][\w.-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(trimmed))) {
    fields.push({ key: match[1], value: match[2] ?? match[3] ?? match[4] ?? '' });
  }

  return fields;
}

function recentLogLines(data?: Props['data']): string[] {
  const lines: string[] = [];
  for (const frame of data?.series ?? []) {
    const body = frame.fields.find((field) => field.name === 'body');
    if (!body) {
      continue;
    }

    for (const value of body.values) {
      if (typeof value === 'string') {
        lines.push(value);
      }
    }
  }

  return lines.slice(0, 8);
}

export function QueryEditor({ query, onChange, onRunQuery, data, range }: Props) {
  const q: OchiQuery = {
    ...defaultQuery,
    ...query,
    tagFilters: query.tagFilters ?? defaultQuery.tagFilters ?? [],
    fieldFilters: query.fieldFilters ?? defaultQuery.fieldFilters ?? [],
  } as OchiQuery;
  const [logLine, setLogLine] = useState('');
  const logFields = useMemo(() => parseLogLine(logLine), [logLine]);
  const resultLogLines = useMemo(() => recentLogLines(data), [data]);
  const effectiveQuery = useMemo(() => withTimeRange(q.query, range), [q.query, range]);

  const updateQuery = (next: OchiQuery) => {
    onChange(queryWithBuiltString(next));
    onRunQuery();
  };

  const onRawQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...q, query: event.target.value });
    onRunQuery();
  };

  const updateFilter = (group: OchiFilterGroup, index: number, patch: Partial<OchiFilter>) => {
    const key = group === 'tag' ? 'tagFilters' : 'fieldFilters';
    const filters = [...(q[key] ?? [])];
    filters[index] = { ...filters[index], ...patch };
    updateQuery({ ...q, [key]: filters });
  };

  const addFilter = (group: OchiFilterGroup, filter: OchiFilter = { key: '', op: '=', value: '' }) => {
    const key = group === 'tag' ? 'tagFilters' : 'fieldFilters';
    updateQuery({ ...q, [key]: [...(q[key] ?? []), filter] });
  };

  const removeFilter = (group: OchiFilterGroup, index: number) => {
    const key = group === 'tag' ? 'tagFilters' : 'fieldFilters';
    updateQuery({ ...q, [key]: (q[key] ?? []).filter((_, filterIndex) => filterIndex !== index) });
  };

  const renderFilters = (group: OchiFilterGroup, filters: OchiFilter[]) => (
    <>
      {filters.map((filter, index) => (
        <InlineFieldRow key={`${group}-${index}`}>
          <InlineField label="Key" labelWidth={10}>
            <Input value={filter.key} width={22} onChange={(event) => updateFilter(group, index, { key: event.currentTarget.value })} />
          </InlineField>
          <InlineField label="Mode" labelWidth={10}>
            <RadioButtonGroup<OchiFilterOp>
              options={opOptions}
              value={filter.op}
              onChange={(op) => updateFilter(group, index, { op })}
            />
          </InlineField>
          <InlineField label="Value" labelWidth={10}>
            <Input value={filter.value} width={30} onChange={(event) => updateFilter(group, index, { value: event.currentTarget.value })} />
          </InlineField>
          <IconButton name="trash-alt" tooltip="Remove filter" onClick={() => removeFilter(group, index)} />
        </InlineFieldRow>
      ))}
      <Button size="sm" icon="plus" variant="secondary" fill="outline" onClick={() => addFilter(group)}>
        Add {group} filter
      </Button>
    </>
  );

  return (
    <>
      <h6>Tags {'{}'}</h6>
      {renderFilters('tag', q.tagFilters ?? [])}

      <h6>Fields ()</h6>
      {renderFilters('field', q.fieldFilters ?? [])}

      {resultLogLines.length > 0 && <h6>Recent logs</h6>}
      {resultLogLines.map((line, index) => (
        <InlineFieldRow key={`${index}-${line}`}>
          <Button
            size="sm"
            variant="secondary"
            fill="outline"
            onClick={() => setLogLine(line)}
            style={{ maxWidth: 720, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {line}
          </Button>
        </InlineFieldRow>
      ))}

      <InlineField label="Log line" labelWidth={14} grow>
        <TextArea
          value={logLine}
          rows={3}
          placeholder='{"job":"local","level":"error","message":"timeout"}'
          onChange={(event) => setLogLine(event.currentTarget.value)}
        />
      </InlineField>
      {logFields.map((field) => (
        <InlineFieldRow key={`${field.key}-${field.value}`}>
          <InlineField label={field.key} labelWidth={14}>
            <Input value={field.value} width={36} readOnly />
          </InlineField>
          <Button size="sm" icon="plus" variant="secondary" fill="outline" onClick={() => addFilter('tag', { ...field, op: '=' })}>
            Tag include
          </Button>
          <Button size="sm" icon="minus" variant="secondary" fill="outline" onClick={() => addFilter('tag', { ...field, op: '!=' })}>
            Tag exclude
          </Button>
          <Button size="sm" icon="plus" variant="secondary" fill="outline" onClick={() => addFilter('field', { ...field, op: '=' })}>
            Field include
          </Button>
          <Button size="sm" icon="minus" variant="secondary" fill="outline" onClick={() => addFilter('field', { ...field, op: '!=' })}>
            Field exclude
          </Button>
        </InlineFieldRow>
      ))}

      <InlineField label="Filters" labelWidth={14} tooltip="Tag and field filter expression stored in the query model" grow>
        <Input value={q.query} onChange={onRawQueryChange} width={96} placeholder="{env=prod AND service=web} (status=200)" />
      </InlineField>

      <InlineField label="Query" labelWidth={14} tooltip="Effective Ochi query sent with Grafana time range" grow>
        <Input value={effectiveQuery} width={112} readOnly />
      </InlineField>
    </>
  );
}
