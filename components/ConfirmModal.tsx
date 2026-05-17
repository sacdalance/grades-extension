import { Button } from "~components/ui/button"

interface Props {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmVariant?: "danger" | "default"
}

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmVariant = "default" }: Props) {
  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483648,
        background: "rgba(0,0,0,0.45)",
        animation: "gwa-fade 0.15s ease-out both"
      }}>
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button
            onClick={onCancel}
            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">
            ×
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">{message}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
            <Button
              size="sm"
              className="flex-1"
              variant={confirmVariant === "danger" ? "danger" : "default"}
              onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
