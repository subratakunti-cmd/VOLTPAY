interface VoltPayLogoProps {
  size?: number;
}

export function VoltPayLogo({ size = 34 }: VoltPayLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="voltpay-bg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#voltpay-bg)" />
      <rect
        x="2.75"
        y="2.75"
        width="34.5"
        height="34.5"
        rx="10.25"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      {/* Signal arcs */}
      <path
        d="M24.5 11.5C27.2 12.6 29.2 14.8 30 17.5"
        stroke="#93C5FD"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M23.5 15.2C25 15.8 26.1 17 26.6 18.5"
        stroke="#BFDBFE"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Geometric V-bolt mark */}
      <path
        d="M11.5 13L17.6 27.5C18 28.4 19.3 28.4 19.7 27.5L23.2 19.6H19.4L21.9 12.2C22.1 11.6 21.4 11.2 20.9 11.6L14.4 18.7H17.3L14.2 12.1C13.7 11.2 12.3 11.4 11.7 12.2L11.5 13Z"
        fill="white"
      />
    </svg>
  );
}
