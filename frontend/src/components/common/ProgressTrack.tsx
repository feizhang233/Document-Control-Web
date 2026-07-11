export function ProgressTrack({steps,values,compact=false,terminated={},disabled=false,disabledLabel='Submission stopped',onAdvance}:{steps:readonly string[];values:Record<string,boolean>;compact?:boolean;terminated?:Record<string,boolean>;disabled?:boolean;disabledLabel?:string;onAdvance?:()=>void}){
  const completed=steps.filter(step=>values[step]).length
  const percent=Math.round((completed/steps.length)*100)
  const current=steps.find(step=>!values[step]&&!terminated[step])
  const label=disabled?disabledLabel:current||'Complete'
  const canAdvance=!!onAdvance&&!disabled&&!!current
  return <button type="button" className={`progress-widget ${compact?'compact':''} ${disabled?'disabled':''} ${canAdvance?'interactive':''}`} title={canAdvance?`Advance ${current}`:label} disabled={!canAdvance} onClick={event=>{event.stopPropagation();onAdvance?.()}}>
    <span className="progress-summary"><span>{label}</span><strong>{disabled?'Stopped':`${percent}%`}</strong></span>
    <span className="segmented-track">{steps.map(step=><span key={step} className={`${values[step]?'complete':''} ${terminated[step]?'terminated':''}`} aria-label={`${step}: ${terminated[step]?'terminated':values[step]?'complete':'pending'}`}/>)}</span>
  </button>
}
