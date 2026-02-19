interface ToolBadgeProps {
  name: string
  variant?: 'default' | 'secondary'
}

export function ToolBadge({ name, variant = 'default' }: ToolBadgeProps) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
      variant === 'secondary'
        ? 'bg-white/10 text-muted-foreground'
        : 'bg-purple-600/20 text-accent-glow-bright'
    }`}>
      {name}
    </span>
  )
}
