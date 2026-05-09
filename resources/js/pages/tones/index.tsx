import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
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
            <Head title="Tonos" />

            <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-2 sm:px-6 lg:px-8">
                <Heading
                    title="Tonos"
                    description="CRUD simple para gestionar tonos guardados del bot"
                />

                <div className="grid gap-6 xl:grid-cols-2">
                    <form
                        onSubmit={submitCreate}
                        className="space-y-4 rounded-2xl border border-sidebar-border/70 bg-card p-5 shadow-sm"
                    >
                        <h2 className="text-base font-medium">Crear tono</h2>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create-name">Nombre</Label>
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
                                />
                                <InputError message={createForm.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-url">Link</Label>
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
                                />
                                <InputError message={createForm.errors.url} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Guardar tono
                            </Button>
                        </div>
                    </form>

                    {editingTone && (
                        <form
                            onSubmit={submitEdit}
                            className="space-y-4 rounded-2xl border border-sidebar-border/70 bg-card p-5 shadow-sm"
                        >
                            <h2 className="text-base font-medium">
                                Editar tono: {editingTone.name}
                            </h2>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Nombre</Label>
                                    <Input
                                        id="edit-name"
                                        value={editForm.data.name}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={editForm.errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-url">Link</Label>
                                    <Input
                                        id="edit-url"
                                        value={editForm.data.url}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'url',
                                                event.target.value,
                                            )
                                        }
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
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                >
                                    Guardar cambios
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-sidebar-border/70 bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-muted/40">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Nombre
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Link
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
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
                                            No hay tonos guardados.
                                        </td>
                                    </tr>
                                ) : (
                                    tones.map((tone) => (
                                        <tr
                                            key={tone.id}
                                            className="border-t border-sidebar-border/70"
                                        >
                                            <td className="px-4 py-3">
                                                {tone.name}
                                            </td>
                                            <td className="max-w-[380px] truncate px-4 py-3 text-muted-foreground">
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
