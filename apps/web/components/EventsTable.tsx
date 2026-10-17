"use client";

import { useEffect, useState } from "react";
import type { EventRow } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const POLL_INTERVAL_MS = 10000;
const SKELETON_ROW_COUNT = 5;
// Bar widths per column, roughly matching ledger, tx hash, topic and decoded data.
const SKELETON_COLUMN_WIDTHS = ["w-16", "w-28", "w-40", "w-48"];

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

function EventsTableHead() {
  return (
    <thead>
      <tr className="border-b border-gray-200 text-gray-500">
        <th className="py-2 font-medium">Ledger</th>
        <th className="py-2 font-medium">Tx hash</th>
        <th className="py-2 font-medium">Topic</th>
        <th className="py-2 font-medium">Decoded data</th>
      </tr>
    </thead>
  );
}

/**
 * Placeholder rows shown while events load. Uses the same table, header and
 * row padding as the real table so nothing shifts when the data arrives.
 */
export function EventsTableSkeleton() {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <span className="sr-only">Loading events…</span>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <EventsTableHead />
        <tbody>
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
            <tr key={row} className="border-b border-gray-100">
              {SKELETON_COLUMN_WIDTHS.map((width) => (
                <td key={width} className="py-2">
                  {/* my-0.5 + h-4 matches the 1.25rem line height of a text-sm row. */}
                  <Skeleton className={`my-0.5 h-4 ${width}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventsTable({ contractId }: { contractId: number }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const response = await fetch(`/api/contracts/${contractId}/events?limit=20`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`request failed with ${response.status}`);
        }
        const body = (await response.json()) as { data: EventRow[] };
        if (!cancelled) {
          setEvents(body.data);
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
  }, [contractId]);

  if (loading) {
    return <EventsTableSkeleton />;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">Couldn&apos;t refresh events: {error}</p>}
      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Events will appear here automatically as the indexer picks up activity for this contract."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <EventsTableHead />
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
      )}
    </div>
  );
}
