import { useState } from "react"
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
  const [supportOpen, setSupportOpen] = useState(false)

  return (
    <>
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          background: "rgba(0,0,0,0.4)",
          animation: "gwa-fade 0.15s ease-out both"
        }}>

        <div
          className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(22rem, 92vw)", maxHeight: "calc(100vh - 2rem)", overflowY: "auto", animation: "gwa-slide-up 0.2s ease-out both" }}>

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
            <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
          </div>

          <div className="px-4 py-2.5 bg-upb-green/5 border-b border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              Built for UP Baguio students. For bug reports or suggestions, feel free to reach out.
            </p>
          </div>

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

            <Separator />

            <Button onClick={() => setSupportOpen(true)} className="w-full">Support the Developer</Button>
          </div>

          <div className="px-4 pb-3">
            <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>

      {supportOpen && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.6)", animation: "gwa-fade 0.15s ease-out both" }}
          onClick={() => setSupportOpen(false)}>
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-lg flex flex-col overflow-hidden"
            style={{ width: "min(28rem, 92vw)", maxHeight: "90vh", animation: "gwa-slide-up 0.2s ease-out both" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-sm font-semibold text-gray-900">Support</p>
              <Button variant="icon" size="icon" onClick={() => setSupportOpen(false)} className="text-lg leading-none">×</Button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">GinaGWA mo?! is a free, student-made tool built voluntarily to help fellow UP students. A little support goes a long way in keeping it maintained and improving.</p>
              <p className="text-xs text-gray-400 mt-1">Scan the QR code to send a support</p>
              <img
                src={chrome.runtime.getURL("assets/152c214e-e638-482c-8805-749aef2bdf61.jpg")}
                alt="Support QR Code"
                className="w-full rounded-md border border-gray-100"
                style={{ maxHeight: "420px", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
