import { useMemo, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Copy, Eye, GripVertical, MoreHorizontal, OctagonX, Paperclip, Pencil, RotateCcw } from 'lucide-react'
import type { Package, PageKind } from '../../types/package'
import { feedbackSteps, submissionSteps } from '../../types/package'
import { ProgressTrack } from '../common/ProgressTrack'
import { StatusBadge } from '../common/StatusBadge'

interface Props { items: Package[]; kind: PageKind; sortBy: string; sortOrder: 'asc'|'desc'; onSort: (key: string) => void; onView: (item: Package) => void; onEdit: (item: Package) => void; onReorder: (ids: number[]) => void; onAdvance:(item:Package,type:'submission'|'feedback')=>void; onDuplicate:(item:Package)=>void; onToggleAbandoned:(item:Package)=>void; onToggleTerminate:(item:Package)=>void }

function Header({ label, field, sortBy, sortOrder, onSort }: { label: string; field?: string; sortBy: string; sortOrder: string; onSort: (s:string)=>void }) {
  return <th>{field ? <button className="sort-button" onClick={() => onSort(field)}>{label}{sortBy === field ? (sortOrder === 'asc' ? <ArrowUp/> : <ArrowDown/>) : <ArrowUpDown/>}</button> : label}</th>
}

function SortableRow({item,kind,onView,onEdit,onAdvance,onDuplicate,onToggleAbandoned,onToggleTerminate}:{item:Package;kind:PageKind;onView:(p:Package)=>void;onEdit:(p:Package)=>void;onAdvance:Props['onAdvance'];onDuplicate:Props['onDuplicate'];onToggleAbandoned:Props['onToggleAbandoned'];onToggleTerminate:Props['onToggleTerminate']}) {
  const [menuOpen,setMenuOpen]=useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const first = kind === 'workflow' ? item.workflow_number : kind === 'transmittal' ? item.transmittal_number : item.document_number
  return <tr ref={setNodeRef} style={style} className={`${isDragging?'dragging':''} ${item.has_attachment?'has-attachment':''} ${item.is_abandoned?'abandoned':''}`} onDoubleClick={() => onView(item)}>
    <td className="drag-cell"><button {...attributes} {...listeners} aria-label="Drag to reorder"><GripVertical size={16}/></button></td>
    <td className="identifier-cell"><strong>{first || '—'}</strong>{kind !== 'documents' && <span>{item.document_number}</span>}</td>
    <td className="mono-cell">{item.has_attachment?<span className="attachment-label"><Paperclip/> Attachment</span>:item.document_date}</td>
    {kind === 'workflow' && <td><button className={`terminate-select ${item.workflow_terminated?'yes':''}`} onClick={event=>{event.stopPropagation();onToggleTerminate(item)}}>{item.workflow_terminated?'Terminated':'Not terminated'}</button></td>}
    <td><StatusBadge status={item.document_type}/></td>
    <td><div className="person-cell"><span>{item.initiator.split(' ').map(s=>s[0]).join('').slice(0,2)}</span>{item.initiator}</div></td>
    <td>{item.discipline}</td>
    <td className="number-cell">{item.number_of_documents}</td>
    {kind === 'documents' && <><td className="mono-cell">{item.transmittal_number || '—'}</td><td className="mono-cell">{item.workflow_number || '—'}</td><td className="progress-cell"><ProgressTrack steps={submissionSteps} values={item.submission_progress} disabled={item.is_abandoned} onAdvance={()=>onAdvance(item,'submission')}/></td></>}
    <td className="progress-cell feedback"><ProgressTrack steps={feedbackSteps} values={item.feedback} disabled={item.is_abandoned||item.feedback.Terminate} disabledLabel={item.is_abandoned?'Submission stopped':'Terminated'} compact onAdvance={()=>onAdvance(item,'feedback')}/></td>
    <td className="action-cell"><button onClick={event=>{event.stopPropagation();onView(item)}} aria-label="View document"><Eye size={17}/></button><button onClick={event=>{event.stopPropagation();onEdit(item)}} aria-label="Edit document"><Pencil size={16}/></button><div className="row-menu"><button onClick={event=>{event.stopPropagation();setMenuOpen(value=>!value)}} aria-label="More actions"><MoreHorizontal size={18}/></button>{menuOpen&&<div className="row-menu-popover" onClick={event=>event.stopPropagation()}><button onClick={()=>{onDuplicate(item);setMenuOpen(false)}}><Copy/>Duplicate document</button><button onClick={()=>{onToggleAbandoned(item);setMenuOpen(false)}}>{item.is_abandoned?<RotateCcw/>:<Ban/>}{item.is_abandoned?'Restore submission':'Abandon submission'}</button><button onClick={()=>{onToggleTerminate(item);setMenuOpen(false)}}>{item.workflow_terminated?<RotateCcw/>:<OctagonX/>}{item.workflow_terminated?'Reopen workflow':'Terminate workflow'}</button></div>}</div></td>
  </tr>
}

export function PackageTable({items,kind,sortBy,sortOrder,onSort,onView,onEdit,onReorder,onAdvance,onDuplicate,onToggleAbandoned,onToggleTerminate}:Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const ids = useMemo(() => items.map(i => i.id), [items])
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(Number(active.id)); const to = ids.indexOf(Number(over.id)); const next = [...ids]
    next.splice(to, 0, next.splice(from, 1)[0]); onReorder(next)
  }
  const primary = kind === 'workflow' ? ['Workflow Number', 'workflow_number'] : kind === 'transmittal' ? ['Transmittal Number', 'transmittal_number'] : ['Document Number', 'document_number']
  return <div className="table-scroll"><DndContext sensors={sensors} onDragEnd={dragEnd}><table className="package-table"><thead><tr>
    <th className="drag-cell"/><Header label={primary[0]} field={primary[1]} {...{sortBy,sortOrder,onSort}}/><Header label="Date" field="document_date" {...{sortBy,sortOrder,onSort}}/>{kind==='workflow'&&<Header label="Terminate Workflow" field="workflow_terminated" {...{sortBy,sortOrder,onSort}}/>}<Header label="Document Type" field="document_type" {...{sortBy,sortOrder,onSort}}/><Header label="Initiator" field="initiator" {...{sortBy,sortOrder,onSort}}/><Header label="Discipline" field="discipline" {...{sortBy,sortOrder,onSort}}/><Header label="Docs" field="number_of_documents" {...{sortBy,sortOrder,onSort}}/>
    {kind === 'documents' && <><Header label="Transmittal No." {...{sortBy,sortOrder,onSort}}/><Header label="Workflow No." {...{sortBy,sortOrder,onSort}}/><Header label="Submission Progress" {...{sortBy,sortOrder,onSort}}/></>}<Header label="Feedback" {...{sortBy,sortOrder,onSort}}/><th/>
  </tr></thead><SortableContext items={ids} strategy={verticalListSortingStrategy}><tbody>{items.map(item => <SortableRow key={item.id} {...{item,kind,onView,onEdit,onAdvance,onDuplicate,onToggleAbandoned,onToggleTerminate}}/>)}</tbody></SortableContext></table></DndContext></div>
}
