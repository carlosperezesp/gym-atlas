interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-condensed font-800 text-2xl tracking-wide text-zinc-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </header>
  );
}
