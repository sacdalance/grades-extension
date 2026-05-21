import styleText from "data-text:~/style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { App } from "~components/App"

const interUrl = chrome.runtime.getURL("assets/inter.woff2")
const interFace = new FontFace("Inter", `url(${interUrl})`, { style: "normal", weight: "100 900" })
interFace.load().then(f => document.fonts.add(f)).catch(() => {})

export const config: PlasmoCSConfig = {
  matches: ["https://amis.upb.edu.ph/*", "https://amis-dev.upb.edu.ph/*", "https://amis.uplb.edu.ph/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

export default function GWACalculator() {
  return <App />
}
