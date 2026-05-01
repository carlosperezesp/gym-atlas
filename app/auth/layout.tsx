export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 5v14M18 5v14M3 9h3M18 9h3M3 15h3M18 15h3M6 9h12M6 15h12" />
            </svg>
          </div>
          <h1 className="font-condensed font-800 text-3xl tracking-wide text-zinc-100">GymOS</h1>
          <p className="text-zinc-500 text-sm mt-1">Track your progression</p>
        </div>
        {children}
      </div>
    </div>
  );
}
