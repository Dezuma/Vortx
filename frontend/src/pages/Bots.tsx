export function Bots() {
  const demoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/oracle-bot?event=Fed%20cuts%20before%20Oct%201&probability=42&market=fed-cut-q3&dryRun=1`
      : '/api/oracle-bot?event=Fed%20cuts%20before%20Oct%201&probability=42&market=fed-cut-q3&dryRun=1'

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Oracle bot</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Bot checks and dry-run posts</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Cloudflare Pages Functions expose a safe dry-run endpoint. It builds the post payload and target link without
          posting to any social network until you add platform credentials and a posting adapter.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface-elevated p-5">
        <h2 className="font-semibold text-ink">Dry-run endpoint</h2>
        <p className="mt-2 text-sm text-muted">
          Deploy on Cloudflare Pages, then open this URL. If <code className="font-mono text-xs">BOT_ADMIN_TOKEN</code>{' '}
          is set, send it as <code className="font-mono text-xs">Authorization: Bearer ...</code>.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">{demoUrl}</pre>
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-neutral-800"
        >
          Run dry check
        </a>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
        <h2 className="font-semibold text-ink">Live posting requirements</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Set <code className="font-mono text-xs">BOT_ADMIN_TOKEN</code> in Cloudflare Pages for endpoint protection.</li>
          <li>Add social API credentials only in Cloudflare/Supabase secret storage, never in git.</li>
          <li>Keep <code className="font-mono text-xs">dryRun=1</code> until the posting adapter is intentionally enabled.</li>
        </ul>
      </section>
    </div>
  )
}
