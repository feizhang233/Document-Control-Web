import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, FileJson, FileSpreadsheet, ListFilter, LoaderCircle, Plus, Save, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { getApiError, metadataApi, packagesApi, settingsApi } from '../lib/api'
import type { ColumnConfig, MetadataBackup } from '../types/package'

export function SettingsPage() {
  const queryClient=useQueryClient()
  const inputRef=useRef<HTMLInputElement>(null)
  const [backup,setBackup]=useState<MetadataBackup|null>(null)
  const [fileName,setFileName]=useState('')
  const [mode,setMode]=useState<'merge'|'replace'>('merge')
  const configs=useQuery({queryKey:['column-configs'],queryFn:settingsApi.listColumns})
  const exportMutation=useMutation({mutationFn:metadataApi.export,onSuccess:data=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a')
    a.href=url;a.download=`docflow-metadata-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast.success('Metadata backup exported')
  },onError:e=>toast.error(getApiError(e))})
  const csvMutation=useMutation({mutationFn:()=>packagesApi.list({period:'all',page_size:200}),onSuccess:data=>{
    const keys=['document_number','document_date','document_type','initiator','discipline','number_of_documents','transmittal_number','workflow_number','workflow_terminated','has_attachment','is_abandoned','notes'] as const
    const csv=[keys.join(','),...data.items.map(row=>keys.map(key=>`"${String(row[key]??'').replaceAll('"','""')}"`).join(','))].join('\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`docflow-documents-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast.success('Document CSV exported')
  },onError:e=>toast.error(getApiError(e))})
  const importMutation=useMutation({mutationFn:()=>metadataApi.import(backup!,mode),onSuccess:result=>{
    toast.success(`Import complete: ${result.packages_created} created, ${result.packages_updated} updated`);setBackup(null);setFileName('');queryClient.invalidateQueries()
  },onError:e=>toast.error(getApiError(e))})
  const chooseFile=async(file?:File)=>{
    if(!file)return
    try{const parsed=JSON.parse(await file.text()) as MetadataBackup;if(parsed.format_version!=='1.0'||!Array.isArray(parsed.packages)||!Array.isArray(parsed.column_configs))throw new Error();setBackup(parsed);setFileName(file.name)}
    catch{setBackup(null);toast.error('This is not a valid DocFlow metadata backup')}
  }
  return <><div className="page-header"><div><div className="breadcrumb">Document Control <span>/</span> Settings</div><h1>Settings</h1><p>Control data backups and how document metadata is entered.</p></div></div>
    <div className="settings-stack">
      <section className="settings-panel wide"><div className="settings-heading icon-heading"><span><FileJson/></span><div><h2>Metadata backup & restore</h2><p>Export all document metadata and field settings, or restore them from a DocFlow JSON backup.</p></div></div>
        <div className="backup-grid">
          <div className="backup-card"><div className="backup-icon blue"><Download/></div><div><h3>Export metadata</h3><p>Download a dated JSON snapshot containing all packages, progress, feedback and column settings.</p><small>Recommended before bulk changes</small></div><button className="secondary-button" disabled={exportMutation.isPending} onClick={()=>exportMutation.mutate()}>{exportMutation.isPending?<LoaderCircle className="spin"/>:<Download/>} Export backup</button></div>
          <div className="backup-card"><div className="backup-icon green"><FileSpreadsheet/></div><div><h3>Export document CSV</h3><p>Download document metadata for reporting and review outside DocFlow.</p><small>Includes lifecycle and attachment fields</small></div><button className="secondary-button" disabled={csvMutation.isPending} onClick={()=>csvMutation.mutate()}>{csvMutation.isPending?<LoaderCircle className="spin"/>:<Download/>} Export CSV</button></div>
          <div className="backup-card"><div className="backup-icon purple"><Upload/></div><div><h3>Import metadata</h3><p>Merge into current data or replace the complete document register from a backup.</p><small>Only DocFlow JSON format 1.0</small></div><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={e=>chooseFile(e.target.files?.[0])}/><button className="secondary-button" onClick={()=>inputRef.current?.click()}><Upload/> Choose file</button></div>
        </div>
        {backup&&<div className="import-review"><div className="file-summary"><FileJson/><div><strong>{fileName}</strong><span>{backup.packages.length} documents · {backup.column_configs.length} field settings</span></div><button onClick={()=>{setBackup(null);setFileName('')}}><X/></button></div><label><span>Import behaviour</span><select value={mode} onChange={e=>setMode(e.target.value as 'merge'|'replace')}><option value="merge">Merge — update matching document numbers and add new records</option><option value="replace">Replace — delete current records, then restore this backup</option></select></label><button className="primary-button" disabled={importMutation.isPending} onClick={()=>importMutation.mutate()}>{importMutation.isPending?<LoaderCircle className="spin"/>:<Check/>} Confirm import</button></div>}
      </section>
      <section className="settings-panel wide"><div className="settings-heading icon-heading"><span><ListFilter/></span><div><h2>Column input design</h2><p>Choose whether each basic-information field is free text or a controlled dropdown, then define its available options.</p></div></div>
        <div className="config-table-head"><span>Column</span><span>Input type</span><span>Dropdown options</span><span/></div>
        <div className="config-list">{configs.isLoading?<div className="config-loading"><LoaderCircle className="spin"/> Loading field settings…</div>:configs.data?.map(config=><ColumnConfigRow key={config.field_name} config={config} onSaved={()=>queryClient.invalidateQueries({queryKey:['column-configs']})}/>)}</div>
        <div className="config-note"><strong>How this works</strong><span>Changes apply to the create and edit form immediately. Existing metadata remains unchanged even if an option is removed.</span></div>
      </section>
    </div>
  </>
}

function ColumnConfigRow({config,onSaved}:{config:ColumnConfig;onSaved:()=>void}){
  const [type,setType]=useState(config.input_type)
  const [options,setOptions]=useState(config.options)
  const [draft,setDraft]=useState('')
  useEffect(()=>{setType(config.input_type);setOptions(config.options)},[config])
  const save=useMutation({mutationFn:()=>settingsApi.updateColumn(config.field_name,{input_type:type,options}),onSuccess:()=>{toast.success(`${config.display_name} input updated`);onSaved()},onError:e=>toast.error(getApiError(e))})
  const add=()=>{const value=draft.trim();if(value&&!options.includes(value))setOptions([...options,value]);setDraft('')}
  return <div className="config-row"><div className="config-name"><strong>{config.display_name}</strong><code>{config.field_name}</code></div><div className="type-toggle"><button className={type==='text'?'active':''} onClick={()=>setType('text')}>Text</button><button className={type==='select'?'active':''} onClick={()=>setType('select')}>Dropdown</button></div><div className={`option-editor ${type==='text'?'disabled':''}`}><div className="option-chips">{options.map(option=><span key={option}>{option}<button onClick={()=>setOptions(options.filter(v=>v!==option))}><X/></button></span>)}</div>{type==='select'&&<div className="option-input"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}} placeholder="Add an option"/><button onClick={add}><Plus/></button></div>}</div><button className="save-config" disabled={save.isPending||(type==='select'&&!options.length)} onClick={()=>save.mutate()}>{save.isPending?<LoaderCircle className="spin"/>:<Save/>}</button></div>
}
