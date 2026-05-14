import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-upb-green focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:     "bg-upb-green text-white hover:bg-upb-green/90",
        secondary:   "border border-upb-green/30 text-upb-green hover:bg-upb-green/5 hover:border-upb-green/50",
        ghost:       "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
        destructive: "text-red-500 hover:bg-red-50",
        icon:        "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm:      "h-7 px-2.5 py-1",
        icon:    "h-7 w-7"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
