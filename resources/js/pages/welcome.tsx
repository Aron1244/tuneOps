import { Head, Link, usePage } from '@inertiajs/react';
import { Bot, ListMusic, Radio, Server } from 'lucide-react';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="tuneOps" />

            <div className="min-h-screen bg-background text-foreground">
                <header className="border-b border-border/70">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                        <div>
                            <p className="text-lg font-semibold">tuneOps</p>
                            <p className="text-xs text-muted-foreground">
                                Discord music bot control panel
                            </p>
                        </div>

                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                            >
                                Ir al panel
                            </Link>
                        ) : (
                            <Link
                                href={login()}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                            >
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
                    <section className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                            <Bot className="size-3.5" />
                            Proyecto en producción
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            Administra tonos y reproducción de tu bot de Discord
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            tuneOps integra Discord, Laravel y Redis para
                            gestionar colas, playlists y tonos personalizados
                            desde un panel web simple.
                        </p>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <article className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
                            <Radio className="mb-3 size-5 text-primary" />
                            <h2 className="text-base font-medium">
                                Reproducción en tiempo real
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Encola y reproduce contenido con control por
                                comandos slash.
                            </p>
                        </article>

                        <article className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
                            <ListMusic className="mb-3 size-5 text-primary" />
                            <h2 className="text-base font-medium">
                                CRUD de tonos
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Crea, edita y elimina tonos guardados para
                                usarlos rápidamente en Discord.
                            </p>
                        </article>

                        <article className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
                            <Server className="mb-3 size-5 text-primary" />
                            <h2 className="text-base font-medium">
                                Arquitectura robusta
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Bot Node.js + API Laravel + Redis + MariaDB con
                                despliegue vía Docker.
                            </p>
                        </article>
                    </section>
                </main>
            </div>
        </>
    );
}
