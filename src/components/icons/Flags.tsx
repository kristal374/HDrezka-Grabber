export function FlagIcon({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  switch (country) {
    case 'ua':
      return <FlagUA className={className} />;
    case 'kz':
      return <FlagKZ className={className} />;
    case 'by':
      return <FlagBY className={className} />;
    default:
      return null;
  }
}

export function FlagUA({ className }: { className?: string }) {
  return (
    <svg
      width='16'
      height='11'
      viewBox='0 0 16 11'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <rect width='16' height='5.5' fill='#005BBB' />
      <rect y='5.5' width='16' height='5.5' fill='#FFD500' />
    </svg>
  );
}

export function FlagKZ({ className }: { className?: string }) {
  return (
    <svg
      width='16'
      height='11'
      viewBox='0 0 16 11'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <rect width='16' height='11' fill='#00AFCA' />
      <circle cx='8' cy='5.5' r='3' fill='#FFC627' />
    </svg>
  );
}

export function FlagBY({ className }: { className?: string }) {
  return (
    <svg
      width='16'
      height='11'
      viewBox='0 0 16 11'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <rect width='2' height='11' fill='#FFFFFF' />
      <rect x='2' width='14' height='7.5' fill='#D22730' />
      <rect x='2' y='7.5' width='14' height='3.5' fill='#007C30' />
    </svg>
  );
}
