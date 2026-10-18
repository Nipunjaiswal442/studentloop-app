/** Shown instead of the app when the build is missing required settings. */
export function MissingConfig({ names }: { names: string[] }) {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">StudentLoop isn't fully set up</h1>
      <p className="mt-2 text-muted-foreground">This build is missing these settings:</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {names.map((n) => (
          <li key={n}>
            <code>{n}</code>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Add them to the Vercel project's environment variables (or <code>.env.local</code> when running locally) and
        rebuild. The README's "Deploying" section lists where each value comes from.
      </p>
    </div>
  );
}
