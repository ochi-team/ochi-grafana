import React, { ChangeEvent } from 'react';

import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { InlineField, Input } from '@grafana/ui';

import { OchiDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<OchiDataSourceOptions> { }

export function ConfigEditor({ options, onOptionsChange }: Props) {
    const onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        onOptionsChange({
            ...options,
            url: event.target.value,
        });
    };

    return (
        <InlineField
            label="Server URL"
            labelWidth={24}
            tooltip="Base URL for Ochi server, e.g. http://localhost:9014"
            grow
        >
            <Input
                value={options.url ?? ''}
                onChange={onUrlChange}
                width={80}
                placeholder="http://localhost:9014"
            />
        </InlineField>
    );
    // const onTenantChange = (event: ChangeEvent<HTMLInputElement>) => {
    //   onOptionsChange({
    //     ...options,
    //     jsonData: {
    //       ...options.jsonData,
    //       tenantId: event.target.value,
    //     },
    //   });
    // };
    //
    // return (
    //   <>
    //     <InlineField
    //       label="Server URL"
    //       labelWidth={24}
    //       tooltip="Base URL for Ochi server, e.g. http://localhost:9014"
    //       grow
    //     >
    //       <Input value={options.url ?? ''} onChange={onUrlChange} width={80} placeholder="http://localhost:9014" />
    //     </InlineField>
    //     <InlineField label="Tenant ID" labelWidth={24} tooltip="Value sent as X-Scope-OrgID">
    //       <Input value={options.jsonData.tenantId ?? ''} onChange={onTenantChange} width={24} placeholder="optional" />
    //     </InlineField>
    //   </>
    // );
}
