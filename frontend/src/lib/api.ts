import axios from 'axios'
import type { ColumnConfig, CsvImportRow, MetadataBackup, NotificationList, Package, PackageInput, PackageListResponse, Period, WorkflowConfig } from '../types/package'

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 12_000 })

export interface ListParams {
  period?: Period
  search?: string
  discipline?: string
  document_type?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export const packagesApi = {
  list: async (params: ListParams) => (await client.get<PackageListResponse>('/packages', { params })).data,
  get: async (id: number) => (await client.get<Package>(`/packages/${id}`)).data,
  create: async (data: PackageInput) => (await client.post<Package>('/packages', data)).data,
  update: async (id: number, data: Partial<PackageInput>) => (await client.patch<Package>(`/packages/${id}`, data)).data,
  remove: async (id: number) => client.delete(`/packages/${id}`),
  reorder: async (ids: number[]) => client.post('/packages/reorder', { package_ids: ids }),
  duplicate: async (id: number) => (await client.post<Package>(`/packages/${id}/duplicate`)).data,
}

export const settingsApi = {
  listColumns: async () => (await client.get<ColumnConfig[]>('/settings/columns')).data,
  updateColumn: async (field: string, data: Pick<ColumnConfig, 'display_name'|'is_visible'|'column_width'|'input_type'|'options'|'option_colors'>) => (await client.put<ColumnConfig>(`/settings/columns/${field}`, data)).data,
  resetColumns: async () => (await client.post<ColumnConfig[]>('/settings/columns/reset')).data,
  getWorkflow: async () => (await client.get<WorkflowConfig>('/settings/workflow')).data,
  updateWorkflow: async (data: Pick<WorkflowConfig,'submission_steps'|'feedback_reviewers'|'feedback_status_labels'|'feedback_status_colors'>) => (await client.put<WorkflowConfig>('/settings/workflow', data)).data,
}

export const metadataApi = {
  export: async () => (await client.get<MetadataBackup>('/metadata/export')).data,
  import: async (data: MetadataBackup, mode: 'merge'|'replace') => (await client.post('/metadata/import', data, { params: { mode } })).data,
  importCsv: async (rows: CsvImportRow[], mode: 'merge'|'replace') => (await client.post('/metadata/import-csv', { rows }, { params: { mode } })).data,
}

export const notificationsApi = {
  list: async () => (await client.get<NotificationList>('/notifications')).data,
  markRead: async (id: number) => client.patch(`/notifications/${id}/read`),
  markAllRead: async () => client.patch('/notifications/read-all'),
}

function formatApiDetail(detail: unknown): string | null {
  if (detail == null) return null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const entry = item as { loc?: unknown[]; msg?: unknown }
        const path = Array.isArray(entry.loc)
          ? entry.loc.filter((part) => part !== 'body').join('.')
          : ''
        const message = typeof entry.msg === 'string' ? entry.msg : 'Invalid value'
        return path ? `${path}: ${message}` : message
      }
      return null
    }).filter(Boolean)
    return messages.length ? messages.join('; ') : null
  }
  if (typeof detail === 'object') {
    try { return JSON.stringify(detail) } catch { return 'Request failed' }
  }
  return String(detail)
}

export const getApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return formatApiDetail(error.response?.data?.detail) || error.message || 'Request failed'
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}
