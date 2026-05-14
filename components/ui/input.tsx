import * as React from "react"
import { cn } from "~lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm transition-colors",
        "placeholder:text-gray-400",
        "hover:border-gray-200 hover:bg-gray-50",
        "focus:border-upb-green/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-upb-green/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
