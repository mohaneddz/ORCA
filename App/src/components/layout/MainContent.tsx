export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-full min-w-0 flex-1 overflow-y-auto pl-4 pr-4 py-4 md:pl-8 md:pr-6 md:py-6">
      <div className="page-content">{children}</div>
    </main>
  );
}

