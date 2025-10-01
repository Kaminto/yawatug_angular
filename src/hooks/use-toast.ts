
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast({ title, description, variant = "default" }: ToastProps) {
  if (variant === "destructive") {
    return sonnerToast.error(title || "", {
      description,
    });
  }
  
  return sonnerToast.success(title || "", {
    description,
  });
}

// This hook is provided for compatibility with shadcn/ui's useToast
export const useToast = () => {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    // Adding toasts property to fix the TypeScript error
    toasts: []
  };
};
