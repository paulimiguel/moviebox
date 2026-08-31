import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { api } from "@/services/api";
import type { MovieCollection } from "@/types/movie";
import { Link } from "react-router-dom";

export const CollectionsPage = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MovieCollection | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: api.collections.getAll,
  });
  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.collections.update(editing.id, {
            name,
            description: description || null,
          })
        : api.collections.create({ name, description: description || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setCreating(false);
      setEditing(null);
      setName("");
      setDescription("");
    },
    onError: (reason: Error) => setError(reason.message),
  });
  const remove = useMutation({
    mutationFn: api.collections.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["collections"] }),
  });
  const openEdit = (collection: MovieCollection) => {
    setEditing(collection);
    setCreating(false);
    setName(collection.name);
    setDescription(collection.description || "");
    setError("");
  };
  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setName("");
    setDescription("");
    setError("");
  };
  return (
    <main className="min-h-screen bg-canvas">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Colecciones</h1>
            <p className="mt-1 text-sm text-slate-500">
              Organiza titulos sin duplicarlos.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="primary-button ml-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
        </div>
        {(creating || editing) && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) save.mutate();
            }}
            className="mt-6 border-y border-slate-200 bg-white p-4 sm:rounded-md sm:border sm:p-5"
          >
            <h2 className="font-semibold text-ink">
              {editing ? "Editar coleccion" : "Nueva coleccion"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <input
                className="control w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                autoFocus
              />
              <input
                className="control w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion opcional"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
                  className="secondary-button"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={save.isPending}
                >
                  Guardar
                </button>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>
        )}
        {collections.isLoading ? (
          <div className="grid min-h-[50vh] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-aqua" />
          </div>
        ) : collections.data?.length ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.data.map((collection) => (
              <article
                key={collection.id}
                className="rounded-md border border-slate-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-start">
                  <FolderOpen className="h-8 w-8 text-aqua" />
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(collection)}
                      className="icon-button border-0 shadow-none"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Eliminar la coleccion ${collection.name}? Los titulos no se eliminaran.`,
                          )
                        )
                          remove.mutate(collection.id);
                      }}
                      className="icon-button border-0 text-red-600 shadow-none"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <Link to={`/colecciones/${collection.id}`}>
                  <h2 className="mt-4 text-lg font-semibold text-ink hover:text-coral">
                    {collection.name}
                  </h2>
                </Link>
                {collection.description && (
                  <p className="mt-2 text-sm text-slate-500">
                    {collection.description}
                  </p>
                )}
                <p className="mt-4 text-xs font-semibold uppercase text-slate-400">
                  {collection.movieCount}{" "}
                  {collection.movieCount === 1 ? "titulo" : "titulos"}
                </p>
              </article>
            ))}
          </section>
        ) : (
          <div className="grid min-h-[50vh] place-items-center text-center">
            <div>
              <FolderOpen className="mx-auto h-14 w-14 text-aqua" />
              <h2 className="mt-3 font-semibold text-ink">
                Todavia no hay colecciones
              </h2>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
