import { useEffect, useState } from 'react'
import { Ban, Calendar, FileStack, Hash, OctagonX, Paperclip, Save, UserRound, X } from 'lucide-react'
import type { Package, PackageInput, WorkflowConfig } from '../../types/package'
import { FeedbackStatus } from './FeedbackStatus'
import { SubmissionSlider } from './SubmissionSlider'

export function PackageDrawer({item,workflowConfig,saving,onUpdate,onClose}:{item:Package|null;workflowConfig:WorkflowConfig;saving:boolean;onUpdate:(data:Partial<PackageInput>)=>void;onClose:()=>void}){
  const [notes,setNotes]=useState('')
  const [sliderValue,setSliderValue]=useState(0)
  useEffect(()=>{setNotes(item?.notes||'');setSliderValue(item?workflowConfig.submission_steps.filter(step=>item.submission_progress[step]).length:0)},[item,workflowConfig.submission_steps])
  if(!item)return null
  const commitSlider=(value:number)=>onUpdate({submission_progress:Object.fromEntries(workflowConfig.submission_steps.map((step,index)=>[step,index<value])) as PackageInput['submission_progress']})
  return <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Document details"><div className="drawer-backdrop" onClick={onClose}/><aside className="detail-drawer"><header><div><span className="eyebrow">Document details</span><h2>{item.document_number}</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></header><div className="drawer-body">
    <div className={`detail-hero ${item.is_abandoned?'abandoned':''}`}><div className="hero-badges"><span className="badge blue">{item.document_type||'Unclassified'}</span>{item.is_abandoned&&<span className="badge abandoned"><Ban/>Abandoned</span>}{item.workflow_terminated&&<span className="badge terminated"><OctagonX/>Workflow terminated</span>}</div><h3>{item.discipline||'No discipline'}</h3><p>Last updated {new Date(item.updated_at).toLocaleString()}</p></div>
    <div className="detail-grid"><div><UserRound/><span>Initiator</span><strong>{item.initiator||'—'}</strong></div><div><FileStack/><span>Documents</span><strong>{item.number_of_documents}</strong></div><div><Hash/><span>Workflow</span><strong>{item.workflow_number||'—'}</strong></div><div><Hash/><span>Transmittal</span><strong>{item.transmittal_number||'—'}</strong></div><div><Calendar/><span>Date</span><strong>{item.has_attachment?'Attachment':item.document_date}</strong></div><div><OctagonX/><span>Terminate Workflow</span><strong>{item.workflow_terminated?'Terminated':'Not terminated'}</strong></div></div>
    <section className="drawer-section attachment-section"><div><Paperclip/><div><h4>Has attachment</h4><p>Highlight this document and replace its date display with an attachment label.</p></div></div><label className="switch"><input type="checkbox" checked={item.has_attachment} onChange={e=>onUpdate({has_attachment:e.target.checked})}/><i/></label></section>
    <section className="drawer-section notes-section"><div className="section-heading"><h4>Notes</h4><button className="secondary-button" disabled={saving||notes===item.notes} onClick={()=>onUpdate({notes})}><Save/>Save notes</button></div><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add document control notes, decisions or follow-up context…"/></section>
    <section className={`drawer-section submission-slider-section ${item.is_abandoned?'disabled':''}`}>
      <div className="section-heading"><h4>Submission progress</h4><span>{item.is_abandoned?'Stopped':'Drag to update'}</span></div>
      <SubmissionSlider steps={workflowConfig.submission_steps} value={sliderValue} onChange={setSliderValue} onCommit={commitSlider} disabled={item.is_abandoned||saving}/>
    </section>
    <section className="drawer-section feedback-status-section"><div className="section-heading"><h4>External feedback</h4><span>Feedback Status</span></div><FeedbackStatus item={item} reviewers={workflowConfig.feedback_reviewers} statusLabels={workflowConfig.feedback_status_labels}/></section>
  </div></aside></div>
}
