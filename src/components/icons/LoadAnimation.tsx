export function LoadAnimation({ size, fill }: { size: number; fill: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 100 100'
      fill={fill}
      xmlns='http://www.w3.org/2000/svg'
    >
      <g transform='translate(50,50)'>
        <g transform='rotate(0)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='1'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(36)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.9'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.1s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(72)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.8'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.2s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(108)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.7'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.3s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(144)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.6'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.4s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(180)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.5'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.5s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(216)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.4'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.6s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(252)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.3'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.7s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(288)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.2'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.8s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
        <g transform='rotate(324)'>
          <rect x='-2' y='-40' rx='4' width='7' height='20' opacity='0.1'>
            <animate
              attributeName='opacity'
              from='1'
              to='0'
              begin='0.9s'
              dur='1s'
              repeatCount='indefinite'
            />
          </rect>
        </g>
      </g>
    </svg>
  );
}
