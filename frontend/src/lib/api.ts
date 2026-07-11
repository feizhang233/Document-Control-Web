import axios from 'axios'
import type { ColumnConfig, MetadataBackup, NotificationList, Package, PackageInput, PackageListResponse, Period } from '../types/package'

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
  updateColumn: async (field: string, data: Pick<ColumnConfig, 'input_type'|'options'>) => (await client.put<ColumnConfig>(`/settings/columns/${field}`, data)).data,
}

export const metadataApi = {
  export: async () => (await client.get<MetadataBackup>('/metadata/export')).data,
  import: async (data: MetadataBackup, mode: 'merge'|'replace') => (await client.post('/metadata/import', data, { params: { mode } })).data,
}

export const notificationsApi = {
  list: async () => (await client.get<NotificationList>('/notifications')).data,
  markRead: async (id: number) => client.patch(`/notifications/${id}/read`),
  markAllRead: async () => client.patch('/notifications/read-all'),
}

export const getApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) return error.response?.data?.detail || error.message
  return 'An unexpected error occurred.'
}
