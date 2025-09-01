export function DownloadIcon() {
  return (
    <svg
      width='61'
      height='77'
      viewBox='0 0 61 77'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clip-path='url(#clip0_334_688)'>
        <path
          d='M42.0324 0H22.0322V34.2434H3.16491L32.0324 56.794L60.8999 34.2434H42.0324V0Z'
          fill='currentColor'
        />
        <path
          d='M58.699 76.839V66.8165H5.36543V76.839H58.699Z'
          fill='currentColor'
        />
      </g>
      <defs>
        <clipPath id='clip0_334_688'>
          <rect
            width='60'
            height='76.8389'
            fill='white'
            transform='matrix(-1 0 0 1 60.8999 0)'
          />
        </clipPath>
      </defs>
    </svg>
  );
}

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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='1'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.9'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.8'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.7'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.6'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.5'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.4'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.3'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.2'>
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
          <rect x='-2' y='-40' rx='4' width='8' height='20' opacity='0.1'>
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

export function StoryIcon({
  size,
  fill,
  className,
}: {
  size: number;
  fill: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox='0 0 1024 1024'
      version='1.1'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M469.333333 320v218.026667l200.96 119.04 33.706667-54.613334-170.666667-101.12V320m0-213.333333c-150.613333 0-281.173333 81.92-351.146666 203.52L85.333333 213.333333v277.333334h277.333334L245.333333 373.333333C296.96 265.813333 405.333333 192 533.333333 192A320 320 0 0 1 853.333333 512a320 320 0 0 1-320 320c-139.52 0-257.28-89.173333-301.226666-213.333333h-89.6c46.933333 171.946667 203.52 298.666667 390.826666 298.666666 223.573333 0 405.333333-181.333333 405.333334-405.333333a405.333333 405.333333 0 0 0-405.333334-405.333333z'
        fill={fill}
      />
    </svg>
  );
}

export function GitHubIco({
  size,
  fill = '#24292f',
}: {
  size: number;
  fill?: string;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 30 30'
      width={size}
      height={size}
    >
      <path
        d='M15,3C8.373,3,3,8.373,3,15c0,5.623,3.872,10.328,9.092,11.63C12.036,26.468,12,26.28,12,26.047v-2.051 c-0.487,0-1.303,0-1.508,0c-0.821,0-1.551-0.353-1.905-1.009c-0.393-0.729-0.461-1.844-1.435-2.526 c-0.289-0.227-0.069-0.486,0.264-0.451c0.615,0.174,1.125,0.596,1.605,1.222c0.478,0.627,0.703,0.769,1.596,0.769 c0.433,0,1.081-0.025,1.691-0.121c0.328-0.833,0.895-1.6,1.588-1.962c-3.996-0.411-5.903-2.399-5.903-5.098 c0-1.162,0.495-2.286,1.336-3.233C9.053,10.647,8.706,8.73,9.435,8c1.798,0,2.885,1.166,3.146,1.481C13.477,9.174,14.461,9,15.495,9 c1.036,0,2.024,0.174,2.922,0.483C18.675,9.17,19.763,8,21.565,8c0.732,0.731,0.381,2.656,0.102,3.594 c0.836,0.945,1.328,2.066,1.328,3.226c0,2.697-1.904,4.684-5.894,5.097C18.199,20.49,19,22.1,19,23.313v2.734 c0,0.104-0.023,0.179-0.035,0.268C23.641,24.676,27,20.236,27,15C27,8.373,21.627,3,15,3z'
        fill={fill}
      />
    </svg>
  );
}

export function PremiumIcon({ className }: { className?: string }) {
  return (
    <svg
      width='17'
      height='16'
      viewBox='0 0 17 16'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <path
        fill-rule='evenodd'
        clip-rule='evenodd'
        d='M16.5 8C16.5 12.4183 12.9183 16 8.5 16C4.08172 16 0.5 12.4183 0.5 8C0.5 3.58172 4.08172 0 8.5 0C12.9183 0 16.5 3.58172 16.5 8ZM7.49616 6.90147C8.29889 5.17634 9.01585 4.28945 9.59658 3.86116C10.1283 3.469 10.5705 3.44039 10.9947 3.54366C11.3579 3.63209 11.5721 3.85314 11.6864 4.20089C11.8121 4.58337 11.8079 5.12353 11.6217 5.70707C11.2426 6.89548 10.2648 7.86398 9.00145 7.86398L8.99836 9.5644C11.235 9.5644 12.7162 7.86577 13.2408 6.22145C13.5065 5.38863 13.5653 4.47103 13.301 3.66703C13.0254 2.82831 12.3965 2.13418 11.3994 1.89141C10.5189 1.67707 9.55346 1.78232 8.58974 2.49307C7.67501 3.16769 6.8087 4.35273 5.9556 6.18612C5.85888 6.39397 5.76862 6.59917 5.68459 6.80153C5.2677 6.86352 4.89342 7.03852 4.58426 7.23929C4.10892 7.548 3.67916 7.98978 3.38631 8.29083L3.38621 8.29093C3.33003 8.34868 3.27889 8.40125 3.23344 8.44671L4.43384 9.64828C4.50775 9.57438 4.57924 9.50143 4.64915 9.4301C4.75334 9.32379 4.85402 9.22107 4.95394 9.12409C4.77514 9.98665 4.72585 10.7633 4.78192 11.4326C4.83873 12.1109 5.00775 12.7214 5.30181 13.1975C5.59716 13.6757 6.06654 14.0813 6.6996 14.1426C7.15721 14.187 7.60077 14.1147 7.98687 13.8849C8.37198 13.6556 8.62291 13.3152 8.777 12.9584C9.06971 12.2806 9.05767 11.4484 8.94507 10.7231C8.82841 9.97157 8.582 9.19741 8.27468 8.5585C8.12071 8.2384 7.9429 7.93434 7.74498 7.67735C7.63268 7.53154 7.49811 7.38005 7.34029 7.24807C7.38981 7.13399 7.44174 7.01844 7.49616 6.90147ZM6.47557 11.2876C6.42923 10.7344 6.47941 10.0228 6.68284 9.17754C6.70288 9.21631 6.72294 9.25652 6.74295 9.29813C6.9792 9.78927 7.175 10.4034 7.26561 10.987C7.36027 11.5968 7.32054 12.0466 7.21701 12.2864C7.17297 12.3884 7.13364 12.4157 7.11964 12.424C7.10691 12.4316 7.04495 12.4657 6.87735 12.4511C6.85939 12.4412 6.81265 12.4063 6.74806 12.3017C6.63505 12.1188 6.5176 11.7893 6.47557 11.2876ZM6.88544 12.4545C6.88538 12.4548 6.88335 12.4542 6.87952 12.4523C6.88357 12.4533 6.88549 12.4543 6.88544 12.4545Z'
        fill='#E6CEFA'
      />
    </svg>
  );
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
