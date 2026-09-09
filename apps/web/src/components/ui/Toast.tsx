import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  message: string
  type: ToastType
}

type Props = {
  toast: ToastItem | null
  onClose: () => void
}

export function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => onClose(), 2600)
    return () => window.clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const palette =
    toast.type === 'success'
      ? 'border-buy/40 bg-buy/10 text-buy'
      : toast.type === 'error'
        ? 'border-sell/40 bg-sell/10 text-sell'
        : 'border-primary/40 bg-primary/10 text-primary'

  return (
    <div className="pointer-events-none fixed right-5 top-20 z-50">
      <div className={`pointer-events-auto flex items-center gap-3 rounded-md border px-3 py-2 shadow-lg ${palette}`}>
        {toast.type === 'success' ? <CheckCircle2 size={16} /> : toast.type === 'error' ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}
        <span className="text-xs font-medium">{toast.message}</span>
        <button aria-label="Dismiss toast" onClick={onClose} className="ml-1 text-current opacity-80 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
