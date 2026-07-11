import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Copy, Eye, GripVertical, MoreHorizontal, OctagonX, Paperclip, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { ColumnConfig, ColumnField, FeedbackStatusCode, Package, PageKind } from '../../types/package'
import { ProgressTrack } from '../common/ProgressTrack'
import { StatusBadge } from '../common/StatusBadge'
import { FeedbackStatus } from './FeedbackStatus'

interface Props { items: Package[]; kind: PageKind; configs:ColumnConfig[]; submissionSteps:readonly string[]; feedbackReviewers:readonly string[]; feedbackStatusLabels:Record<FeedbackStatusCode,string>; feedbackStatusColors:Record<FeedbackStatusCode,string>; sortBy: string; sortOrder: 'asc'|'desc'; onSort: (key: string) => void; onColumnResize:(field:ColumnField,width:number)=>void; onView: (item: Package) => void; onEdit: (item: Package) => void; onReorder: (ids: number[]) => void; onAdvance:(item:Package,type:'submission'|'feedback')=>void; onDuplicate:(item:Package)=>void; onToggleAbandoned:(item:Package)=>void; onToggleTerminate:(item:Package)=>void; onDelete:(item:Package)=>void }

const styleFor=(config?:ColumnConfig):CSSProperties|undefined=>config?{width:config.column_width,minWidth:config.column_width,maxWidth:config.column_width}:undefined

function Header({ label, field, config, sortBy, sortOrder, onSort, onResize }: { label: string; field?: string; config?:ColumnConfig; sortBy: string; sortOrder: string; onSort: (s:string)=>void; onResize?:(field:ColumnField,width:number,commit?:boolean)=>void }) {
  const beginResize=(event:React.PointerEvent<HTMLSpanElement>)=>{
    if(!config||!onResize)return
    event.preventDefault();event.stopPropagation()
    const startX=event.clientX,startWidth=config.column_width
    let width=startWidth
    document.body.classList.add('resizing-column')
    const move=(moveEvent:PointerEvent)=>{width=Math.min(500,Math.max(72,startWidth+moveEvent.clientX-startX));onResize(config.field_name,width)}
    const end=()=>{onResize(config.field_name,width,true);document.body.classList.remove('resizing-column');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end)}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true})
  }
  return <th style={styleFor(config)}>{field ? <button className="sort-button" onClick={() => onSort(field)}>{label}{sortBy === field ? (sortOrder === 'asc' ? <ArrowUp/> : <ArrowDown/>) : <ArrowUpDown/>}</button> : label}{config&&onResize&&<span className="column-resize-handle" role="separator" aria-label={`Resize ${label}`} onPointerDown={beginResize}/>}</th>
}

