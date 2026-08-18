import { Head, router, useForm } from '@inertiajs/react';
import { Music2, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Tone = {
    id: number;
    name: string;
    url: string;
    created_at: string;
    updated_at: string;
};

type ToneFormData = {
    name: string;
    url: string;
};

export default function TonesIndex({ tones }: { tones: Tone[] }) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm<ToneFormData>({
        name: '',
        url: '',
    });

    const editForm = useForm<ToneFormData>({
        name: '',
        url: '',
    });

    const editingTone = useMemo(
        () => tones.find((tone) => tone.id === editingId) ?? null,
        [editingId, tones],
    );

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        createForm.post('/tones', {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const beginEdit = (tone: Tone) => {
        setEditingId(tone.id);
        editForm.setData({
            name: tone.name,
            url: tone.url,
        });
        editForm.clearErrors();
    };

    const submitEdit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingTone) {
            return;
        }

        editForm.put(`/tones/${editingTone.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingId(null);
                editForm.reset();
            },
        });
    };

    const removeTone = (tone: Tone) => {
        const confirmed = window.confirm(
            `¿Eliminar el tono "${tone.name}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(`/tones/${tone.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Tonos · tuneOps" />

            <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-2 sm:px-6 lg:px-8">
                <div className="bg-brand-gradient animate-gradient-shift relative overflow-hidden rounded-2xl p-6 shadow-lg sm:p-8">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative flex items-center gap-4">
                        <div className="transition-smooth animate-pulse-glow flex size-14 items-center justify-center rounded-xl bg-black/30 ring-2 ring-white/20 backdrop-blur-sm hover:scale-110 hover:rotate-3">
                            <Music2 className="size-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                tuneOps · Tonos
                            </h1>
                            <p className="mt-1 text-sm text-white/80 sm:text-base">
                                CRUD simple para gestionar tonos guardados del
                                bot
                            </p>
                        </div>
                    </div>
                </div>

                <div className="animate-fade-in-up">
                    <Heading
                        title="Gestión de tonos"
                        description="Crea, edita y elimina los tonos personalizados que usa el bot en Discord."
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <form
                        onSubmit={submitCreate}
                        className="transition-smooth animate-fade-in-up space-y-4 rounded-2xl border border-primary/30 bg-card p-5 text-card-foreground shadow-sm focus-within:-translate-y-0.5 focus-within:border-primary focus-within:shadow-lg focus-within:ring-2 focus-within:ring-primary/30 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
                    >
                        <h2 className="flex items-center gap-2 text-base font-medium text-card-foreground">
                            <span className="bg-brand-gradient transition-smooth inline-block size-2 rounded-full group-hover:scale-125" />
                            Crear tono
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-name"
                                    className="text-card-foreground"
                                >
                                    Nombre
                                </Label>
                                <Input
                                    id="create-name"
                                    value={createForm.data.name}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="ej: intro"
                                    className="transition-smooth text-card-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
                                />
                                <InputError message={createForm.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="create-url"
                                    className="text-card-foreground"
                                >
                                    Link
                                </Label>
                                <Input
                                    id="create-url"
                                    value={createForm.data.url}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'url',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="transition-smooth text-card-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
                                />
                                <InputError message={createForm.errors.url} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className="bg-brand-gradient transition-smooth font-semibold text-black shadow-md hover:scale-105 hover:shadow-lg active:scale-95"
                            >
                                Guardar tono
                            </Button>
                        </div>
                    </form>

                    {editingTone && (
                        <form
                            onSubmit={submitEdit}
                            className="transition-smooth animate-fade-in-up-1 space-y-4 rounded-2xl border border-accent/40 bg-card p-5 text-card-foreground shadow-sm ring-1 ring-accent/20 hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium text-card-foreground">
                                <span className="inline-block size-2 rounded-full bg-accent" />
                                Editar tono: {editingTone.name}
                            </h2>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="edit-name"
                                        className="text-card-foreground"
                                    >
                                        Nombre
                                    </Label>
                                    <Input
                                        id="edit-name"
                                        value={editForm.data.name}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        className="transition-smooth text-card-foreground placeholder:text-muted-foreground focus-visible:ring-accent/40"
                                    />
                                    <InputError
                                        message={editForm.errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="edit-url"
                                        className="text-card-foreground"
                                    >
                                        Link
                                    </Label>
                                    <Input
                                        id="edit-url"
                                        value={editForm.data.url}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'url',
                                                event.target.value,
                                            )
                                        }
                                        className="transition-smooth text-card-foreground placeholder:text-muted-foreground focus-visible:ring-accent/40"
                                    />
                                    <InputError message={editForm.errors.url} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setEditingId(null);
                                        editForm.reset();
                                        editForm.clearErrors();
                                    }}
                                    className="transition-smooth hover:scale-105 active:scale-95"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="transition-smooth bg-accent font-semibold text-accent-foreground shadow-md hover:scale-105 hover:shadow-lg active:scale-95"
                                >
                                    Guardar cambios
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="animate-fade-in-up-2 overflow-hidden rounded-2xl border border-sidebar-border/70 bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="bg-brand-gradient text-black">
                                    <th className="px-4 py-3 text-left font-semibold">
                                        Nombre
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold">
                                        Link
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tones.length === 0 ? (
                                    <tr>
                                        <td
                                            className="px-4 py-6 text-muted-foreground"
                                            colSpan={3}
                                        >
                                            No hay tonos guardados. Crea uno
                                            usando el formulario de arriba.
                                        </td>
                                    </tr>
                                ) : (
                                    tones.map((tone, index) => (
                                        <tr
                                            key={tone.id}
                                            className="group transition-smooth border-t border-sidebar-border/70 hover:translate-x-1 hover:bg-primary/5"
                                            style={{
                                                animation: `fade-in-up 0.4s ease-out ${index * 0.04}s both`,
                                            }}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="transition-smooth inline-block size-1.5 rounded-full bg-primary group-hover:scale-150" />
                                                    {tone.name}
                                                </span>
                                            </td>
                                            <td className="transition-smooth max-w-[380px] truncate px-4 py-3 text-muted-foreground hover:text-foreground">
                                                {tone.url}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            beginEdit(tone)
                                                        }
                                                        className="transition-smooth border-accent/40 text-accent hover:scale-105 hover:bg-accent hover:text-accent-foreground active:scale-95"
                                                    >
                                                        <Pencil className="size-4" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() =>
                                                            removeTone(tone)
                                                        }
                                                        className="transition-smooth hover:scale-105 active:scale-95"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="border-t border-sidebar-border/70 pt-4 text-center text-xs text-muted-foreground">
                    tuneOps · cyan + purple + magenta · powered by{' '}
                    <span className="text-brand-gradient font-semibold">
                        yt-dlp
                    </span>
                </footer>
            </div>
        </>
    );
}

TonesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Tonos',
            href: '/tones',
        },
    ],
};
