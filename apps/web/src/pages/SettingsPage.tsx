export function SettingsPage() {
  return (
    <div className="mx-auto max-w-[900px] p-6 text-text">
      <div className="panel p-5">
        <div className="mb-4 text-[10px] uppercase tracking-[0.16em] text-muted">Settings</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="font-medium text-text">Demo account</div>
              <div className="text-sm text-muted">Live market simulation mode</div>
            </div>
            <span className="rounded border border-buy/40 bg-buy/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-buy">Enabled</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="font-medium text-text">Theme</div>
              <div className="text-sm text-muted">Professional dark terminal</div>
            </div>
            <span className="text-sm text-muted">Dark</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="font-medium text-text">Default pair</div>
              <div className="text-sm text-muted">SOL/USDT</div>
            </div>
            <span className="text-sm text-muted">SOL/USDT</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-text">Notifications</div>
              <div className="text-sm text-muted">Order execution and balances</div>
            </div>
            <button className="rounded border border-border bg-panelAlt px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text">On</button>
          </div>
        </div>
      </div>
    </div>
  )
}
