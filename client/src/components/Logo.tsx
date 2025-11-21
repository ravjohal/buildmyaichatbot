interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ size = "md", iconOnly = false, className = "" }: LogoProps) {
  const heightClasses = {
    sm: "h-10",
    md: "h-12",
    lg: "h-16",
    xl: "h-24",
  };

  const sizes = {
    sm: { height: 40, width: iconOnly ? 40 : 280 },
    md: { height: 48, width: iconOnly ? 48 : 336 },
    lg: { height: 64, width: iconOnly ? 64 : 448 },
    xl: { height: 96, width: iconOnly ? 96 : 672 },
  };

  const { height, width } = sizes[size];
  const scale = height / 48;

  return (
    <div className={`flex items-center ${className}`} data-testid="logo-container">
      <svg 
        width={width} 
        height={height} 
        viewBox={iconOnly ? "0 0 60 60" : "0 0 420 60"}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
      >
        <defs>
          {/* Gradient for icon */}
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="50%" stopColor="#007FFF" />
            <stop offset="100%" stopColor="#0047AB" />
          </linearGradient>
          
          {/* Gradient for .AI text */}
          <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="50%" stopColor="#007FFF" />
            <stop offset="100%" stopColor="#00BFFF" />
          </linearGradient>

          {/* Glow effect for brain */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Circuit pattern for dot */}
          <pattern id="circuitPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 0 2 L 2 2 L 2 0 M 2 2 L 2 4 M 6 2 L 8 2 M 6 6 L 6 8 M 2 6 L 6 6" 
                  stroke="url(#aiGradient)" strokeWidth="0.5" opacity="0.6"/>
          </pattern>
        </defs>

        {/* Toolbox base */}
        <g transform="translate(8, 20)">
          <path d="M 5 10 L 5 30 L 35 30 L 35 10 Z" fill="url(#iconGradient)" opacity="0.8"/>
          <path d="M 5 30 L 0 35 L 40 35 L 35 30 Z" fill="url(#iconGradient)" opacity="0.6"/>
          <rect x="8" y="25" width="4" height="6" fill="#87CEEB" opacity="0.4"/>
          <rect x="18" y="25" width="4" height="6" fill="#87CEEB" opacity="0.4"/>
          <rect x="28" y="25" width="4" height="6" fill="#87CEEB" opacity="0.4"/>
          
          {/* Toolbox lid (open) */}
          <path d="M 2 10 L 2 5 L 38 5 L 38 10" fill="url(#iconGradient)"/>
          <ellipse cx="20" cy="5" rx="16" ry="2" fill="url(#iconGradient)" opacity="0.7"/>
          
          {/* Robotic arm */}
          <g transform="translate(25, 15)">
            <rect x="-2" y="0" width="4" height="10" fill="url(#iconGradient)" rx="1"/>
            <circle cx="0" cy="10" r="3" fill="#007FFF"/>
            <rect x="-1.5" y="10" width="3" height="8" fill="url(#iconGradient)" rx="1"/>
            <circle cx="0" cy="18" r="2.5" fill="#007FFF"/>
            <path d="M -2 18 L -8 5 L -6 4 L 0 17 Z" fill="url(#iconGradient)"/>
          </g>

          {/* Brain with glow */}
          <g transform="translate(17, -5)" filter="url(#glow)">
            <ellipse cx="0" cy="0" rx="8" ry="6" fill="#87CEEB" opacity="0.3"/>
            <path d="M -6 -2 Q -4 -5 0 -4 Q 4 -5 6 -2 Q 8 2 4 4 Q 0 6 -4 4 Q -8 2 -6 -2" 
                  fill="url(#iconGradient)" opacity="0.9"/>
            <path d="M -3 -2 Q -2 -3 0 -2 M 3 -2 Q 2 -3 0 -2 M -2 1 Q 0 2 2 1" 
                  stroke="#fff" strokeWidth="0.5" fill="none" opacity="0.6"/>
          </g>

          {/* Lightbulb spark */}
          <g transform="translate(17, -12)">
            <circle cx="0" cy="0" r="2" fill="#FFD700" opacity="0.8"/>
            <path d="M 0 -4 L 1 -2 L -1 -2 Z" fill="#FFD700"/>
            <path d="M 3 -2 L 2 0 L 4 0 Z" fill="#FFD700" opacity="0.7"/>
            <path d="M -3 -2 L -2 0 L -4 0 Z" fill="#FFD700" opacity="0.7"/>
          </g>
        </g>

        {!iconOnly && (
          <>
            {/* "Buildmychatbot" text */}
            <text x="70" y="38" fontFamily="'Inter', 'system-ui', sans-serif" fontSize="24" fontWeight="600" fill="#00688B">
              Buildmychatbot
            </text>

            {/* ".AI" text with gradient and circuit pattern */}
            <text x="303" y="38" fontFamily="'Inter', 'system-ui', sans-serif" fontSize="24" fontWeight="600" fill="url(#aiGradient)">
              .AI
            </text>

            {/* Circuit pattern dot on 'i' */}
            <circle cx="398" cy="19" r="4" fill="url(#circuitPattern)" stroke="url(#aiGradient)" strokeWidth="0.5"/>
            <circle cx="398" cy="19" r="3.5" fill="url(#aiGradient)" opacity="0.3"/>
          </>
        )}
      </svg>
    </div>
  );
}

export function BrandText({ size = "base", className = "" }: { size?: "sm" | "base" | "lg" | "xl"; className?: string }) {
  const sizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  return (
    <div className={`font-semibold ${sizeClasses[size]} ${className}`} data-testid="brand-text-only">
      <span className="text-foreground">BuildMy</span>
      <span className="text-foreground">Chatbot</span>
      <span className="text-accent">.</span>
      <span className="text-accent">Ai</span>
    </div>
  );
}
