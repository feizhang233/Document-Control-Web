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
    "Email Feedback": true,
    "Data Registration": true
  },
  "feedback": {
    "UTIBER": true,
    "GDS": false,
    "Terminate": false
  },
  "terminate_workflow": false,
  "message": "Daily Aconex sync completed the workflow."
}
```

Partial progress and feedback objects are merged with existing values. Set `feedback.Terminate=true` to grey the complete Feedback progress bar while Submission Progress keeps its existing colour. Valid submission keys are:

- `Transmittal Preparation`
- `Signature Process`
- `Workflow Initiation`
- `Email Feedback`
- `Data Registration`
- `DCO Backup`

Valid feedback keys are `UTIBER`, `GDS`, and `Terminate`. `terminate_workflow` controls the separate, selectable Terminate Workflow status in the Workflow register and document detail card.

Example:

```bash
curl -X PATCH 'https://documents.example.com/api/external/workflows/WF-2026-0080' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your-api-key' \
  -d '{"feedback":{"UTIBER":true,"Terminate":false}}'
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

List parameters: `period=week|month|year|all`, `search`, `discipline`, `document_type`, `sort_by`, `sort_order`, `page`, and `page_size`.

Lifecycle fields accepted by create/update and included in metadata backups are `notes`, `has_attachment`, `is_abandoned`, and `workflow_terminated`. Setting `is_abandoned=true` greys both progress tracks in the UI without deleting their recorded steps.

## Column settings and metadata backup

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/settings/columns` | Read text/dropdown configuration |
| `PUT` | `/api/settings/columns/{field}` | Update input type and dropdown options |
| `GET` | `/api/metadata/export` | Export documents and settings as JSON |
| `POST` | `/api/metadata/import?mode=merge` | Merge a metadata backup |
| `POST` | `/api/metadata/import?mode=replace` | Replace current metadata from a backup |

## System

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API and database health check |
