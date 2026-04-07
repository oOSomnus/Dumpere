export function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '300px' }}
    >
      {/* Display heading */}
      <h2
        className="text-[28px] font-semibold mb-2"
        style={{
          color: 'var(--foreground)',
          fontWeight: 600,
          lineHeight: 1.1
        }}
      >
        No dumps yet
      </h2>

      {/* Body text */}
      <p
        className="text-base"
        style={{
          color: 'var(--muted-foreground)',
          fontWeight: 400,
          lineHeight: 1.5
        }}
      >
        Start by typing below and pressing Enter
      </p>
    </div>
  )
}
