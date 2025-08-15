export function Challenge() {
  return (
    <div className="text-center max-w-2xl mx-auto mb-6">
      <h2 className="text-lg font-bold text-foreground mb-2">
        Challenge
      </h2>
      <p className="text-foreground">
        Use Vim motions to move down two lines, then forward one word: <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">j</code> <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">j</code> <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">w</code>
      </p>
    </div>
  );
}