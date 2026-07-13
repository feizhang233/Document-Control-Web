# DocFlow API

All endpoints are served under `/api`. Interactive OpenAPI documentation is available at `/api/docs` when the backend is running.

## Authentication

Internal UI endpoints currently rely on network access controls. The automation endpoint requires an API key in the `X-API-Key` header.

Set a long random key in `.env` before deployment:

```env
EXTERNAL_API_KEY=replace_with_a_long_random_api_key
```

Never commit a production key or place it in a query string.

## External workflow automation

### Update a workflow

```http
PATCH /api/external/workflows/{workflow_number}
X-API-Key: your-api-key
Content-Type: application/json
```

The endpoint is intended for a daily synchronization script. It locates the document by Workflow Number, applies the supplied fields, and creates an unread notification in DocFlow.

All body fields are optional, but at least one workflow or feedback field must be supplied:

```json
{
  "submission_progress": {
    "Email Feedback": true
  },
  "feedback": {
    "UTIBER": true,
    "GDS": false,
    "Terminate": false
  },
  "feedback_status": {
    "UTIBER": "B",
    "GDS": "P"
  },
  "terminate_workflow": false,
  "message": "Daily Aconex sync completed the workflow."
}
```

Partial progress, feedback, and feedback-status objects are merged with existing values. Setting an approval status to `A`, `B`, or `C` automatically marks that reviewer stage complete; `P` marks it pending. Set `feedback.Terminate=true` to grey the complete Feedback bar while Submission Progress keeps its existing colour. The default submission keys, in order, are:

- `Transmittal Preparation`
- `DCO Backup`
- `Signature Process`
- `Workflow Initiation`
- `Email Feedback`

The default feedback keys are `UTIBER`, `GDS`, and `Terminate`. Administrators can rename/reorder these fields in Settings; automation clients must use the currently configured names returned by `GET /api/settings/workflow`. `terminate_workflow` controls the separate, selectable Terminate Workflow status in the Workflow register and document detail card.

Feedback status codes:

- `A`: Approved
- `B`: Approved with comments
- `C`: Rejected
- `P`: Pending

The effective status shown in the UI follows the review sequence: before UTIBER responds it shows `P`; while GDS is pending it shows the UTIBER result; after GDS responds it shows the GDS result; terminated Feedback shows `Terminated`.

Example:

```bash
curl -X PATCH 'https://documents.example.com/api/external/workflows/WF-2026-0080' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your-api-key' \
  -d '{"feedback_status":{"UTIBER":"B","GDS":"P"},"feedback":{"Terminate":false}}'
```

Responses:

- `200`: updated document metadata
- `400`: no workflow fields supplied
- `401`: missing or invalid API key
- `404`: Workflow Number not found
- `422`: invalid field or progress/feedback key

## Notifications

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/notifications?limit=30` | List newest notifications and unread count |
| `PATCH` | `/api/notifications/{id}/read` | Mark one notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark every notification as read |

Notifications are generated when workflow status, submission progress, or feedback changes through the UI or external automation endpoint.

The former Workflow Status field is removed. Feedback is now the workflow feedback state, with `UTIBER`, `GDS`, and `Terminate` options.

## Documents

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/packages` | Search, filter, sort, and paginate documents |
| `POST` | `/api/packages` | Create a document; blank Document Number becomes a unique `DRAFT-*` number |
| `POST` | `/api/packages/{id}/duplicate` | Duplicate metadata using a unique `-COPY` Document Number |
| `GET` | `/api/packages/{id}` | Read complete document metadata |
| `PATCH` | `/api/packages/{id}` | Update supplied fields |
| `DELETE` | `/api/packages/{id}` | Delete a document |
| `POST` | `/api/packages/reorder` | Persist row ordering |

List parameters: `period=week|month|year|all`, `search`, `discipline`, `document_type`, `transmittal_prefix`, `sort_by`, `sort_order`, `page`, and `page_size`. `transmittal_prefix` performs a starts-with match against the Transmittal Number.

Lifecycle fields accepted by create/update and included in metadata backups are `notes`, `has_attachment`, `is_abandoned`, and `workflow_terminated`. Setting `is_abandoned=true` greys both progress tracks in the UI without deleting their recorded steps.

## Workflow, column settings, and metadata backup

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/settings/columns` | Read Document design and per-register visibility configuration |
| `PUT` | `/api/settings/columns/{field}` | Update Document column labels, width, visibility, and input options |
| `PUT` | `/api/settings/columns/{field}/visibility?register=workflow\|transmittal` | Update visibility only for the selected register |
| `GET` | `/api/settings/workflow` | Read Submission stages, Feedback reviewers, A/B/C/P labels, and Transmittal filter prefixes |
| `PUT` | `/api/settings/workflow` | Update workflow structure, Transmittal prefixes, and remap existing document state by position |
| `GET` | `/api/metadata/export` | Export documents and settings as JSON |
| `POST` | `/api/metadata/import?mode=merge` | Merge a metadata backup |
| `POST` | `/api/metadata/import?mode=replace` | Replace current metadata from a backup |
| `POST` | `/api/metadata/import-csv?mode=merge` | Merge document rows parsed from a CSV file |
| `POST` | `/api/metadata/import-csv?mode=replace` | Replace the document register with CSV rows |

`PUT /api/settings/workflow` requires exactly five unique `submission_steps`, exactly two unique `feedback_reviewers`, labels for all four fixed status codes (`A`, `B`, `C`, `P`), and at least one `transmittal_prefixes` entry. Workflow configuration is included in metadata exports and restores.

CSV imports accept a JSON body with `rows` after the browser parses a selected CSV file. The Settings screen supports the same headers emitted by CSV export: `document_number`, `document_date`, `document_type`, `initiator`, `discipline`, `number_of_documents`, `transmittal_number`, `workflow_number`, `workflow_terminated`, `has_attachment`, `is_abandoned`, and `notes`. In merge mode, a matching Document Number updates only columns present in the CSV; new rows receive the active Workflow defaults.

## System

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API and database health check |
