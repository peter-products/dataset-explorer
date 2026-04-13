const DOMAIN_COLORS = {
  health: 'bg-red-100 text-red-800',
  education: 'bg-blue-100 text-blue-800',
  transportation: 'bg-amber-100 text-amber-800',
  environment: 'bg-green-100 text-green-800',
  finance: 'bg-emerald-100 text-emerald-800',
  public_safety: 'bg-orange-100 text-orange-800',
  elections: 'bg-purple-100 text-purple-800',
  labor: 'bg-cyan-100 text-cyan-800',
  demographics: 'bg-slate-100 text-slate-800',
  natural_resources: 'bg-lime-100 text-lime-800',
  technology: 'bg-violet-100 text-violet-800',
  legal: 'bg-gray-100 text-gray-800',
  energy: 'bg-yellow-100 text-yellow-800',
  agriculture: 'bg-teal-100 text-teal-800',
  housing: 'bg-rose-100 text-rose-800',
};

export default function DomainBadge({ domain, size = 'sm' }) {
  const colors = DOMAIN_COLORS[domain] || 'bg-gray-100 text-gray-700';
  const label = domain?.replace(/_/g, ' ') || 'unknown';
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';
  return (
    <span className={`font-medium rounded-full capitalize ${sizeClass} ${colors}`}>
      {label}
    </span>
  );
}

export { DOMAIN_COLORS };
