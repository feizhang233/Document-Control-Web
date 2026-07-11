import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, Download, FileJson, FileSpreadsheet, ListFilter, LoaderCircle, Plus, Save, Upload, Workflow, X } from 'lucide-react'
import { toast } from 'sonner'
import { getApiError, metadataApi, packagesApi, settingsApi } from '../lib/api'
import type { ColumnConfig, CsvImportRow, FeedbackStatusCode, MetadataBackup, WorkflowConfig } from '../types/package'

type ImportMode = 'merge'|'replace'
type CsvImportPreview = { fileName:string; rows:CsvImportRow[] }

export function SettingsPage() {
  const queryClient=useQueryClient()
  const inputRef=useRef<HTMLInputElement>(null)
  const csvInputRef=useRef<HTMLInputElement>(null)
  const [backup,setBackup]=useState<MetadataBackup|null>(null)
  const [csvImport,setCsvImport]=useState<CsvImportPreview|null>(null)
  const [fileName,setFileName]=useState('')
  const [mode,setMode]=useState<ImportMode>('merge')
  const [csvMode,setCsvMode]=useState<ImportMode>('merge')
  const configs=useQuery({queryKey:['column-configs'],queryFn:settingsApi.listColumns})
  const workflowConfig=useQuery({queryKey:['workflow-config'],queryFn:settingsApi.getWorkflow})
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
  const csvImportMutation=useMutation({mutationFn:()=>metadataApi.importCsv(csvImport!.rows,csvMode),onSuccess:result=>{
    toast.success(`CSV import complete: ${result.packages_created} created, ${result.packages_updated} updated`);setCsvImport(null);queryClient.invalidateQueries()
  },onError:e=>toast.error(getApiError(e))})
  const chooseFile=async(file?:File)=>{
    if(!file)return
    try{const parsed=JSON.parse(await file.text()) as MetadataBackup;if(parsed.format_version!=='1.0'||!Array.isArray(parsed.packages)||!Array.isArray(parsed.column_configs))throw new Error();setBackup(parsed);setFileName(file.name)}
    catch{setBackup(null);toast.error('This is not a valid DocFlow metadata backup')}
  }
  const chooseCsv=async(file?:File)=>{
    if(!file)return
    try{const rows=parseDocumentCsv(await file.text());setCsvImport({fileName:file.name,rows});setCsvMode('merge')}
    catch(error){setCsvImport(null);toast.error(error instanceof Error?error.message:'This is not a valid document CSV')}
  }
  return <><div className="page-header"><div><div className="breadcrumb">Document Control <span>/</span> Settings</div><h1>Settings</h1><p>Control data backups and how document metadata is entered.</p></div></div>
    <div className="settings-stack">
      <section className="settings-panel wide"><div className="settings-heading icon-heading"><span><FileJson/></span><div><h2>Metadata backup & restore</h2><p>Export all document metadata and field settings, or restore them from a DocFlow JSON backup.</p></div></div>
        <div className="backup-grid">
          <div className="backup-card"><div className="backup-icon blue"><Download/></div><div><h3>Export metadata</h3><p>Download a dated JSON snapshot containing all packages, progress, feedback and column settings.</p><small>Recommended before bulk changes</small></div><button className="secondary-button" disabled={exportMutation.isPending} onClick={()=>exportMutation.mutate()}>{exportMutation.isPending?<LoaderCircle className="spin"/>:<Download/>} Export backup</button></div>
          <div className="backup-card"><div className="backup-icon green"><FileSpreadsheet/></div><div><h3>Export document CSV</h3><p>Download document metadata for reporting and review outside DocFlow.</p><small>Includes lifecycle and attachment fields</small></div><button className="secondary-button" disabled={csvMutation.isPending} onClick={()=>csvMutation.mutate()}>{csvMutation.isPending?<LoaderCircle className="spin"/>:<Download/>} Export CSV</button></div>
          <div className="backup-card"><div className="backup-icon purple"><Upload/></div><div><h3>Import metadata</h3><p>Merge into current data or replace the complete register from a DocFlow JSON backup.</p><small>Restores documents and settings</small></div><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={e=>chooseFile(e.target.files?.[0])}/><button className="secondary-button" onClick={()=>inputRef.current?.click()}><Upload/> Choose JSON</button></div>
          <div className="backup-card"><div className="backup-icon green"><FileSpreadsheet/></div><div><h3>Import document CSV</h3><p>Import exported CSV data, or a spreadsheet prepared with the same column headers.</p><small>Supports merge and replace modes</small></div><input ref={csvInputRef} hidden type="file" accept="text/csv,.csv" onChange={e=>chooseCsv(e.target.files?.[0])}/><button className="secondary-button" onClick={()=>csvInputRef.current?.click()}><Upload/> Choose CSV</button></div>
        </div>
        {backup&&<div className="import-review"><div className="file-summary"><FileJson/><div><strong>{fileName}</strong><span>{backup.packages.length} documents · {backup.column_configs.length} field settings</span></div><button onClick={()=>{setBackup(null);setFileName('')}}><X/></button></div><label><span>Import behaviour</span><select value={mode} onChange={e=>setMode(e.target.value as 'merge'|'replace')}><option value="merge">Merge — update matching document numbers and add new records</option><option value="replace">Replace — delete current records, then restore this backup</option></select></label><button className="primary-button" disabled={importMutation.isPending} onClick={()=>importMutation.mutate()}>{importMutation.isPending?<LoaderCircle className="spin"/>:<Check/>} Confirm import</button></div>}
        {csvImport&&<div className="import-review csv-import-review"><div className="file-summary"><FileSpreadsheet/><div><strong>{csvImport.fileName}</strong><span>{csvImport.rows.length} document rows · CSV data import</span></div><button onClick={()=>setCsvImport(null)}><X/></button></div><label><span>Import behaviour</span><select value={csvMode} onChange={e=>setCsvMode(e.target.value as ImportMode)}><option value="merge">Merge — update matching document numbers and add new records</option><option value="replace">Replace — delete current records, then import this CSV</option></select></label><button className="primary-button" disabled={csvImportMutation.isPending} onClick={()=>csvImportMutation.mutate()}>{csvImportMutation.isPending?<LoaderCircle className="spin"/>:<Check/>} Confirm CSV import</button></div>}
      </section>
      <section className="settings-panel wide"><div className="settings-heading icon-heading"><span><Workflow/></span><div><h2>Workflow structure</h2><p>Edit the six Submission Progress stages, their order, the two Feedback reviewers and status labels.</p></div></div>
        {workflowConfig.isLoading?<div className="config-loading"><LoaderCircle className="spin"/> Loading workflow settings…</div>:workflowConfig.data?<WorkflowConfigEditor config={workflowConfig.data} onSaved={()=>{queryClient.invalidateQueries({queryKey:['workflow-config']});queryClient.invalidateQueries({queryKey:['packages']});queryClient.invalidateQueries({queryKey:['dashboard-packages']})}}/>:<div className="config-note"><strong>Workflow settings unavailable</strong><span>{workflowConfig.error?getApiError(workflowConfig.error):'Please refresh and try again.'}</span></div>}
      </section>
      <section className="settings-panel wide"><div className="settings-heading icon-heading"><span><ListFilter/></span><div><h2>Column input design</h2><p>Choose whether each basic-information field is free text or a controlled dropdown, then define its available options.</p></div></div>
        <div className="config-table-head"><span>Column</span><span>Input type</span><span>Dropdown options</span><span/></div>
        <div className="config-list">{configs.isLoading?<div className="config-loading"><LoaderCircle className="spin"/> Loading field settings…</div>:configs.data?.map(config=><ColumnConfigRow key={config.field_name} config={config} onSaved={()=>queryClient.invalidateQueries({queryKey:['column-configs']})}/>)}</div>
        <div className="config-note"><strong>How this works</strong><span>Changes apply to the create and edit form immediately. Existing metadata remains unchanged even if an option is removed.</span></div>
      </section>
    </div>
  </>
}

