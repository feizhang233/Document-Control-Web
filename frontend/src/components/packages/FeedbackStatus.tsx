import { feedbackStatusLabels as defaultStatusLabels, feedbackSteps as defaultFeedbackSteps, type FeedbackStatusCode, type Package } from '../../types/package'

// Shared with the dashboard; the component export in this file is intentional.
// eslint-disable-next-line react-refresh/only-export-components
export function getEffectiveFeedbackStatus(item:Pick<Package,'feedback'|'feedback_status'>,reviewers:readonly string[]=defaultFeedbackSteps,statusLabels:Record<FeedbackStatusCode,string>=defaultStatusLabels){
  if(item.feedback.Terminate)return {code:'T',label:'Terminated'} as const
  const [first,second]=reviewers
  if(!item.feedback[first])return {code:'P',label:statusLabels.P} as const
  if(!item.feedback[second]){const code=item.feedback_status[first]||'P';return {code,label:statusLabels[code]} as const}
  const code=item.feedback_status[second]||'P';return {code,label:statusLabels[code]} as const
}

export function FeedbackStatus({item,compact=false,reviewers=defaultFeedbackSteps,statusLabels=defaultStatusLabels,statusColors}:{item:Pick<Package,'feedback'|'feedback_status'>;compact?:boolean;reviewers?:readonly string[];statusLabels?:Record<FeedbackStatusCode,string>;statusColors?:Record<FeedbackStatusCode,string>}){
  const status=getEffectiveFeedbackStatus(item,reviewers,statusLabels)
  const displayLabel=status.code==='T'?'Terminated':`${status.code} – ${status.label}`
  const color=status.code==='T'?undefined:statusColors?.[status.code]
  const style=color?{color,backgroundColor:`color-mix(in srgb, ${color} 14%, white)`}:undefined
  return <div className={`feedback-status-widget ${compact?'compact':''} ${item.feedback.Terminate?'terminated':''}`}><span className={`feedback-status-pill status-${status.code.toLowerCase()}`} style={style} title={displayLabel}>{displayLabel}</span><span className="feedback-stage-track">{reviewers.map(step=><i className={item.feedback.Terminate?'terminated':item.feedback[step]?'complete':''} key={step}/>)}</span></div>
}
