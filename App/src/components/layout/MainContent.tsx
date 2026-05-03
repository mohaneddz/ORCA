export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
      <div className="page-content">{children}</div>
    </main>
  );
}

