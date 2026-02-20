interface ToolBadgeProps {
  name: string;
  variant?: "default" | "secondary";
}

export function ToolBadge({ name, variant = "default" }: ToolBadgeProps) {
  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
        variant === "secondary"
          ? "bg-muted text-muted-foreground"
          : "bg-primary/10 text-primary"
      }`}
    >
      {name}
    </span>
  );
}
