'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Player, Position } from '@mockingboard/shared';
import { getErrorMessage } from '@/lib/validate';

const ALL_POSITIONS: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'OT',
  'OG',
  'C',
  'EDGE',
  'DL',
  'LB',
  'CB',
  'S',
];
const PAGE_SIZE = 50;

interface ProspectsEditorProps {
  initialYear: number;
}

export function ProspectsEditor({ initialYear }: ProspectsEditorProps) {
  const [year, setYear] = useState(initialYear);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Player>>({});

  const fetchPlayers = useCallback(
    async (newOffset = 0) => {
      setLoading(true);
      setMessage(null);
      try {
        const params = new URLSearchParams({
          year: String(year),
          limit: String(PAGE_SIZE),
          offset: String(newOffset),
        });
        if (search) params.set('search', search);
        if (posFilter) params.set('position', posFilter);

        const res = await fetch(`/api/admin/prospects?${params}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setPlayers(data.players);
        setTotal(data.total);
        setOffset(newOffset);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load prospects.' });
      } finally {
        setLoading(false);
      }
    },
    [year, search, posFilter],
  );

  const handleSearch = () => {
    setOffset(0);
    fetchPlayers(0);
  };

  const handleEdit = (player: Player) => {
    setEditing(player.id);
    setEditData({
      name: player.name,
      position: player.position,
      school: player.school,
      consensusRank: player.consensusRank,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setMessage(null);
    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing, ...editData }),
      });
      if (!res.ok) throw new Error('Save failed');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === editing ? ({ ...p, ...editData } as Player) : p,
        ),
      );
      setEditing(null);
      setMessage({ type: 'success', text: 'Player updated.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Save failed'),
      });
    }
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/prospects?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
      setMessage({ type: 'success', text: 'Player deleted.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Delete failed'),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || 0)}
          className="w-24"
        />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search name or school..."
          className="w-48"
        />
        <Select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
        >
          <option value="">All Positions</option>
          {ALL_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Button onClick={handleSearch} disabled={loading} size="sm">
          {loading ? 'Loading...' : 'Search'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {total > 0 ? `${total} results` : ''}
        </span>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Results table */}
      {players.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Prospects ({offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{' '}
              {total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-2">Rank</th>
                    <th className="pb-2 pr-2">Name</th>
                    <th className="pb-2 pr-2">Pos</th>
                    <th className="pb-2 pr-2">School</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) =>
                    editing === p.id ? (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            value={editData.consensusRank ?? 0}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                consensusRank: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-16 text-xs"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="text"
                            value={editData.name ?? ''}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            className="w-40 text-xs"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Select
                            value={editData.position ?? ''}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                position: e.target.value as Position,
                              }))
                            }
                            className="text-xs"
                          >
                            {ALL_POSITIONS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="text"
                            value={editData.school ?? ''}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                school: e.target.value,
                              }))
                            }
                            className="w-32 text-xs"
                          />
                        </td>
                        <td className="flex items-center gap-1 py-1.5">
                          <Button
                            size="sm"
                            onClick={handleSave}
                            className="text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(null)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={p.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">
                          {p.consensusRank}
                        </td>
                        <td className="py-1.5 pr-2 font-medium">{p.name}</td>
                        <td className="py-1.5 pr-2">
                          <Badge variant="outline" className="text-xs">
                            {p.position}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-2 text-muted-foreground">
                          {p.school}
                        </td>
                        <td className="flex items-center gap-1 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(p)}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => fetchPlayers(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => fetchPlayers(offset + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && players.length === 0 && total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No prospects found. Enter a year and click Search.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
