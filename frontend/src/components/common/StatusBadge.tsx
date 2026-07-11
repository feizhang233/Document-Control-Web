export function StatusBadge({ status }: { status: string }) {
  const tone = status.toLowerCase().includes('drawing') ? 'blue' : status.toLowerCase().includes('report') ? 'purple' : 'neutral'
  return <span className={`badge ${tone}`}>{status}</span>
}
