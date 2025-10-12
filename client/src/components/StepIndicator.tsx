import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                step.number < currentStep
                  ? "bg-primary text-primary-foreground"
                  : step.number === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              data-testid={`step-indicator-${step.number}`}
            >
              {step.number < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>
            <div className="mt-2 text-center hidden md:block">
              <div className={cn(
                "text-sm font-medium",
                step.number <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-2 transition-colors",
                step.number < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