const csvColumns = new Set(['document_number','document_date','document_type','initiator','discipline','number_of_documents','transmittal_number','workflow_number','workflow_terminated','has_attachment','is_abandoned','notes'])

function parseCsv(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false
  for(let index=0;index<text.length;index+=1){
    const char=text[index]
    if(quoted){if(char==='"'&&text[index+1]==='"'){cell+='"';index+=1}else if(char==='"')quoted=false;else cell+=char;continue}
    if(char==='"'){quoted=true;continue}
    if(char===','){row.push(cell);cell='';continue}
    if(char==='\n'){row.push(cell);rows.push(row);row=[];cell='';continue}
    if(char!=='\r')cell+=char
  }
  if(quoted)throw new Error('CSV contains an unmatched quote')
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows
}

function parseBoolean(value:string,field:string,row:number){
  if(!value.trim())return undefined
  const normalized=value.trim().toLowerCase()
  if(['true','1','yes'].includes(normalized))return true
  if(['false','0','no'].includes(normalized))return false
  throw new Error(`Row ${row}: ${field} must be true/false, yes/no, or 1/0`)
}

function parseDocumentCsv(text:string):CsvImportRow[]{
  const records=parseCsv(text)
  if(records.length<2)throw new Error('CSV must include a header row and at least one document')
  const headers=records[0].map((value,index)=>(index===0?value.replace(/^\uFEFF/,''):value).trim().toLowerCase())
  if(new Set(headers).size!==headers.length)throw new Error('CSV header contains duplicate column names')
  if(!headers.includes('document_number'))throw new Error('CSV must include the document_number column')
  if(!headers.some(header=>csvColumns.has(header)))throw new Error('CSV has no supported document columns')
  const rows=records.slice(1).filter(record=>record.some(value=>value.trim()))
  if(!rows.length)throw new Error('CSV does not contain any document rows')
  return rows.map((record,rowIndex)=>{
    const cells=Object.fromEntries(headers.map((header,index)=>[header,record[index]??'']))
    const has=(field:string)=>headers.includes(field)
    const textValue=(field:string)=>cells[field].trim()
    const value:CsvImportRow={}
    for(const field of ['document_number','document_date','document_type','initiator','discipline','notes'] as const)if(has(field))value[field]=field==='notes'?cells[field]:textValue(field)
    for(const field of ['transmittal_number','workflow_number'] as const)if(has(field))value[field]=textValue(field)||null
    if(has('number_of_documents')&&textValue('number_of_documents')){const number=Number(textValue('number_of_documents'));if(!Number.isInteger(number)||number<1)throw new Error(`Row ${rowIndex+2}: number_of_documents must be a positive integer`);value.number_of_documents=number}
    for(const field of ['workflow_terminated','has_attachment','is_abandoned'] as const)if(has(field)){const parsed=parseBoolean(cells[field],field,rowIndex+2);if(parsed!==undefined)value[field]=parsed}
    return value
  })
}

