interface CenteredLayoutProps {
  children: React.ReactNode;
}

export function CenteredLayout({ children }: CenteredLayoutProps) {
  return (
    <div
      className="bg-background transition-colors duration-200 flex items-start justify-center pt-16"
      style={{ minHeight: "calc(100vh - 80px)", marginTop: "80px" }}
    >
      <div className="container mx-auto max-w-5xl px-6">{children}</div>
    </div>
  );
}
