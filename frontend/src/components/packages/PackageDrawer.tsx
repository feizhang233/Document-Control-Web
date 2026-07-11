import { useEffect, useState } from 'react'
import { Ban, Calendar, FileStack, Hash, OctagonX, Paperclip, Save, UserRound, X } from 'lucide-react'
import type { Package, PackageInput } from '../../types/package'
import { feedbackSteps, submissionSteps } from '../../types/package'
import { ProgressTrack } from '../common/ProgressTrack'

export function PackageDrawer({item,saving,onUpdate,onClose}:{item:Package|null;saving:boolean;onUpdate:(data:Partial<PackageInput>)=>void;onClose:()=>void}){
  const [notes,setNotes]=useState('')
  const [sliderValue,setSliderValue]=useState(0)
  useEffect(()=>{setNotes(item?.notes||'');setSliderValue(item?submissionSteps.filter(step=>item.submission_progress[step]).length:0)},[item])
  if(!item)return null
  const currentStep=sliderValue===submissionSteps.length?'Complete':submissionSteps[sliderValue]
  const commitSlider=(value:number)=>onUpdate({submission_progress:Object.fromEntries(submissionSteps.map((step,index)=>[step,index<value])) as PackageInput['submission_progress']})
  return <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Document details"><div className="drawer-backdrop" onClick={onClose}/><aside className="detail-drawer"><header><div><span className="eyebrow">Document details</span><h2>{item.document_number}</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></header><div className="drawer-body">
    <div className={`detail-hero ${item.is_abandoned?'abandoned':''}`}><div className="hero-badges"><span className="badge blue">{item.document_type||'Unclassified'}</span>{item.is_abandoned&&<span className="badge abandoned"><Ban/>Abandoned</span>}{item.workflow_terminated&&<span className="badge terminated"><OctagonX/>Workflow terminated</span>}</div><h3>{item.discipline||'No discipline'}</h3><p>Last updated {new Date(item.updated_at).toLocaleString()}</p></div>
    <div className="detail-grid"><div><UserRound/><span>Initiator</span><strong>{item.initiator||'—'}</strong></div><div><FileStack/><span>Documents</span><strong>{item.number_of_documents}</strong></div><div><Hash/><span>Workflow</span><strong>{item.workflow_number||'—'}</strong></div><div><Hash/><span>Transmittal</span><strong>{item.transmittal_number||'—'}</strong></div><div><Calendar/><span>Date</span><strong>{item.has_attachment?'Attachment':item.document_date}</strong></div><div><OctagonX/><span>Terminate Workflow</span><strong>{item.workflow_terminated?'Terminated':'Not terminated'}</strong></div></div>
    <section className="drawer-section attachment-section"><div><Paperclip/><div><h4>Has attachment</h4><p>Highlight this document and replace its date display with an attachment label.</p></div></div><label className="switch"><input type="checkbox" checked={item.has_attachment} onChange={e=>onUpdate({has_attachment:e.target.checked})}/><i/></label></section>
    <section className="drawer-section notes-section"><div className="section-heading"><h4>Notes</h4><button className="secondary-button" disabled={saving||notes===item.notes} onClick={()=>onUpdate({notes})}><Save/>Save notes</button></div><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add document control notes, decisions or follow-up context…"/></section>
    <section className={`drawer-section submission-slider-section ${item.is_abandoned?'disabled':''}`}>
      <div className="section-heading"><h4>Submission progress</h4><span>{item.is_abandoned?'Stopped':currentStep}</span></div>
      <div className="slider-summary"><strong>{Math.round(sliderValue/submissionSteps.length*100)}%</strong><span>{sliderValue} of {submissionSteps.length} stages completed</span></div>
      <input aria-label="Submission progress slider" type="range" min="0" max={submissionSteps.length} step="1" value={sliderValue} disabled={item.is_abandoned||saving} onChange={e=>setSliderValue(Number(e.target.value))} onPointerUp={e=>commitSlider(Number((e.target as HTMLInputElement).value))} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))commitSlider(Number((e.target as HTMLInputElement).value))}}/>
      <div className="slider-stages">{submissionSteps.map((step,index)=><span className={index<sliderValue?'done':index===sliderValue?'current':''} key={step}>{step}</span>)}</div>
    </section>
    <section className="drawer-section"><div className="section-heading"><h4>External feedback</h4><span>{item.feedback.Terminate?'Terminated':'Feedback progress'}</span></div><ProgressTrack steps={feedbackSteps} values={item.feedback} disabled={item.is_abandoned||item.feedback.Terminate} disabledLabel={item.is_abandoned?'Submission stopped':'Terminated'}/><div className="feedback-cards">{feedbackSteps.map(step=><div className={step==='Terminate'&&item.feedback.Terminate?'terminated':item.feedback[step]?'received':''} key={step}><strong>{step}</strong><span>{step==='Terminate'&&item.feedback.Terminate?'Terminated':item.feedback[step]?'Received':'Awaiting feedback'}</span></div>)}</div></section>
  </div></aside></div>
}
