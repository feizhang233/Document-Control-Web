import { submissionSteps as defaultSubmissionSteps } from '../../types/package'

export function SubmissionSlider({value,steps=defaultSubmissionSteps,onChange,onCommit,disabled=false}:{value:number;steps?:readonly string[];onChange:(value:number)=>void;onCommit?:(value:number)=>void;disabled?:boolean}){
  const current=value>=steps.length?'Complete':steps[value]
  const following=value+1>=steps.length?'Complete':steps[value+1]
  return <div className={`submission-slider ${disabled?'disabled':''}`}>
    <div className="slider-summary"><strong>{Math.round(value/steps.length*100)}%</strong><span>{value} of {steps.length} stages completed</span></div>
    <input aria-label="Submission progress slider" type="range" min="0" max={steps.length} step="1" value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} onPointerUp={e=>onCommit?.(Number((e.target as HTMLInputElement).value))} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))onCommit?.(Number((e.target as HTMLInputElement).value))}}/>
    <div className="slider-ticks">{Array.from({length:steps.length+1},(_,index)=><i className={index<=value?'active':''} key={index}/>)}</div>
    <div className="slider-position"><div><span>Current step</span><strong>{current}</strong></div><div><span>Following step</span><strong>{following}</strong></div></div>
  </div>
}
