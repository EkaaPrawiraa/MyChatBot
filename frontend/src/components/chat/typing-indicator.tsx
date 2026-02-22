export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2 px-3 md:px-4">
      <div
        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <div
        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
