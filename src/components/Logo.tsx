export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 320"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="APP 로고"
    >
      <defs>
        <linearGradient id="appLogoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0B3D5C" />
          <stop offset="50%" stopColor="#0E7C86" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight={900}
        fontSize="260"
        letterSpacing="-6"
        fill="url(#appLogoGradient)"
      >
        APP
      </text>
    </svg>
  )
}
