import React from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: LucideIcon | ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
          {React.isValidElement(Icon) ? (
            Icon
          ) : typeof Icon === 'function' ? (
            <Icon className="w-8 h-8" />
          ) : null}
        </div>
      )}
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      {description && <p className="text-gray-500 max-w-md mx-auto mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
