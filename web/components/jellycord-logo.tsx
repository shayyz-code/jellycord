interface JellycordLogoProps {
  primaryColor: string
  size?: "sm" | "md"
  as?: "h1" | "div" | "span"
}

export function JellycordLogo({
  primaryColor,
  size = "md",
  as: Component = "h1",
}: JellycordLogoProps) {
  const svgSize = size === "sm" ? 28 : 36
  const textSize = size === "sm" ? "text-xl" : "text-2xl"

  return (
    <div className="flex items-center justify-center gap-2">
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-bounce"
        style={{ animationDuration: "2s" }}
      >
        {/* Jelly blob body */}
        <ellipse cx="18" cy="20" rx="14" ry="12" fill={primaryColor} />
        <ellipse cx="18" cy="18" rx="12" ry="10" fill={`${primaryColor}dd`} />
        {/* Shine */}
        <ellipse cx="12" cy="15" rx="3" ry="2" fill="white" opacity="0.5" />
        {/* Eyes */}
        <circle cx="13.5" cy="18.5" r="1.5" fill="#333" />
        <circle cx="23.5" cy="18.5" r="1.5" fill="#333" />
        {/* Blush */}
        <ellipse cx="9" cy="22" rx="2" ry="1" fill="#ff9999" opacity="0.6" />
        <ellipse cx="27" cy="22" rx="2" ry="1" fill="#ff9999" opacity="0.6" />
        {/* Smile */}
        <path
          d="M15 24 Q18 27 21 24"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <Component className={`${textSize} font-bold text-foreground`}>
        jelly<span style={{ color: primaryColor }}>cord</span>
      </Component>
    </div>
  )
}
