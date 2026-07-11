import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, Plus, Search } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError, packagesApi, settingsApi } from '../lib/api'
import { feedbackSteps, submissionSteps, type FilterRule, type Package, type PackageInput, type PageKind, type Period, type WorkflowConfig } from '../types/package'
import { EmptyState, ErrorState, LoadingState } from '../components/common/PageState'
import { PackageTable } from '../components/packages/PackageTable'
import { PackageDrawer } from '../components/packages/PackageDrawer'
import { PackageEditor } from '../components/packages/PackageEditor'
import { AdvancedFilter } from '../components/packages/AdvancedFilter'

const meta = {
  documents: ['Documents', 'Manage submissions and monitor every stage of your document register.'],
  workflow: ['Workflow register', 'Track workflow references and external feedback across all documents.'],
  transmittal: ['Transmittal register', 'Review issued transmittals and their feedback status.'],
} as const
const defaultWorkflowConfig:WorkflowConfig={id:1,submission_steps:[...submissionSteps],feedback_reviewers:[...feedbackSteps],feedback_status_labels:{A:'Approved',B:'Approved with comments',C:'Rejected',P:'Pending'},feedback_status_colors:{A:'#21815d',B:'#9b6816',C:'#b13f4c',P:'#4267bd'},updated_at:''}

