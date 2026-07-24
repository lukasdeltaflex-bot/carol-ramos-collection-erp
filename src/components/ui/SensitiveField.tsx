import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SensitiveFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Poderia ter prop adicional como 'copyable' no futuro
}

export const SensitiveField = React.forwardRef<HTMLInputElement, SensitiveFieldProps>(
  ({ className, ...props }, ref) => {
    const [showContent, setShowContent] = useState(false);

    const toggleVisibility = () => {
      setShowContent(!showContent);
    };

    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={ref}
          type={showContent ? "text" : "password"}
          className={cn(
            "w-full pr-10",
            showContent ? "font-mono" : "",
            className
          )}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label={showContent ? "Ocultar valor" : "Mostrar valor"}
        >
          {showContent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);

SensitiveField.displayName = "SensitiveField";
