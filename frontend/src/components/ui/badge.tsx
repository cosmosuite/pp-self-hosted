import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variantClasses = {
    default: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
    secondary: "border-transparent bg-gray-500 text-white hover:bg-gray-600", 
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
    outline: "text-gray-900 border-gray-300"
  }
  
  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${className}`.trim()
  
  return (
    <div className={finalClasses} {...props} />
  )
}

export { Badge }
