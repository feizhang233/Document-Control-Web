import { Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useDismissableLayer } from '../../hooks/useDismissableLayer'
import type { FilterField, FilterRule } from '../../types/package'

const columns:Array<[FilterField,string]>=[
  ['document_number','Document Number'],['document_title','Document Title'],['document_date','Date'],['document_type','Document Type'],['initiator','Initiator'],
  ['discipline','Discipline'],['number_of_documents','Number of Documents'],['transmittal_number','Transmittal Number'],
  ['workflow_number','Workflow Number'],['submission_progress','Submission Progress %'],
  ['feedback','Feedback %'],['has_attachment','Has Attachment'],['is_abandoned','Abandoned'],['workflow_terminated','Terminate Workflow'],
]
const booleanFields=new Set<FilterField>(['has_attachment','is_abandoned','workflow_terminated'])
const newRule=():FilterRule=>({id:`filter-${Date.now()}-${Math.random()}`,field:'document_number',operator:'contains',value:''})

export function AdvancedFilter({rules,onChange}:{rules:FilterRule[];onChange:(rules:FilterRule[])=>void}){
  const [open,setOpen]=useState(false)
  const filterRef=useDismissableLayer<HTMLDivElement>(open,()=>setOpen(false))
  const update=(id:string,patch:Partial<FilterRule>)=>onChange(rules.map(rule=>rule.id===id?{...rule,...patch}:rule))
  return <div className="advanced-filter" ref={filterRef}><button className={`icon-button bordered ${rules.length?'active':''}`} title="Filter any column" onClick={()=>setOpen(value=>!value)}><SlidersHorizontal size={17}/>{rules.length>0&&<span>{rules.length}</span>}</button>{open&&<div className="filter-popover"><header><div><strong>Column filters</strong><span>All rules must match</span></div><button onClick={()=>setOpen(false)}><X/></button></header><div className="filter-rules">{rules.map(rule=><div className="filter-rule" key={rule.id}><select value={rule.field} onChange={e=>update(rule.id,{field:e.target.value as FilterField,value:''})}>{columns.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><select value={rule.operator} onChange={e=>update(rule.id,{operator:e.target.value as FilterRule['operator']})}><option value="contains">contains</option><option value="equals">equals</option><option value="not_equals">does not equal</option></select>{booleanFields.has(rule.field)?<select value={rule.value} onChange={e=>update(rule.id,{value:e.target.value})}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select>:<input value={rule.value} onChange={e=>update(rule.id,{value:e.target.value})} placeholder={rule.field.includes('progress')||rule.field==='feedback'?'e.g. 50':'Enter value'}/>}<button className="remove-filter" onClick={()=>onChange(rules.filter(item=>item.id!==rule.id))}><X/></button></div>)}{!rules.length&&<div className="filter-empty">Add a rule to filter any column in the current register.</div>}</div><footer><button className="add-filter" onClick={()=>onChange([...rules,newRule()])}><Plus/> Add filter</button>{rules.length>0&&<button className="clear-filter" onClick={()=>onChange([])}><RotateCcw/> Clear all</button>}</footer></div>}</div>
}
