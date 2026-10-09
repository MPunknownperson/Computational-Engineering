# Private sandbox/archive runtime

The public website is Radix Loom: its calculator, converter, guides, reference,
and information pages remain the only visitor-facing product. The sandbox UI is
not part of the deployed site. Its useful server-side capabilities remain in
`src/lib/workbench/` and the corresponding private API routes under
`/api/workbench/*`.

## Access control

Every `/api/workbench/*` request passes through `src/proxy.ts`. Requests are
hidden with a `404` unless `WORKBENCH_API_KEY` is set to a high-entropy value of
at least 32 UTF-8 bytes and the caller sends it as a bearer token:

```http
Authorization: Bearer <WORKBENCH_API_KEY>
```

Generate a key with `openssl rand -hex 32` and configure it as a **server-side**
environment variable in the deployment platform. Do not use a `NEXT_PUBLIC_`
variable, commit the key, put it in a URL, or expose it to browser code. If no
valid key is configured, the administrative routes are intentionally disabled.

## Retained capabilities

- Guarded bash execution, `/tmp` path resolution, timeouts and bounded output.
- ZIP/tar/compressed-stream detection, archive inspection and safe extraction.
- Curated package-manager detection and tool installation.
- Workspace file listing, upload, download, compression and deletion.
- Next.js project scaffolding, persisted job audit, tool state and artifact records.

Mutating workbench operations are restricted to the `/tmp` sandbox and recorded
in PostgreSQL. Package installation is executed only from the hand-authored
tool catalogue; it is not a general privileged shell. Archive extraction keeps
path traversal protections. The runtime workspace is ephemeral and is not a
replacement for durable object storage.

## API groups

- `POST /api/workbench/shell`
- `GET /api/workbench/files`, `DELETE /api/workbench/files`, plus the
  `content`, `download`, `upload`, `mkdir` and `compress` file endpoints
- `GET /api/workbench/archives`, `POST /api/workbench/archives/extract`
- `GET /api/workbench/tools`, `POST /api/workbench/tools/install`
- `GET /api/workbench/jobs`, `GET /api/workbench/jobs/:id`
- `POST /api/workbench/scaffold`, `GET /api/workbench/stats`,
  `GET /api/workbench/system`

The regular website APIs (`/api/formulas`, `/api/contact`, market data routes,
and `/api/health`) remain independent of this administrative key.
