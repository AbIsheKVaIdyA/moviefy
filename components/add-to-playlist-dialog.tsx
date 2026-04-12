"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus } from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMovieToPlaylistDb,
  createPlaylist,
  fetchUserPlaylists,
} from "@/lib/supabase/playlist-service";
import type { Movie, Playlist } from "@/lib/types";

export type AddToPlaylistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movie: Movie | null;
  client: SupabaseClient | null;
  userId: string | null;
  onNotify?: (message: string) => void;
  /** Called after a successful add or create+add */
  onUpdated?: () => void | Promise<void>;
  /** Optional: parent can focus that list (e.g. Your theatre sidebar). */
  onAddedToPlaylist?: (playlistId: string) => void;
  /** Post–sign-in return URL (defaults to `/app`). */
  signInNextPath?: string;
};

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  movie,
  client,
  userId,
  onNotify,
  onUpdated,
  onAddedToPlaylist,
  signInNextPath = "/app",
}: AddToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newKind, setNewKind] = useState<Playlist["kind"]>("collection");
  const [creating, setCreating] = useState(false);

  const notify = useCallback(
    (m: string) => {
      onNotify?.(m);
    },
    [onNotify],
  );

  const load = useCallback(async () => {
    if (!client || !userId) {
      setPlaylists([]);
      return;
    }
    setLoading(true);
    try {
      const pl = await fetchUserPlaylists(client, userId);
      setPlaylists(pl);
    } finally {
      setLoading(false);
    }
  }, [client, userId]);

  useEffect(() => {
    if (!open) {
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewKind("collection");
      setAddingId(null);
      return;
    }
    void load();
  }, [open, load]);

  async function pickPlaylist(pl: Playlist) {
    if (!client || !movie) return;
    setAddingId(pl.id);
    try {
      const ok = await addMovieToPlaylistDb(client, pl.id, movie);
      if (!ok) {
        notify("Could not add to that list (duplicate or error).");
        return;
      }
      onOpenChange(false);
      notify(`Added to “${pl.name}”`);
      onAddedToPlaylist?.(pl.id);
      await onUpdated?.();
    } finally {
      setAddingId(null);
    }
  }

  async function submitCreate() {
    if (!client || !userId || !movie) return;
    setCreating(true);
    try {
      const pl = await createPlaylist(client, userId, {
        name: newName.trim() || "Untitled playlist",
        description: newDesc.trim() || "No description yet.",
        kind: newKind,
      });
      if (!pl) {
        notify("Could not create playlist");
        return;
      }
      const added = await addMovieToPlaylistDb(client, pl.id, movie);
      onOpenChange(false);
      setShowCreate(false);
      notify(
        added
          ? `Created “${pl.name}” and added “${movie.title}”`
          : `Created “${pl.name}” — open Your theatre to add this title if needed.`,
      );
      onAddedToPlaylist?.(pl.id);
      await onUpdated?.();
    } finally {
      setCreating(false);
    }
  }

  const signedIn = Boolean(client && userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 bg-[#1e1e1e] text-white sm:max-w-md">
        {!signedIn ? (
          <>
            <DialogHeader>
              <DialogTitle>Add to playlist</DialogTitle>
              <DialogDescription className="text-white/70">
                Sign in to save this title to one of your lists in Your theatre.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" className="border-white/15" asChild>
                <Link
                  href={`/?auth=sign-in&next=${encodeURIComponent(signInNextPath)}`}
                >
                  Sign in
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : showCreate ? (
          <>
            <DialogHeader>
              <DialogTitle>New playlist</DialogTitle>
              <DialogDescription className="text-white/70">
                {movie
                  ? `Create a list and add “${movie.title}”.`
                  : "Create a new playlist."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="add-pl-name">Name</Label>
                <Input
                  id="add-pl-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Weekend classics"
                  className="border-white/10 bg-[#252525]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-pl-desc">Description</Label>
                <Input
                  id="add-pl-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional"
                  className="border-white/10 bg-[#252525]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select
                  value={newKind}
                  onValueChange={(v) =>
                    setNewKind((v ?? "collection") as Playlist["kind"])
                  }
                >
                  <SelectTrigger className="border-white/10 bg-[#252525]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collection">Playlist</SelectItem>
                    <SelectItem value="watched">Watched log</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                variant="outline"
                className="w-full border-white/15"
                disabled={creating}
                onClick={() => setShowCreate(false)}
              >
                Back
              </Button>
              <Button
                className="w-full"
                disabled={creating}
                onClick={() => void submitCreate()}
              >
                {creating ? "Creating…" : "Create and add"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add to playlist</DialogTitle>
              <DialogDescription className="text-white/70">
                {movie
                  ? `Choose a list for “${movie.title}”, or create a new one.`
                  : "Choose a list for this title."}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-72">
              {loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Loading your lists…
                </p>
              ) : playlists.length === 0 ? (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    You do not have a playlist yet. Create one, then we will add this title.
                  </p>
                  <Button className="w-full" onClick={() => setShowCreate(true)}>
                    <Plus className="size-4" />
                    Create playlist
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1 py-1">
                  {playlists.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={addingId !== null}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-white/5 disabled:opacity-50"
                        onClick={() => void pickPlaylist(p)}
                      >
                        <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                          <PosterImage
                            src={p.movies[0]?.posterImage ?? ""}
                            alt=""
                            fill
                            placeholderGradient={
                              p.movies[0]?.posterClass ?? "from-zinc-700 to-zinc-900"
                            }
                            className="object-cover"
                            sizes="28px"
                          />
                        </div>
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {addingId === p.id ? "…" : `${p.movies.length} titles`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            {!loading && playlists.length > 0 ? (
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  variant="outline"
                  className="w-full border-white/15"
                  disabled={addingId !== null}
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="size-4" />
                  Create new playlist
                </Button>
              </DialogFooter>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
