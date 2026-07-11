import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, Files, Send, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { packagesApi, settingsApi } from '../lib/api'
import { feedbackSteps, submissionSteps } from '../types/package'

export function DashboardPage() {
  const { data } = useQuery({ queryKey:['dashboard-packages'], queryFn:()=>packagesApi.list({period:'all',page_size:100}) })
  const {data:workflowConfig}=useQuery({queryKey:['workflow-config'],queryFn:settingsApi.getWorkflow})
  const currentSubmissionSteps=workflowConfig?.submission_steps||submissionSteps
  const currentFeedbackReviewers=workflowConfig?.feedback_reviewers||feedbackSteps
  const items = data?.items || []
  const complete = items.filter(p=>currentSubmissionSteps.every(s=>p.submission_progress[s])).length
  const feedbackPending = items.filter(p=>!p.feedback.Terminate && currentFeedbackReviewers.some(step=>!p.feedback[step])).length
  const active = items.length-complete
  const recent = items.slice(0,5)
  return <>
    <div className="page-header dashboard-heading"><div><div className="breadcrumb">Saturday, 11 July 2026</div><h1>Good morning, Zhang</h1><p>Here’s what needs attention across your document workflows.</p></div><Link className="primary-button" to="/documents/week">Open register <ArrowRight size={16}/></Link></div>
    <div className="metric-grid">
      <Metric icon={<Files/>} tone="blue" label="Total documents" value={items.length} note="Across all disciplines"/>
      <Metric icon={<Clock3/>} tone="amber" label="Active workflows" value={active} note="In submission process"/>
      <Metric icon={<CheckCircle2/>} tone="green" label="Completed" value={complete} note="Fully registered & backed up"/>
      <Metric icon={<FileCheck2/>} tone="purple" label="Awaiting feedback" value={feedbackPending} note={`${currentFeedbackReviewers.join(' or ')} pending`}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent documents</h2><p>Latest activity across the register</p></div><Link to="/documents/week">View all <ArrowRight size={14}/></Link></div><div className="activity-list">{recent.map((p,i)=><Link to={`/documents/${i<3?'week':'all'}`} key={p.id}><div className="activity-icon"><FileCheck2/></div><div><strong>{p.document_number}</strong><span>{p.document_type} · {p.discipline} · {p.document_date}</span></div><div className="activity-meta"><strong>{currentSubmissionSteps.filter(s=>p.submission_progress[s]).length}/{currentSubmissionSteps.length}</strong><span>steps</span></div></Link>)}{!recent.length && <div className="mini-empty">No document activity yet.</div>}</div></section>
      <section className="panel overview-panel"><div className="panel-heading"><div><h2>Workflow overview</h2><p>Current submission health</p></div><span className="trend"><TrendingUp size={14}/> Live</span></div><div className="donut-wrap"><div className="donut" style={{'--progress': `${items.length ? Math.round(complete/items.length*100) : 0}%`} as React.CSSProperties}><div><strong>{items.length ? Math.round(complete/items.length*100) : 0}%</strong><span>complete</span></div></div><div className="donut-legend"><div><i className="blue"/><span>In progress</span><strong>{active}</strong></div><div><i className="green"/><span>Completed</span><strong>{complete}</strong></div><div><i className="amber"/><span>Feedback due</span><strong>{feedbackPending}</strong></div></div></div><Link className="panel-action" to="/workflow"><Send size={16}/> Review workflow register <ArrowRight size={15}/></Link></section>
    </div>
  </>
}

function Metric({icon,tone,label,value,note}:{icon:React.ReactNode;tone:string;label:string;value:number;note:string}) { return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }
