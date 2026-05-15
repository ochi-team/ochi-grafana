### Warning

No human intelligence involed, not production ready yet

# Ochi Grafana Datasource

Quick local test setup for the `ochi-logs-datasource` plugin.

## 1) Build plugin assets

```bash
pnpx @grafana/toolkit plugin:build --skipLint --skipTest
```

This must produce `dist/` so Grafana can load the plugin.

If you want to use npm scripts instead, first install dependencies with npm (not pnpm), then run:

```bash
npm install
npm run build
```

## 2) Start Grafana with provisioning

```bash
docker compose up -d
```

Grafana URL: `http://localhost:3000`

Default credentials:

- user: `admin`
- password: `admin`

## 3) Ensure Ochi API is reachable

Provisioned datasource points to:

`http://host.docker.internal:9014`

Your Ochi server should be listening on host port `9014` and serving:

- `GET /insert/loki/ready`
- `POST /query`

## What gets provisioned

- Datasource: `provisioning/datasources/ochi.yaml`
- Dashboard provider: `provisioning/dashboards/dashboards.yaml`
- Dashboard: `provisioning/dashboards/json/ochi-logs.json`

The dashboard contains one Logs panel with textbox variables:

- `query` (example: `[-15m,now] {env=prod AND service=web} status=200`)
