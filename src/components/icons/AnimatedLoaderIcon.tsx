export function AnimatedLoaderIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='32'
      height='8'
      viewBox='0 0 120 40'
      role='img'
      {...props}
    >
      <style>
        {`
        .dot {
          transform-origin: center;
          animation: jump 1s ease-in-out infinite;
        }
        .d1 { animation-delay: 0s; }
        .d2 { animation-delay: 0.15s; }
        .d3 { animation-delay: 0.30s; }
    
        @keyframes jump {
        0%   { transform: translateY(0); opacity: 0.6; }
        25%  { transform: translateY(-8px); opacity: 1; }
        50%  { transform: translateY(0); opacity: 0.6; }
        100% { transform: translateY(0); opacity: 0.6; }
        }
      `}
      </style>

      <circle fill='currentColor' className='dot d1' cx='20' cy='20' r='7' />
      <circle fill='currentColor' className='dot d2' cx='60' cy='20' r='7' />
      <circle fill='currentColor' className='dot d3' cx='100' cy='20' r='7' />
    </svg>
  );
}
