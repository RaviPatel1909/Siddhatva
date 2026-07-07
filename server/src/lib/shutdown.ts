import type { Server } from 'node:http';

// Graceful shutdown for the HTTP server. On SIGTERM/SIGINT (a deploy rollover on
// Railway/Vercel/etc.), stop accepting new connections, let in-flight requests
// finish (up to a timeout), disconnect Prisma, then exit 0 — never kill a request
// mid-flight. `exit`/`log` are injectable so the drain logic is testable without
// actually terminating the process or delivering an OS signal.
export interface ShutdownOptions {
  disconnect: () => Promise<void>; // e.g. () => prisma.$disconnect()
  timeoutMs?: number;
  exit?: (code: number) => void;
  log?: (message: string) => void;
}

export function installGracefulShutdown(server: Server, options: ShutdownOptions) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const log = options.log ?? ((message: string) => console.log(message)); // eslint-disable-line no-console
  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`[shutdown] received ${signal} — shutting down gracefully…`);

    // Backstop: if connections don't drain in time, force exit.
    const forceExit = setTimeout(() => {
      log(`[shutdown] drain timed out after ${timeoutMs}ms — forcing exit.`);
      exit(1);
    }, timeoutMs);
    forceExit.unref();

    // Keep sweeping idle keep-alive sockets while draining: a socket whose
    // in-flight request finishes during shutdown becomes idle and would
    // otherwise keep server.close() from ever resolving. Active requests are
    // left untouched (closeIdleConnections only closes idle ones; Node 18.2+).
    const sweepIdle = () => server.closeIdleConnections?.();
    sweepIdle();
    const sweep = setInterval(sweepIdle, 250);
    sweep.unref();

    // Stop accepting new connections; the callback fires once in-flight requests
    // finish and all sockets are closed.
    server.close(async () => {
      clearInterval(sweep);
      try {
        await options.disconnect();
      } catch (err) {
        log(`[shutdown] error disconnecting Prisma: ${String(err)}`);
      }
      clearTimeout(forceExit);
      log('[shutdown] complete — bye.');
      exit(0);
    });
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return shutdown; // returned for tests / direct invocation
}
