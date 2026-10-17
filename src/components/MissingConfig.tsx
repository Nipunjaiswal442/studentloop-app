export function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">StudentLoop isn't connected to a backend</h1>
      <p className="mt-2 text-muted-foreground">
        <code>VITE_CONVEX_URL</code> is not set. Run <code>npx convex dev</code> once, or follow the README.
      </p>
    </div>
  );
}
