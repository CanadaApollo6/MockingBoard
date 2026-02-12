'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/colors/position-colors';
import type { RosterPlayerWithTeam } from '@/lib/cache';

const POSITION_FILTERS = [
  'All',
  'QB',
  'RB',
  'WR',
  'TE',
  'OL',
  'DL',
  'LB',
  'DB',
  'K/P',
] as const;

const OL_POSITIONS = new Set(['OT', 'OG', 'C', 'G', 'T']);
const DL_POSITIONS = new Set(['DE', 'DT', 'NT']);
const LB_POSITIONS = new Set(['LB', 'OLB', 'ILB', 'MLB']);
const DB_POSITIONS = new Set(['CB', 'S', 'FS', 'SS']);
const KP_POSITIONS = new Set(['K', 'P', 'LS']);

function matchesPositionFilter(
  position: string,
  filter: (typeof POSITION_FILTERS)[number],
): boolean {
  if (filter === 'All') return true;
  if (filter === 'OL') return OL_POSITIONS.has(position);
  if (filter === 'DL') return DL_POSITIONS.has(position);
  if (filter === 'LB') return LB_POSITIONS.has(position);
  if (filter === 'DB') return DB_POSITIONS.has(position);
  if (filter === 'K/P') return KP_POSITIONS.has(position);
  return position === filter;
}

interface NflPlayerDirectoryProps {
  players: RosterPlayerWithTeam[];
}

export function NflPlayerDirectory({ players }: NflPlayerDirectoryProps) {
  const [query, setQuery] = useState('');
  const [positionFilter, setPositionFilter] =
    useState<(typeof POSITION_FILTERS)[number]>('All');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return players.filter((p) => {
      if (!matchesPositionFilter(p.position, positionFilter)) return false;
      if (q.length < 2) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.college.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.teamAbbreviation.toLowerCase().includes(q)
      );
    });
  }, [players, query, positionFilter]);

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, team, college..."
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POSITION_FILTERS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                pos === positionFilter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length.toLocaleString()} players
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-16">Pos</TableHead>
              <TableHead className="w-16">Status</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>College</TableHead>
              <TableHead className="w-12">Age</TableHead>
              <TableHead className="w-12">Exp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 200).map((p) => (
              <TableRow key={`${p.teamAbbreviation}-${p.id}`}>
                <TableCell className="font-medium">
                  <Link
                    href={`/players/${p.id}`}
                    className="text-mb-accent hover:underline"
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    style={{
                      backgroundColor: getPositionColor(p.position),
                      color: '#0A0A0B',
                    }}
                    className="px-1.5 py-0 text-xs"
                  >
                    {p.position}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`whitespace-nowrap px-1.5 py-0 text-xs ${
                      p.status === 'Active' ? 'text-mb-accent' : 'text-red-400'
                    }`}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <Link
                    href={`/teams/${p.teamAbbreviation}`}
                    className="hover:underline"
                  >
                    {p.teamName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.college}
                </TableCell>
                <TableCell className="font-mono text-sm">{p.age}</TableCell>
                <TableCell className="font-mono text-sm">
                  {p.experience === 0 ? 'R' : p.experience}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 200 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing first 200 of {filtered.length.toLocaleString()} results. Use
          search to narrow down.
        </p>
      )}
    </div>
  );
}
