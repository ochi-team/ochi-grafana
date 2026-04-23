import React, { ChangeEvent } from 'react';

import { InlineField, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';

import { DataSource } from './datasource';
import { OchiDataSourceOptions, OchiQuery, defaultQuery } from './types';

type Props = QueryEditorProps<DataSource, OchiQuery, OchiDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const q = { ...defaultQuery, ...query };

  const onTagsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...q, tags: event.target.value });
    onRunQuery();
  };

  const onFieldsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...q, fields: event.target.value });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Tags" labelWidth={16} tooltip="Comma-separated key=value list">
        <Input
          value={q.tags}
          onChange={onTagsChange}
          width={64}
          placeholder="tag1=alpha,tag2=beta"
        />
      </InlineField>

      <InlineField label="Fields" labelWidth={16} tooltip="Comma-separated key=value list">
        <Input
          value={q.fields}
          onChange={onFieldsChange}
          width={64}
          placeholder="field1=x,field2=x"
        />
      </InlineField>
    </>
  );
}