function WorkflowConfigEditor({config,onSaved}:{config:WorkflowConfig;onSaved:()=>void}){
  const [steps,setSteps]=useState([...config.submission_steps])
  const [reviewers,setReviewers]=useState([...config.feedback_reviewers])
  const [labels,setLabels]=useState({...config.feedback_status_labels})
  useEffect(()=>{setSteps([...config.submission_steps]);setReviewers([...config.feedback_reviewers]);setLabels({...config.feedback_status_labels})},[config])
  const move=(index:number,direction:-1|1)=>setSteps(previous=>{const next=[...previous];const target=index+direction;if(target<0||target>=next.length)return previous;[next[index],next[target]]=[next[target],next[index]];return next})
  const save=useMutation({mutationFn:()=>settingsApi.updateWorkflow({submission_steps:steps,feedback_reviewers:reviewers,feedback_status_labels:labels}),onSuccess:()=>{toast.success('Workflow structure updated');onSaved()},onError:e=>toast.error(getApiError(e))})
  const invalid=[...steps,...reviewers,...Object.values(labels)].some(value=>!value.trim())||new Set(steps.map(value=>value.trim().toLowerCase())).size!==steps.length||new Set(reviewers.map(value=>value.trim().toLowerCase())).size!==reviewers.length
  return <div className="workflow-config-editor">
    <div className="workflow-config-block"><div className="workflow-config-title"><div><strong>Submission Progress</strong><span>Exactly six stages. Use arrows to change the sequence.</span></div><small>6 stages</small></div><div className="workflow-step-list">{steps.map((step,index)=><div className="workflow-step-row" key={index}><b>{index+1}</b><input aria-label={`Submission step ${index+1}`} value={step} onChange={event=>setSteps(previous=>previous.map((value,i)=>i===index?event.target.value:value))}/><button type="button" disabled={index===0} onClick={()=>move(index,-1)} aria-label="Move stage up"><ArrowUp/></button><button type="button" disabled={index===steps.length-1} onClick={()=>move(index,1)} aria-label="Move stage down"><ArrowDown/></button></div>)}</div></div>
    <div className="workflow-config-side"><div className="workflow-config-block"><div className="workflow-config-title"><div><strong>Feedback reviewers</strong><span>Names shown in Feedback progress.</span></div></div><div className="workflow-reviewer-list">{reviewers.map((reviewer,index)=><label key={index}><span>Reviewer {index+1}</span><input value={reviewer} onChange={event=>setReviewers(previous=>previous.map((value,i)=>i===index?event.target.value:value))}/></label>)}</div></div>
    <div className="workflow-config-block"><div className="workflow-config-title"><div><strong>Feedback status labels</strong><span>Codes remain fixed for API compatibility.</span></div></div><div className="workflow-status-list">{(['A','B','C','P'] as FeedbackStatusCode[]).map(code=><label key={code}><b>{code}</b><input value={labels[code]} onChange={event=>setLabels(previous=>({...previous,[code]:event.target.value}))}/></label>)}</div></div></div>
    <div className="workflow-config-actions"><p>Existing document progress is preserved by stage/reviewer position when names change.</p><button className="primary-button" disabled={save.isPending||invalid} onClick={()=>save.mutate()}>{save.isPending?<LoaderCircle className="spin"/>:<Save/>} Save workflow structure</button></div>
  </div>
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
