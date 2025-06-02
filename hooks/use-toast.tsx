import { useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; title: string; description?: string; action?: string }[]>([]);

  const showToast = (title: string, description?: string, action?: string) => {
    const newToast = { id: Date.now(), title, description, action };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== newToast.id));
    }, 3000);
  };

  return { toasts, showToast };
}