function SortableRow({item,kind,configs,submissionSteps,feedbackReviewers,feedbackStatusLabels,feedbackStatusColors,onView,onEdit,onAdvance,onDuplicate,onToggleAbandoned,onToggleTerminate,onDelete}:{item:Package;kind:PageKind;configs:ColumnConfig[];submissionSteps:Props['submissionSteps'];feedbackReviewers:Props['feedbackReviewers'];feedbackStatusLabels:Props['feedbackStatusLabels'];feedbackStatusColors:Props['feedbackStatusColors'];onView:(p:Package)=>void;onEdit:(p:Package)=>void;onAdvance:Props['onAdvance'];onDuplicate:Props['onDuplicate'];onToggleAbandoned:Props['onToggleAbandoned'];onToggleTerminate:Props['onToggleTerminate'];onDelete:Props['onDelete']}) {
  const [menuOpen,setMenuOpen]=useState(false)
  const menuRef=useRef<HTMLDivElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  useEffect(()=>{
    const close=(event:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(event.target as Node))setMenuOpen(false)}
    document.addEventListener('mousedown',close)
    return()=>document.removeEventListener('mousedown',close)
  },[])
  useEffect(()=>{if(isDragging)setMenuOpen(false)},[isDragging])
  const style = { transform: CSS.Transform.toString(transform), transition }
  const first = kind === 'workflow' ? item.workflow_number : kind === 'transmittal' ? item.transmittal_number : item.document_number
  const config=(field:ColumnField)=>configs.find(item=>item.field_name===field)
  const shown=(field:ColumnField)=>kind!=='documents'||config(field)?.is_visible!==false
  return <tr ref={setNodeRef} style={style} className={`${isDragging?'dragging':''} ${item.has_attachment?'has-attachment':''} ${item.is_abandoned?'abandoned':''}`} onDoubleClick={() => onView(item)}>
    <td className="drag-cell"><button {...attributes} {...listeners} aria-label="Drag to reorder"><GripVertical size={16}/></button></td>
    {shown('document_number')&&<td className="identifier-cell" style={styleFor(config(kind==='workflow'?'workflow_number':kind==='transmittal'?'transmittal_number':'document_number'))}><strong>{first || '—'}</strong>{kind !== 'documents' && <span>{item.document_number}</span>}</td>}
    {kind === 'documents' && shown('document_title') && <td className="document-title-cell" style={styleFor(config('document_title'))}>{item.document_title || '—'}</td>}
    {shown('document_date')&&<td className="mono-cell" style={styleFor(config('document_date'))}>{item.has_attachment?<span className="attachment-label"><Paperclip/> Attachment</span>:item.document_date}</td>}
    {kind === 'workflow' && <td><button className={`terminate-select ${item.workflow_terminated?'yes':''}`} onClick={event=>{event.stopPropagation();onToggleTerminate(item)}}>{item.workflow_terminated?'Terminated':'Not terminated'}</button></td>}
    {shown('document_type')&&<td style={styleFor(config('document_type'))}><StatusBadge status={item.document_type} color={config('document_type')?.option_colors[item.document_type]}/></td>}
    {shown('initiator')&&<td style={styleFor(config('initiator'))}><div className="person-cell"><span>{item.initiator.split(' ').map(s=>s[0]).join('').slice(0,2)}</span>{item.initiator}</div></td>}
    {shown('discipline')&&<td style={styleFor(config('discipline'))}>{item.discipline}</td>}
    {shown('number_of_documents')&&<td className="number-cell" style={styleFor(config('number_of_documents'))}>{item.number_of_documents}</td>}
    {kind === 'documents' && <>{shown('transmittal_number')&&<td className="mono-cell" style={styleFor(config('transmittal_number'))}>{item.transmittal_number || '—'}</td>}{shown('workflow_number')&&<td className="mono-cell" style={styleFor(config('workflow_number'))}>{item.workflow_number || '—'}</td>}{shown('submission_progress')&&<td className="progress-cell" style={styleFor(config('submission_progress'))}><ProgressTrack steps={submissionSteps} values={item.submission_progress} disabled={item.is_abandoned} onAdvance={()=>onAdvance(item,'submission')}/></td>}</>}
    {shown('feedback')&&<td className="progress-cell feedback" style={styleFor(config('feedback'))}><FeedbackStatus item={item} reviewers={feedbackReviewers} statusLabels={feedbackStatusLabels} statusColors={feedbackStatusColors} compact/></td>}
    <td className="action-cell"><button onClick={event=>{event.stopPropagation();setMenuOpen(false);onView(item)}} aria-label="View document"><Eye size={17}/></button><button onClick={event=>{event.stopPropagation();setMenuOpen(false);onEdit(item)}} aria-label="Edit document"><Pencil size={16}/></button><div className="row-menu" ref={menuRef}><button onClick={event=>{event.stopPropagation();setMenuOpen(value=>!value)}} aria-label="More actions"><MoreHorizontal size={18}/></button>{menuOpen&&<div className="row-menu-popover" onClick={event=>event.stopPropagation()}><button onClick={()=>{setMenuOpen(false);onDuplicate(item)}}><Copy/>Duplicate document</button><button onClick={()=>{setMenuOpen(false);onToggleAbandoned(item)}}>{item.is_abandoned?<RotateCcw/>:<Ban/>}{item.is_abandoned?'Restore submission':'Abandon submission'}</button><button onClick={()=>{setMenuOpen(false);onToggleTerminate(item)}}>{item.workflow_terminated?<RotateCcw/>:<OctagonX/>}{item.workflow_terminated?'Reopen workflow':'Terminate workflow'}</button><button className="danger" onClick={()=>{setMenuOpen(false);if(window.confirm(`Permanently delete ${item.document_number}? This cannot be undone.`))onDelete(item)}}><Trash2/>Delete document</button></div>}</div></td>
  </tr>
}

