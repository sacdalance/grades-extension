import { Button } from "~components/ui/button"

interface Props {
  onClose: () => void
}

export function TermsModal({ onClose }: Props) {
  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>

      <div
        className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        style={{ width: "min(28rem, 92vw)", maxHeight: "82vh", animation: "gwa-slide-up 0.2s ease-out both" }}>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Terms of Use &amp; Privacy Notice</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">GinaGWA mo?! — AMIS GWA Calculator</p>
          </div>
          <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[11px] text-gray-600 leading-relaxed">

          <div className="pl-3 border-l-2 border-upb-green/30">
            <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest mb-1">About This Tool</p>
            <p>
              GinaGWA mo?! (also known as AMIS GWA Calculator) is a student-developed browser extension created independently. It is not affiliated with, endorsed by, or in any way connected to the University of the Philippines, its constituent universities, colleges, offices, or information systems.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">1. No Data Collection</p>
            <p>
              This extension does not collect, transmit, store, or share any of your personal information, academic records, or usage data with any third party, including the developer. There are no analytics, no tracking mechanisms, and no external servers involved in its operation.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">2. Local Storage Only</p>
            <p>
              All data you enter, including your grades, term names, subjects, and program settings, is stored exclusively on your own device using your browser's built-in local extension storage. This data never leaves your device. Uninstalling the extension permanently removes all stored data.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">3. Read-Only Page Access</p>
            <p>
              The extension reads grade information displayed on the AMIS portal solely to compute your GWA on-screen. It does not modify, submit, or interact with any form or system on the portal. Your AMIS credentials and active session are never accessed or stored by this extension.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">4. Accuracy Disclaimer</p>
            <p>
              All computations produced by this extension are unofficial estimates provided for informational and planning purposes only. Results may not reflect incomplete grades (INC), dropped subjects (DRP), or other academic standing adjustments. You are solely responsible for verifying your official academic records with the Office of the University Registrar (OUR).
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">5. Your Responsibility</p>
            <p>
              By using this extension, you acknowledge that all actions taken, including the entry, modification, deletion, import, and export of grade data, are performed at your own discretion. The developer assumes no liability for academic decisions made in reliance on this tool.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">6. University of the Philippines Intellectual Property</p>
            <p>
              The name, logo, seal, color scheme, and all other marks and identifiers of the University of the Philippines are the exclusive intellectual property of the University of the Philippines System. Their appearance in this extension is incidental to its academic purpose and does not constitute any claim of ownership, affiliation, or authorization. No copyright or trademark of the University of the Philippines is claimed by this extension or its developer.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">7. Open Source Libraries</p>
            <p>
              This extension is built using open-source software libraries, including React, Recharts, Tailwind CSS, Lucide Icons, and Plasmo, each distributed under the MIT License or equivalent permissive license. All such libraries are used in accordance with their respective license terms. No proprietary software is bundled with or embedded in this extension.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">8. Open Use</p>
            <p>
              This tool is provided free of charge, without warranty of any kind, for the personal academic use of UP students. It is offered in good faith to make GWA tracking more accessible and convenient.
            </p>
          </div>

          <div className="rounded-md bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              By continuing to use this extension, you confirm that you have read and understood these terms. If you do not agree, you may uninstall the extension at any time without consequence.
            </p>
          </div>

        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 shrink-0">
          <Button className="w-full" size="sm" onClick={onClose}>I Understand</Button>
        </div>
      </div>
    </div>
  )
}
