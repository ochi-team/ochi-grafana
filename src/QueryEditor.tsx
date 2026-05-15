import React, { ChangeEvent } from 'react';

import { InlineField, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';

import { DataSource } from './datasource';
import { OchiDataSourceOptions, OchiQuery, defaultQuery } from './types';

type Props = QueryEditorProps<DataSource, OchiQuery, OchiDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const q = { ...defaultQuery, ...query };

  const onQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...q, query: event.target.value });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Query" labelWidth={16} tooltip="Ochi query language expression">
        <Input
          value={q.query}
          onChange={onQueryChange}
          width={64}
          placeholder="[-15m,now] {env=prod AND service=web} status=200"
        />
      </InlineField>
    </>
  );
}
