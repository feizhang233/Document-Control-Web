import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, Files, History, Send, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { notificationsApi, packagesApi, settingsApi } from '../lib/api'
import { getEffectiveFeedbackStatus } from '../components/packages/FeedbackStatus'
import { feedbackStatusLabels, feedbackSteps, submissionSteps, type FeedbackStatusCode } from '../types/package'

const defaultColors:Record<FeedbackStatusCode,string>={A:'#21815d',B:'#9b6816',C:'#b13f4c',P:'#4267bd'}

export function DashboardPage() {
  const {data}=useQuery({queryKey:['dashboard-packages'],queryFn:()=>packagesApi.listAll({period:'all'})})
  const {data:workflowConfig}=useQuery({queryKey:['workflow-config'],queryFn:settingsApi.getWorkflow})
  const {data:notifications}=useQuery({queryKey:['notifications','dashboard'],queryFn:()=>notificationsApi.list(100),refetchInterval:30_000})
  const currentSubmissionSteps=workflowConfig?.submission_steps||submissionSteps
  const currentFeedbackReviewers=workflowConfig?.feedback_reviewers||feedbackSteps
  const statusLabels=workflowConfig?.feedback_status_labels||feedbackStatusLabels
  const statusColors=workflowConfig?.feedback_status_colors||defaultColors
  const items=data?.items||[]
  const complete=items.filter(item=>currentSubmissionSteps.every(step=>item.submission_progress[step])).length
  const feedbackPending=items.filter(item=>!item.feedback.Terminate&&currentFeedbackReviewers.some(step=>!item.feedback[step])).length
  const active=items.length-complete
  const [utiberReviewer='UTIBER',gdsReviewer='GDS']=currentFeedbackReviewers
  const approvalFinished=(item:typeof items[number],reviewer:string)=>['A','B','C'].includes(item.feedback_status[reviewer]||'P')
  const terminated=items.filter(item=>item.feedback.Terminate).length
  const gdsCompleted=items.filter(item=>!item.feedback.Terminate&&approvalFinished(item,gdsReviewer)).length
  const utiberCompleted=items.filter(item=>!item.feedback.Terminate&&!approvalFinished(item,gdsReviewer)&&approvalFinished(item,utiberReviewer)).length
  const awaitingApproval=items.length-terminated-gdsCompleted-utiberCompleted
  const gdsCompletionRate=items.length?Math.round(gdsCompleted/items.length*100):0
  const pending=items.filter(item=>!item.is_abandoned&&!currentSubmissionSteps.every(step=>item.submission_progress[step])).sort((left,right)=>completedSteps(right,currentSubmissionSteps)-completedSteps(left,currentSubmissionSteps)).slice(0,6)
  const today=new Date()
  const todayChanges=(notifications?.items||[]).filter(item=>new Date(item.created_at).toDateString()===today.toDateString()).filter((item,index,array)=>array.findIndex(candidate=>(candidate.workflow_number||candidate.document_number)===(item.workflow_number||item.document_number))===index).slice(0,6)
  const statusCounts={A:0,B:0,C:0,P:0,T:0}
  for(const item of items)statusCounts[getEffectiveFeedbackStatus(item,currentFeedbackReviewers,statusLabels).code]+=1
  const statusRows=(['A','B','C','P','T'] as const).map(code=>({code,label:code==='T'?'Terminated':statusLabels[code],count:statusCounts[code],color:code==='T'?'#737b88':statusColors[code]}))
  let offset=0
  const statusGradient=items.length?`conic-gradient(${statusRows.map(row=>{const start=offset;offset+=row.count/items.length*100;return `${row.color} ${start}% ${offset}%`}).join(',')})`:'#e7ebf1'
  const dateLabel=today.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  return <>
    <div className="page-header dashboard-heading"><div><div className="breadcrumb">{dateLabel}</div><h1>Good morning, Zhang</h1><p>Here’s what needs attention across your document workflows.</p></div><Link className="primary-button" to="/documents/week">Open register <ArrowRight size={16}/></Link></div>
    <div className="metric-grid">
      <Metric icon={<Files/>} tone="blue" label="Total documents" value={data?.total||0} note="Across the complete register"/>
      <Metric icon={<Clock3/>} tone="amber" label="Active workflows" value={active} note="In submission process"/>
      <Metric icon={<CheckCircle2/>} tone="green" label="Completed" value={complete} note="All submission stages complete"/>
      <Metric icon={<FileCheck2/>} tone="purple" label="Awaiting feedback" value={feedbackPending} note={`${currentFeedbackReviewers.join(' or ')} pending`}/>
    </div>

    <div className="dashboard-row dashboard-row-primary">
      <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Documents to complete</h2><p>Outstanding Submission Progress work</p></div><Link to="/documents/all">View all <ArrowRight size={14}/></Link></div><div className="dashboard-list">{pending.map(item=>{const done=completedSteps(item,currentSubmissionSteps);const next=currentSubmissionSteps.find(step=>!item.submission_progress[step]);return <Link to="/documents/all" key={item.id}><div className="activity-icon"><Clock3/></div><div><strong>{item.document_number}</strong><span>{item.document_title||item.document_type} · Next: {next||'Complete'}</span><div className="mini-progress"><i style={{width:`${done/currentSubmissionSteps.length*100}%`}}/></div></div><div className="activity-meta"><strong>{done}/{currentSubmissionSteps.length}</strong><span>steps</span></div></Link>})}{!pending.length&&<div className="mini-empty"><CheckCircle2/>All documents have completed Submission Progress.</div>}</div></section>
      <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Workflow changes today</h2><p>Updates received since midnight</p></div><span className="trend"><History size={14}/> {todayChanges.length} today</span></div><div className="dashboard-list workflow-change-list">{todayChanges.map(item=><Link to="/workflow" key={item.id}><div className="activity-icon green"><History/></div><div><strong>{item.workflow_number||'Workflow not assigned'}</strong><span>{item.message}</span></div><div className="activity-meta"><strong>{new Date(item.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</strong><span>{item.document_number||'document'}</span></div></Link>)}{!todayChanges.length&&<div className="mini-empty"><History/>No workflow changes recorded today.</div>}</div></section>
    </div>

    <div className="dashboard-row dashboard-row-secondary">
      <section className="panel dashboard-panel status-panel"><div className="panel-heading"><div><h2>Workflow status</h2><p>Feedback status distribution across all documents</p></div><span className="trend"><TrendingUp size={14}/> Live</span></div><div className="status-overview"><div className="status-donut" style={{background:statusGradient}}><div><strong>{items.length}</strong><span>workflows</span></div></div><div className="status-legend">{statusRows.map(row=><div key={row.code}><i style={{background:row.color}}/><b>{row.code}</b><span>{row.label}</span><strong>{items.length?Math.round(row.count/items.length*100):0}%</strong><small>{row.count}</small></div>)}</div></div><Link className="panel-action" to="/workflow"><Send/> Review status details <ArrowRight/></Link></section>
      <section className="panel dashboard-panel overview-panel"><div className="panel-heading"><div><h2>Workflow overview</h2><p>Current approval progress</p></div><span className="trend"><TrendingUp size={14}/> Live</span></div><div className="donut-wrap"><div className="donut" style={{'--progress':`${gdsCompletionRate}%`,'--progress-color':'#32a87b'} as React.CSSProperties}><div><strong>{gdsCompletionRate}%</strong><span>GDS completed</span></div></div><div className="donut-legend"><div><i className="green"/><span>GDS completed (A/B/C)</span><strong>{gdsCompleted}</strong></div><div><i className="blue"/><span>UTIBER completed</span><strong>{utiberCompleted}</strong></div><div><i className="amber"/><span>Awaiting approval</span><strong>{awaitingApproval}</strong></div><div><i className="grey"/><span>Terminate</span><strong>{terminated}</strong></div></div></div><Link className="panel-action" to="/workflow"><Send/> Review workflow register <ArrowRight/></Link></section>
    </div>
  </>
}

function completedSteps(item:{submission_progress:Record<string,boolean>},steps:readonly string[]){return steps.filter(step=>item.submission_progress[step]).length}
function Metric({icon,tone,label,value,note}:{icon:React.ReactNode;tone:string;label:string;value:number;note:string}){return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
