import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Save, X } from 'lucide-react'
import type { ColumnConfig, Package, PackageInput } from '../../types/package'
import { feedbackSteps, submissionSteps } from '../../types/package'

const emptyProgress = Object.fromEntries(submissionSteps.map(s => [s, false])) as PackageInput['submission_progress']
const emptyFeedback = Object.fromEntries(feedbackSteps.map(s => [s, false])) as PackageInput['feedback']
const today = () => new Date().toISOString().slice(0, 10)
const blank: PackageInput = {
  document_number: '', document_date: today(), document_type: 'Drawing', initiator: '', discipline: '', number_of_documents: 1,
  transmittal_number: '', workflow_number: '', workflow_terminated:false, notes:'', has_attachment:false, is_abandoned:false,
  submission_progress: emptyProgress, feedback: emptyFeedback, order_index: 0,
}
type BaseField = ColumnConfig['field_name']
const fields: Array<{ name: BaseField; label: string; placeholder?: string }> = [
  {name:'document_number',label:'Document number',placeholder:'Auto-generated if left blank'},
  {name:'document_date',label:'Date'},
  {name:'document_type',label:'Document type'},
  {name:'initiator',label:'Initiator',placeholder:'Full name'},
  {name:'discipline',label:'Discipline'},
  {name:'number_of_documents',label:'Number of documents'},
  {name:'workflow_number',label:'Workflow number',placeholder:'WF-2026-0001'},
  {name:'transmittal_number',label:'Transmittal number',placeholder:'TR-2026-0001'},
]
const fallback: Partial<Record<BaseField, string[]>> = {
  document_type:['Drawing','Technical Report','Method Statement','Specification','Calculation'],
  discipline:['Civil','Structural','Architectural','Electrical','Mechanical','Geotechnical'],
}

export function PackageEditor({ item, configs, open, saving, onClose, onSave }: { item: Package | null; configs: ColumnConfig[]; open: boolean; saving: boolean; onClose: () => void; onSave: (data: PackageInput) => void }) {
  const [form, setForm] = useState<PackageInput>(blank)
  const configMap = useMemo(() => Object.fromEntries(configs.map(c => [c.field_name,c])) as Partial<Record<BaseField,ColumnConfig>>, [configs])
  useEffect(() => {
    if (open) setForm(item ? {
      document_number:item.document_number, document_date:item.document_date, document_type:item.document_type, initiator:item.initiator,
      discipline:item.discipline, number_of_documents:item.number_of_documents, transmittal_number:item.transmittal_number,
      workflow_terminated:item.workflow_terminated, notes:item.notes, has_attachment:item.has_attachment, is_abandoned:item.is_abandoned,
      workflow_number:item.workflow_number, submission_progress:{...item.submission_progress}, feedback:{...item.feedback}, order_index:item.order_index,
    } : {...blank, document_date:today(), submission_progress:{...emptyProgress}, feedback:{...emptyFeedback}})
  }, [item, open])
  if (!open) return null
  const set = <K extends keyof PackageInput>(key: K, value: PackageInput[K]) => setForm(prev => ({...prev,[key]:value}))
  const setBase = (field: BaseField, raw: string) => {
    if (field === 'number_of_documents') set(field, Math.max(1, Number(raw)))
    else set(field, raw)
  }
  return <div className="modal-layer" role="dialog" aria-modal="true">
    <div className="modal-backdrop" onClick={onClose}/>
    <form className="editor-modal" onSubmit={e=>{e.preventDefault();onSave({...form,document_date:form.document_date||today()})}}>
      <header><div><span className="eyebrow">{item?'Editing document':'New document'}</span><h2>{item?.document_number||'Create document'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></header>
      <div className="editor-body">
        <div className="form-grid">{fields.map(field => {
          const config=configMap[field.name]
          const options=config?.input_type==='select' ? config.options : fallback[field.name]
          const value=String(form[field.name]??'')
          const inputType=field.name==='document_date'?'date':field.name==='number_of_documents'?'number':'text'
          return <label key={field.name}><span>{field.label}</span>{options?.length ? <select value={value} onChange={e=>setBase(field.name,e.target.value)}><option value="">Select {field.label.toLowerCase()}</option>{!options.includes(value)&&value&&<option value={value}>{value}</option>}{options.map(option=><option key={option} value={option}>{option}</option>)}</select> : <input type={inputType} min={inputType==='number'?1:undefined} value={value} placeholder={field.placeholder} onChange={e=>setBase(field.name,e.target.value)}/>}</label>
        })}</div>
        <fieldset><legend>Terminate Workflow</legend><div className="check-grid two"><label className="check-card"><input type="checkbox" checked={form.workflow_terminated} onChange={e=>set('workflow_terminated',e.target.checked)}/><i/><span>Workflow is terminated</span></label></div></fieldset>
        <fieldset><legend>Submission progress</legend><div className="check-grid">{submissionSteps.map(step=><label className="check-card" key={step}><input type="checkbox" checked={form.submission_progress[step]} onChange={e=>set('submission_progress',{...form.submission_progress,[step]:e.target.checked})}/><i/><span>{step}</span></label>)}</div></fieldset>
        <fieldset><legend>Feedback</legend><div className="check-grid two">{feedbackSteps.map(step=><label className="check-card" key={step}><input type="checkbox" checked={form.feedback[step]} onChange={e=>set('feedback',{...form.feedback,[step]:e.target.checked})}/><i/><span>{step}</span></label>)}</div></fieldset>
      </div>
      <footer><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving?<LoaderCircle className="spin" size={16}/>:<Save size={16}/>} {saving?'Saving…':'Save document'}</button></footer>
    </form>
  </div>
}
