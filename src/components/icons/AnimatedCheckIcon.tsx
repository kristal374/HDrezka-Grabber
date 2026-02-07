export function AnimatedCheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      <path
        d='M4 12 l5 5 l11 -11'
        strokeDasharray={24}
        style={{ animation: 'checkmark-draw 0.7s forwards' }}
      />
    </svg>
  );
}