export function PackagesPage({ kind }: { kind: PageKind }) {
  const { period: routePeriod } = useParams()
  const period = kind === 'documents' ? (routePeriod as Period || 'week') : 'all'
  const [search, setSearch] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [sortBy, setSortBy] = useState(kind === 'workflow' ? 'workflow_number' : kind === 'transmittal' ? 'transmittal_number' : 'order_index')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc')
  const [selected, setSelected] = useState<Package|null>(null)
  const [editing, setEditing] = useState<Package|null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [filters, setFilters] = useState<FilterRule[]>([])
  const queryClient = useQueryClient()
  const params = { period, search: search || undefined, discipline: discipline || undefined, sort_by: sortBy, sort_order: sortOrder, page_size: 200 }
  const query = useQuery({ queryKey: ['packages', params], queryFn: () => packagesApi.list(params) })
  const configs = useQuery({ queryKey:['column-configs'], queryFn:settingsApi.listColumns })
  const workflowQuery = useQuery({ queryKey:['workflow-config'], queryFn:settingsApi.getWorkflow })
  const workflowConfig=workflowQuery.data||defaultWorkflowConfig
  const currentSubmissionSteps=workflowConfig.submission_steps
  const currentFeedbackReviewers=workflowConfig.feedback_reviewers
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['packages'] })
  const save = useMutation({ mutationFn: (data: PackageInput) => editing ? packagesApi.update(editing.id, data) : packagesApi.create(data), onSuccess: () => { toast.success(editing ? 'Document updated' : 'Document created'); setEditorOpen(false); refresh() }, onError: e => toast.error(getApiError(e)) })
  const reorder = useMutation({ mutationFn: packagesApi.reorder, onMutate: async ids => { await queryClient.cancelQueries({ queryKey: ['packages', params] }); const prev = queryClient.getQueryData(['packages', params]); queryClient.setQueryData(['packages', params], (old: typeof query.data) => old ? { ...old, items: ids.map(id => old.items.find(i=>i.id===id)!).filter(Boolean) } : old); return { prev } }, onError: (_e,_v,c) => { if(c?.prev) queryClient.setQueryData(['packages',params],c.prev); toast.error('Could not save the new order') }, onSettled: refresh })
  const quickUpdate = useMutation({mutationFn:({id,data}:{id:number;data:Partial<PackageInput>})=>packagesApi.update(id,data),onSuccess:updated=>{if(selected?.id===updated.id)setSelected(updated);refresh();queryClient.invalidateQueries({queryKey:['notifications']})},onError:e=>toast.error(getApiError(e))})
  const duplicate = useMutation({mutationFn:(item:Package)=>packagesApi.duplicate(item.id),onSuccess:item=>{toast.success(`Duplicated as ${item.document_number}`);refresh()},onError:e=>toast.error(getApiError(e))})
  const remove = useMutation({mutationFn:(item:Package)=>packagesApi.remove(item.id),onSuccess:(_result,item)=>{toast.success(`${item.document_number} deleted permanently`);if(selected?.id===item.id)setSelected(null);refresh();queryClient.invalidateQueries({queryKey:['notifications']})},onError:e=>toast.error(getApiError(e))})
  const resizeColumn = useMutation({mutationFn:({config,width}:{config:NonNullable<typeof configs.data>[number];width:number})=>settingsApi.updateColumn(config.field_name,{...config,column_width:width}),onMutate:async({config,width})=>{await queryClient.cancelQueries({queryKey:['column-configs']});const previous=queryClient.getQueryData<typeof configs.data>(['column-configs']);queryClient.setQueryData<typeof configs.data>(['column-configs'],items=>items?.map(item=>item.field_name===config.field_name?{...item,column_width:width}:item));return{previous}},onError:(_error,_variables,context)=>{if(context?.previous)queryClient.setQueryData(['column-configs'],context.previous);toast.error('Could not save column width')},onSettled:()=>queryClient.invalidateQueries({queryKey:['column-configs']})})
  const titlePeriod = period === 'week' ? 'This week' : period === 'month' ? 'This month' : period === 'year' ? 'This year' : 'All records'
  const disciplines = useMemo(() => ['Civil','Structural','Architectural','Electrical','Mechanical','Geotechnical'], [])
  const visibleItems=useMemo(()=>{
    const items=query.data?.items||[]
    const valueFor=(item:Package,field:FilterRule['field']):string=>{
      if(field==='submission_progress')return String(Math.round(Object.values(item.submission_progress).filter(Boolean).length/6*100))
      if(field==='feedback')return item.feedback.Terminate?'terminated':String(Math.round(currentFeedbackReviewers.filter(step=>item.feedback[step]).length/currentFeedbackReviewers.length*100))
      return String(item[field]??'')
    }
    return items.filter(item=>filters.every(rule=>{if(!rule.value)return true;const actual=valueFor(item,rule.field).toLowerCase();const expected=rule.value.toLowerCase();return rule.operator==='contains'?actual.includes(expected):rule.operator==='equals'?actual===expected:actual!==expected}))
  },[query.data?.items,filters,currentFeedbackReviewers])
  const advance=(item:Package,type:'submission'|'feedback')=>{
    if(type==='submission'){
      const next=currentSubmissionSteps.find(step=>!item.submission_progress[step]);if(!next)return
      quickUpdate.mutate({id:item.id,data:{submission_progress:{...item.submission_progress,[next]:true}}});return
    }
    const next=currentFeedbackReviewers.find(step=>!item.feedback[step]);if(!next)return
    quickUpdate.mutate({id:item.id,data:{feedback:{...item.feedback,[next]:true}}})
  }
  return <>
    <div className="page-header"><div><div className="breadcrumb">Document Control <span>/</span> {kind === 'documents' ? titlePeriod : meta[kind][0]}</div><h1>{meta[kind][0]}</h1><p>{meta[kind][1]}</p></div><div className="header-actions"><button className="primary-button" onClick={() => {setEditing(null);setEditorOpen(true)}}><Plus size={17}/> New document</button></div></div>
    <section className="data-card">
      <div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents, workflows, people…"/><kbd>⌘ K</kbd></div><div className="toolbar-filters"><label><Filter size={15}/><select value={discipline} onChange={e=>setDiscipline(e.target.value)}><option value="">All disciplines</option>{disciplines.map(d=><option key={d}>{d}</option>)}</select></label><AdvancedFilter rules={filters} onChange={setFilters}/></div></div>
      <div className="result-strip"><div><strong>{filters.length?visibleItems.length:query.data?.total??'—'}</strong> documents <span>·</span> {titlePeriod}{filters.length>0&&<span>· {filters.length} filters</span>}</div><div className="legend"><i className="done"/> Complete <i/> Pending</div></div>
      {query.isLoading ? <LoadingState/> : query.isError ? <ErrorState message={getApiError(query.error)} retry={()=>query.refetch()}/> : !visibleItems.length ? <EmptyState filtered={!!search || !!discipline || !!filters.length}/> : <PackageTable
        items={visibleItems} kind={kind} configs={configs.data||[]} submissionSteps={currentSubmissionSteps} feedbackReviewers={currentFeedbackReviewers} feedbackStatusLabels={workflowConfig.feedback_status_labels} feedbackStatusColors={workflowConfig.feedback_status_colors} {...{sortBy,sortOrder}}
        onSort={key => { if(sortBy===key) setSortOrder(v=>v==='asc'?'desc':'asc'); else {setSortBy(key);setSortOrder('asc')} }} onView={setSelected} onEdit={item=>{setEditing(item);setEditorOpen(true)}}
        onColumnResize={(field,width)=>{const config=configs.data?.find(item=>item.field_name===field);if(config)resizeColumn.mutate({config,width})}} onReorder={ids=>reorder.mutate(ids)} onAdvance={advance} onDuplicate={item=>duplicate.mutate(item)} onToggleAbandoned={item=>quickUpdate.mutate({id:item.id,data:{is_abandoned:!item.is_abandoned}})} onToggleTerminate={item=>quickUpdate.mutate({id:item.id,data:{workflow_terminated:!item.workflow_terminated}})} onDelete={item=>remove.mutate(item)}
      />}
      {!!visibleItems.length && <div className="table-footer"><span>Showing {visibleItems.length} of {query.data?.total} documents</span><span>Click a progress bar to advance · Drag rows to reprioritize</span></div>}
    </section>
    <PackageDrawer item={selected} configs={configs.data||[]} workflowConfig={workflowConfig} saving={quickUpdate.isPending} onUpdate={data=>selected&&quickUpdate.mutate({id:selected.id,data})} onClose={()=>setSelected(null)}/>
    <PackageEditor item={editing} configs={configs.data||[]} workflowConfig={workflowConfig} open={editorOpen} saving={save.isPending} onClose={()=>setEditorOpen(false)} onSave={data=>save.mutate(data)}/>
  </>
}
