import styleText from "data-text:~/style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { App } from "~components/App"

export const config: PlasmoCSConfig = {
  matches: ["https://amis.upb.edu.ph/*", "https://amis-dev.upb.edu.ph/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

export default function GWACalculator() {
  return <App />
}
