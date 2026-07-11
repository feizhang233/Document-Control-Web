export function StatusBadge({ status, color }: { status: string; color?:string }) {
  const tone = status.toLowerCase().includes('drawing') ? 'blue' : status.toLowerCase().includes('report') ? 'purple' : 'neutral'
  const style=color?{color,backgroundColor:`color-mix(in srgb, ${color} 14%, white)`,borderColor:`color-mix(in srgb, ${color} 28%, white)`}:undefined
  return <span className={`badge ${tone}`} style={style}>{status}</span>
}
