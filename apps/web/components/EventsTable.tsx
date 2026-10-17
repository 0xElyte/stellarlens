"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventRow, EventsPage } from "@/lib/api";
import { downloadCsv, eventsToCsv } from "@/lib/csvExport";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

const POLL_INTERVAL_MS = 10000;
// The api caps `limit` at 100, so exports walk the cursor in pages of this size.
const EXPORT_PAGE_SIZE = 100;

function formatTopic(event: EventRow): string {
  const topic = event.decodedData?.decoded?.topic;
  if (!Array.isArray(topic) || topic.length === 0) {
    return "—";
  }
  return topic.map((entry) => JSON.stringify(entry)).join(", ");
}

function formatValue(event: EventRow): string {
  const value = event.decodedData?.decoded?.value;
  if (value === undefined) {
    return "—";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function fetchAllEvents(
  contractId: number,
  onProgress: (count: number) => void
): Promise<EventRow[]> {
  const all: EventRow[] = [];
  let cursor: number | null = null;
  do {
    const query = new URLSearchParams({ limit: String(EXPORT_PAGE_SIZE) });
    if (cursor !== null) {
      query.set("cursor", String(cursor));
    }
    const response = await fetch(`/api/contracts/${contractId}/events?${query}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`request failed with ${response.status}`);
    }
    const page = (await response.json()) as EventsPage;
    all.push(...page.data);
    onProgress(all.length);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return all;
}

export function EventsTable({ contractId }: { contractId: number }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [cursor, setCursor] = useState<number | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<number | null>>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const query = new URLSearchParams({ limit: String(pageSize) });
        if (cursor !== null) {
          query.set("cursor", String(cursor));
        }
        const response = await fetch(`/api/contracts/${contractId}/events?${query}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`request failed with ${response.status}`);
        }
        const body = (await response.json()) as EventsPage;
        if (!cancelled) {
          setEvents(body.data);
          setNextCursor(body.nextCursor);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "failed to load events");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [contractId, pageSize, cursor, reloadKey]);

  async function handleExport() {
    setExporting(true);
    setExportStatus("Preparing export…");
    try {
      const allEvents = await fetchAllEvents(contractId, (count) =>
        setExportStatus(`Fetched ${count} events…`)
      );
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`contract-${contractId}-events-${date}.csv`, eventsToCsv(allEvents));
      setExportStatus(`Exported ${allEvents.length} events.`);
    } catch (err) {
      setExportStatus(`Export failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setExporting(false);
    }
  }

  const loadPage = useCallback(
    async (targetCursor: number | null) => {
      setPageLoading(true);
      try {
        const query = new URLSearchParams({ limit: String(pageSize) });
        if (targetCursor !== null) {
          query.set("cursor", String(targetCursor));
        }
        const response = await fetch(`/api/contracts/${contractId}/events?${query}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`request failed with ${response.status}`);
        }
        const body = (await response.json()) as EventsPage;
        setEvents(body.data);
        setNextCursor(body.nextCursor);
        setCursor(targetCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "failed to load events");
      } finally {
        setPageLoading(false);
      }
    },
    [contractId, pageSize]
  );

  function handleNextPage() {
    if (nextCursor === null) {
      return;
    }
    setCursorStack((stack) => [...stack, cursor]);
    void loadPage(nextCursor);
  }

  function handlePreviousPage() {
    if (cursorStack.length === 0) {
      return;
    }
    const previous = cursorStack[cursorStack.length - 1];
    setCursorStack((stack) => stack.slice(0, -1));
    void loadPage(previous);
  }

  function handlePageSizeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setPageLoading(true);
    setPageSize(Number(event.target.value));
    setCursorStack([]);
    setCursor(null);
    setNextCursor(null);
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <LoadingState label="Loading events…" />;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">Couldn&apos;t refresh events: {error}</p>}
      {pageLoading && <p className="mb-2 text-sm text-gray-500">Loading page…</p>}
      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Events will appear here automatically as the indexer picks up activity for this contract."
        />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-end gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-500">
              Page size
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                disabled={pageLoading}
                aria-label="Events per page"
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span role="status" aria-live="polite" className="text-xs text-gray-500">
              {exportStatus}
            </span>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              aria-label="Export CSV of the full event history for this contract"
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Contract events with ledger, transaction hash, topic and decoded data
              </caption>
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th scope="col" className="py-2 font-medium">
                    Ledger
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Tx hash
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Topic
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Decoded data
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-2">{event.ledger}</td>
                    <td className="py-2 font-mono text-xs">{event.txHash.slice(0, 12)}…</td>
                    <td className="py-2 font-mono text-xs">{formatTopic(event)}</td>
                    <td className="py-2 font-mono text-xs">{formatValue(event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={pageLoading || cursorStack.length === 0}
              aria-label="Previous page of events"
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={pageLoading || nextCursor === null}
              aria-label="Next page of events"
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
