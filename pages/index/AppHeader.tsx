export function AppHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2">VIMLE</h1>
      <p className="text-lg text-muted-foreground mb-6">Vim Motion Trainer</p>
      <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
        Practice Vim motions to guess the correct sequence. Try:{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">hjkl</code>,{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">w</code>,{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">b</code>,{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">dd</code>,{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs">yy</code>
      </p>
    </div>
  );
}
