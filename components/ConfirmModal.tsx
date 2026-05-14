import { Button } from "~components/ui/button"

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmVariant?: "danger" | "default"
}

export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Confirm", confirmVariant = "default" }: Props) {
  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483648,
        background: "rgba(0,0,0,0.4)",
        animation: "gwa-fade 0.15s ease-out both"
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-lg px-5 py-4 space-y-4"
        style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
        <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            className={confirmVariant === "danger" ? "bg-upb-maroon hover:bg-upb-maroon/90 text-white" : ""}
            onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
