interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ size = "md", iconOnly = false, className = "" }: LogoProps) {
  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const iconSizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  if (iconOnly) {
    return (
      <div className={`flex items-center justify-center ${className}`} data-testid="logo-icon">
        <div className="font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: "'Inter', sans-serif" }}>
          <span className={iconSizeClasses[size]}>BC</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="logo-container">
      <div className="font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: "'Inter', sans-serif" }}>
        <span className={iconSizeClasses[size]}>BC</span>
      </div>
      <div className={`font-semibold ${textSizeClasses[size]}`} data-testid="brand-text">
        <span className="text-foreground">BuildMy</span>
        <span className="text-foreground">Chatbot</span>
        <span className="text-accent">.</span>
        <span className="text-accent">Ai</span>
      </div>
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
