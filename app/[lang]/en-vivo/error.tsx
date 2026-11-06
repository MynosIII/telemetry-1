"use client";

export default function LiveError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="inner-page replay-page">
      <div className="replay-content">
        <div className="replay-error" role="alert">
          <p>Algo falló al mostrar esta sesión. <small>{error.message}</small></p>
          <button type="button" onClick={() => retry()}>Reintentar</button>
        </div>
      </div>
    </main>
  );
}
