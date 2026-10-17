"use client";

import Link from "next/link";
import { useState } from "react";
import type { Contract } from "@/lib/api";

type SortKey = "address" | "name" | "network";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "address", label: "Address" },
  { key: "name", label: "Name" },
  { key: "network", label: "Network" }
];

export function ContractsTable({ contracts }: { contracts: Contract[] }) {
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);

  function handleSort(key: SortKey) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const networks = Array.from(new Set(contracts.map((contract) => contract.network))).sort();
  const normalizedQuery = query.trim().toLowerCase();
  const visibleContracts = contracts.filter(
    (contract) =>
      (network === "all" || contract.network === network) &&
      (!normalizedQuery ||
        contract.address.toLowerCase().includes(normalizedQuery) ||
        (contract.name ?? "").toLowerCase().includes(normalizedQuery))
  );
  if (sort) {
    visibleContracts.sort((a, b) => {
      const result = (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "");
      return sort.direction === "asc" ? result : -result;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="max-w-sm flex-1">
          <label htmlFor="contracts-search" className="sr-only">
            Filter contracts
          </label>
          <input
            id="contracts-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by address or name"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="contracts-network" className="sr-only">
            Filter by network
          </label>
          <select
            id="contracts-network"
            value={network}
            onChange={(event) => setNetwork(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All networks</option>
            {networks.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Registered contracts with address, name and network. Column headers sort the table.
          </caption>
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              {COLUMNS.map((column) => {
                const direction = sort?.key === column.key ? sort.direction : null;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"
                    }
                    className="py-2 font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      {column.label}
                      <span aria-hidden="true" className={direction ? "" : "text-gray-300"}>
                        {direction === "desc" ? "↓" : "↑"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleContracts.map((contract) => (
              <tr key={contract.id} className="border-b border-gray-100">
                <td className="py-2 font-mono text-xs">
                  <Link href={`/contracts/${contract.id}`} className="hover:underline">
                    {contract.address}
                  </Link>
                </td>
                <td className="py-2">{contract.name ?? "—"}</td>
                <td className="py-2">{contract.network}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleContracts.length === 0 && (
        <p className="text-sm text-gray-500">No contracts match the current filters.</p>
      )}
    </div>
  );
}
