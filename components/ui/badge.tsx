import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-upb-green text-white",
        gold: "bg-upb-maroon text-white",
        outline: "border border-upb-green/30 text-upb-green",
        secondary: "bg-upb-green/10 text-upb-green"
      }
    },
    defaultVariants: { variant: "default" }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
