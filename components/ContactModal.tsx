import { Button } from "~components/ui/button"
import { Separator } from "~components/ui/separator"

interface Props {
  onClose: () => void
}

// ── Edit your details here ────────────────────────────────────────────────────
const DEVELOPER = {
  name: "Lance Gabriel Sacdalan",
  role: "IV - BS Computer Science, UP Baguio",
  email: "lancesacdalan1503@gmail.com",
  linkedin: "https://www.linkedin.com/in/lance-gabriel-sacdalan/"
}
// ─────────────────────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  )
}

export function ContactModal({ onClose }: Props) {
  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.4)",
        animation: "gwa-fade 0.15s ease-out both"
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div
        className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        style={{ width: "min(22rem, 92vw)", maxHeight: "calc(100vh - 2rem)", overflowY: "auto", animation: "gwa-slide-up 0.2s ease-out both" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
          <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
        </div>

        {/* About */}
        <div className="px-4 py-2.5 bg-upb-green/5 border-b border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            Built for UP Baguio students. For bug reports or suggestions, feel free to reach out.
          </p>
        </div>

        {/* Details */}
        <div className="px-4 py-3 space-y-2.5">
          <Row label="Developer">
            <p className="text-sm font-semibold text-gray-900">{DEVELOPER.name}</p>
            <p className="text-xs text-gray-400">{DEVELOPER.role}</p>
          </Row>

          <Separator />

          <Row label="Email">
            <a href={`mailto:${DEVELOPER.email}`} className="text-sm text-upb-green font-medium hover:underline">
              {DEVELOPER.email}
            </a>
          </Row>

          <Separator />

          <Row label="LinkedIn">
            <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer"
              className="text-sm text-upb-green font-medium hover:underline break-all">
              {DEVELOPER.linkedin.replace("https://www.linkedin.com/in/", "in/")}
            </a>
          </Row>
        </div>

        <div className="px-4 pb-3">
          <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
