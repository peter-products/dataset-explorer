// SchemaFinder logo — magnifying glass with schema table lines inside the lens
export function LogoIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Lens circle */}
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.9" />
      {/* Handle */}
      <line x1="21.5" y1="21.5" x2="29" y2="29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Schema lines inside lens — three rows like a table */}
      <line x1="8.5" y1="10" x2="19.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="8.5" y1="14" x2="19.5" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="8.5" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Column divider */}
      <line x1="13" y1="8" x2="13" y2="20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function LogoFull({ size = 'md', className = '' }) {
  const textSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base';
  const iconSize = size === 'lg' ? 28 : size === 'md' ? 22 : 18;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoIcon size={iconSize} className="text-blue-600" />
      <span className={`font-bold tracking-tight ${textSize}`}>
        <span className="text-blue-700">Schema</span><span className="text-gray-900">Finder</span>
      </span>
    </span>
  );
}
