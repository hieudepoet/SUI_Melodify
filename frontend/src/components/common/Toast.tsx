import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useState, useEffect } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastMessage({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => onClose(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-400" />,
    info: <Info className="h-5 w-5 text-blue-400" />,
  };

  const bgColors = {
    success: "bg-green-500/10 border-green-500/50",
    error: "bg-red-500/10 border-red-500/50",
    info: "bg-blue-500/10 border-blue-500/50",
  };

  const textColors = {
    success: "text-green-400",
    error: "text-red-400",
    info: "text-blue-400",
  };

  return (
    <div
      className={`rounded-lg border backdrop-blur p-4 flex items-center gap-3 ${bgColors[toast.type]}`}
    >
      {icons[toast.type]}
      <p
        className={`font-poppins font-semibold ${textColors[toast.type]} flex-1`}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onClose(toast.id)}
        className={`p-1 rounded hover:bg-slate-700/50 transition-colors cursor-pointer ${textColors[toast.type]}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function ToastContainer({
  toasts,
  onClose,
}: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {toasts.map(toast => (
        <ToastMessage key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
