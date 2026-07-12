import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, RefreshCw, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useDismissableLayer } from '../../hooks/useDismissableLayer'
import { notificationsApi } from '../../lib/api'

export function NotificationsPopover({open,onToggle,onClose}:{open:boolean;onToggle:()=>void;onClose:()=>void}){
  const navigate=useNavigate();const queryClient=useQueryClient()
  const popoverRef=useDismissableLayer<HTMLDivElement>(open,onClose)
  const query=useQuery({queryKey:['notifications'],queryFn:()=>notificationsApi.list(),refetchInterval:30_000})
  const refresh=()=>queryClient.invalidateQueries({queryKey:['notifications']})
  const mark=useMutation({mutationFn:notificationsApi.markRead,onSuccess:refresh})
  const markAll=useMutation({mutationFn:notificationsApi.markAllRead,onSuccess:refresh})
  const clear=useMutation({mutationFn:notificationsApi.clear,onSuccess:refresh})
  const unread=query.data?.unread_count||0
  return <div className="notification-center" ref={popoverRef}><button className={`icon-button ${unread?'has-indicator':''}`} onClick={onToggle} aria-label={`Notifications${unread?` (${unread} unread)`:''}`}><Bell size={19}/>{unread>0&&<span className="notification-count">{unread>9?'9+':unread}</span>}</button>{open&&<div className="notification-popover"><header><div><strong>Notifications</strong><span>{unread?`${unread} workflow updates unread`:'You’re all caught up'}</span></div><div className="notification-header-actions">{unread>0&&<button onClick={()=>markAll.mutate()}><CheckCheck/> Read all</button>}{!!query.data?.items.length&&<button className="danger" disabled={clear.isPending} onClick={()=>{if(window.confirm('Clear all notifications? This cannot be undone.'))clear.mutate()}}><Trash2/> Clear</button>}</div></header><div className="notification-list">{query.isLoading?<div className="notification-state"><RefreshCw className="spin"/>Loading updates…</div>:!query.data?.items.length?<div className="notification-state"><Bell/>No workflow updates yet</div>:query.data.items.map(item=><button key={item.id} className={item.is_read?'':'unread'} onClick={()=>{if(!item.is_read)mark.mutate(item.id);navigate('/workflow');onClose()}}><i/><div><strong>{item.title}</strong><p>{item.message}</p><span>{formatDistanceToNow(new Date(item.created_at),{addSuffix:true})}{item.document_number?` · ${item.document_number}`:''}</span></div></button>)}</div><footer>Workflow updates refresh automatically every 30 seconds.</footer></div>}</div>
}
