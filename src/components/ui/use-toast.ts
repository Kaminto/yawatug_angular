
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast(props: ToastProps) {
  const { title, description, variant = "default" } = props;
  
  if (variant === "destructive") {
    return sonnerToast.error(title, {
      description,
    });
  }
  
  return sonnerToast.success(title, {
    description,
  });
}

export const useToast = () => {
  return {
    toast,
  };
};
