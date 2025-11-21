import logoImage from "@assets/bc-logo_1763754121353.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ size = "md", iconOnly = false, className = "" }: LogoProps) {
  const heightClasses = {
    sm: "h-20",
    md: "h-24",
    lg: "h-32",
    xl: "h-48",
  };

  const iconSizeClasses = {
    sm: "h-20 w-20",
    md: "h-24 w-24",
    lg: "h-32 w-32",
    xl: "h-48 w-48",
  };

  if (iconOnly) {
    return (
      <div className={`flex items-center justify-center ${className}`} data-testid="logo-icon">
        <img 
          src={logoImage} 
          alt="BuildMyChatbot.AI" 
          className={`${iconSizeClasses[size]} object-contain`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`} data-testid="logo-container">
      <img 
        src={logoImage} 
        alt="BuildMyChatbot.AI" 
        className={`${heightClasses[size]} w-auto object-contain`}
      />
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
