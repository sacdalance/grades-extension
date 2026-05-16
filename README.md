# GinaGWA mo?!

> Also known as **AMIS GWA Calculator**

A Chrome extension that automatically calculates your General Weighted Average (GWA) directly on the UP AMIS grades portal — no more manual computation.

---

## Features

- **Auto GWA Calculation** — Reads your grades from the AMIS portal and instantly computes your term and cumulative GWA
- **Grade History** — Save grades across multiple terms and track your academic progress over time
- **Latin Honor Projection** — See your chances of graduating Cum Laude, Magna Cum Laude, or Summa Cum Laude based on your current GWA and remaining units
- **What-If Calculator** — Simulate future grades and see how they would affect your cumulative GWA
- **Grade Analysis** — View GWA trends, grade distribution breakdown, consistency metrics, and degree progress
- **Share as Image** — Export your GWA card as a PNG with customizable display options

---

## Installation

Available on the [Chrome Web Store](#).

To install manually:
1. Run `pnpm build` to build the extension
2. Open `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select the `build/chrome-mv3-prod` folder

---

## Usage

1. Log in to the UP AMIS grades portal
2. Navigate to your grades page
3. The extension widget will appear on the right side of the page
4. Click **Save Term** to store your current semester's grades
5. Use the dashboard to view your GWA, analyze trends, or run projections

---

## Tech Stack

- [Plasmo](https://plasmo.com) — Chrome extension framework
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Lucide Icons](https://lucide.dev)

---

## Disclaimer

This extension is a student-developed tool and is **not affiliated with the University of the Philippines**. All GWA computations are unofficial estimates. Always verify your academic standing with the Office of the University Registrar (OUR).

See [PRIVACY.md](PRIVACY.md) for the full Privacy Policy and Terms of Use.

---

## License

MIT
