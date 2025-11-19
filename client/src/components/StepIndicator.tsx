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
  onStepClick?: (stepNumber: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-between min-w-max md:min-w-0">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold transition-colors text-xs md:text-base flex-shrink-0",
                  step.number < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.number === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  onStepClick && "cursor-pointer hover-elevate"
                )}
                onClick={() => onStepClick?.(step.number)}
                data-testid={`step-indicator-${step.number}`}
              >
                {step.number < currentStep ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
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
                  "flex-1 h-0.5 mx-1 md:mx-2 transition-colors min-w-[12px] md:min-w-[24px]",
                  step.number < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