export function PackageTable({items,kind,configs,submissionSteps,feedbackReviewers,feedbackStatusLabels,feedbackStatusColors,sortBy,sortOrder,onSort,onColumnResize,onView,onEdit,onReorder,onAdvance,onDuplicate,onToggleAbandoned,onToggleTerminate,onDelete}:Props) {
  const [widths,setWidths]=useState<Record<string,number>>({})
  useEffect(()=>setWidths(Object.fromEntries(configs.map(item=>[item.field_name,item.column_width]))),[configs])
  const layoutConfigs=useMemo(()=>configs.map(item=>({...item,column_width:widths[item.field_name]??item.column_width})),[configs,widths])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const ids = useMemo(() => items.map(i => i.id), [items])
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(Number(active.id)); const to = ids.indexOf(Number(over.id)); const next = [...ids]
    next.splice(to, 0, next.splice(from, 1)[0]); onReorder(next)
  }
  const primary = kind === 'workflow' ? ['Workflow Number', 'workflow_number'] : kind === 'transmittal' ? ['Transmittal Number', 'transmittal_number'] : ['Document Number', 'document_number']
  const config=(field:ColumnField)=>layoutConfigs.find(item=>item.field_name===field)
  const shown=(field:ColumnField)=>kind!=='documents'||config(field)?.is_visible!==false
  const label=(field:ColumnField,fallback:string)=>kind==='documents'?(config(field)?.display_name||fallback):fallback
  const resize=(field:ColumnField,width:number,commit=false)=>{setWidths(previous=>({...previous,[field]:width}));if(commit)onColumnResize(field,width)}
  const configuredWidth=kind==='documents'?layoutConfigs.filter(item=>item.is_visible).reduce((total,item)=>total+item.column_width,110):undefined
  return <div className="table-scroll"><DndContext sensors={sensors} onDragEnd={dragEnd}><table className={`package-table ${kind==='documents'?'configurable-table':''}`} style={configuredWidth?{width:configuredWidth,minWidth:'100%'}:undefined}><thead><tr>
    <th className="drag-cell"/>{shown('document_number')&&<Header label={label('document_number',primary[0])} field={primary[1]} config={config(kind==='workflow'?'workflow_number':kind==='transmittal'?'transmittal_number':'document_number')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}{kind === 'documents' && shown('document_title') && <Header label={label('document_title','Document Title')} field="document_title" config={config('document_title')} onResize={resize} {...{sortBy,sortOrder,onSort}}/>}{shown('document_date')&&<Header label={label('document_date','Date')} field="document_date" config={config('document_date')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}{kind==='workflow'&&<Header label="Terminate Workflow" field="workflow_terminated" {...{sortBy,sortOrder,onSort}}/>}{shown('document_type')&&<Header label={label('document_type','Document Type')} field="document_type" config={config('document_type')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}{shown('initiator')&&<Header label={label('initiator','Initiator')} field="initiator" config={config('initiator')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}{shown('discipline')&&<Header label={label('discipline','Discipline')} field="discipline" config={config('discipline')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}{shown('number_of_documents')&&<Header label={label('number_of_documents','Docs')} field="number_of_documents" config={config('number_of_documents')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}
    {kind === 'documents' && <>{shown('transmittal_number')&&<Header label={label('transmittal_number','Transmittal No.')} config={config('transmittal_number')} onResize={resize} {...{sortBy,sortOrder,onSort}}/>}{shown('workflow_number')&&<Header label={label('workflow_number','Workflow No.')} config={config('workflow_number')} onResize={resize} {...{sortBy,sortOrder,onSort}}/>}{shown('submission_progress')&&<Header label={label('submission_progress','Submission Progress')} config={config('submission_progress')} onResize={resize} {...{sortBy,sortOrder,onSort}}/>}</>}{shown('feedback')&&<Header label={label('feedback','Feedback')} config={config('feedback')} onResize={kind==='documents'?resize:undefined} {...{sortBy,sortOrder,onSort}}/>}<th/>
  </tr></thead><SortableContext items={ids} strategy={verticalListSortingStrategy}><tbody>{items.map(item => <SortableRow key={item.id} {...{item,kind,configs:layoutConfigs,submissionSteps,feedbackReviewers,feedbackStatusLabels,feedbackStatusColors,onView,onEdit,onAdvance,onDuplicate,onToggleAbandoned,onToggleTerminate,onDelete}}/>)}</tbody></SortableContext></table></DndContext></div>
}
