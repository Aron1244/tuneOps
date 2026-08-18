import { Head, Link, usePage } from '@inertiajs/react';
import { Bot, ListMusic, Radio } from 'lucide-react';
import { login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="tuneOps" />

            <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
                <div className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-40">
                    <div className="animate-blob-drift absolute -top-32 -left-32 size-96 rounded-full bg-primary/40 blur-3xl" />
                    <div className="animate-blob-drift-slow absolute top-1/3 -right-32 size-96 rounded-full bg-accent/40 blur-3xl" />
                    <div className="animate-blob-drift absolute bottom-0 left-1/3 size-96 rounded-full bg-destructive/30 blur-3xl" />
                </div>

                <header className="relative border-b border-border/40 backdrop-blur-sm">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                        <Link href="/" className="flex items-center gap-3">
                            <img
                                src="/tuneOpsAvatar.jpg"
                                alt="tuneOps"
                                className="transition-smooth size-10 rounded-lg object-cover ring-2 ring-primary/40 hover:ring-primary"
                            />
                            <div>
                                <p className="text-lg font-semibold tracking-tight">
                                    <span className="animate-shimmer-text">
                                        tuneOps
                                    </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Discord music bot control panel
                                </p>
                            </div>
                        </Link>

                        {auth.user ? (
                            <Link
                                href="/tones"
                                className="bg-brand-gradient transition-smooth rounded-md px-4 py-2 text-sm font-semibold text-black shadow-md hover:scale-105 hover:opacity-90 active:scale-95"
                            >
                                Ir a Tonos
                            </Link>
                        ) : (
                            <Link
                                href={login()}
                                className="bg-brand-gradient transition-smooth rounded-md px-4 py-2 text-sm font-semibold text-black shadow-md hover:scale-105 hover:opacity-90 active:scale-95"
                            >
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </header>

                <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 sm:py-16">
                    <section className="grid items-center gap-10 lg:grid-cols-2">
                        <div className="animate-fade-in-up">
                            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                <Bot className="size-3.5" />
                                Bot de Discord · tuneOps
                            </p>
                            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                                <span className="animate-shimmer-text">
                                    tuneOps
                                </span>
                            </h1>
                            <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                                Gestioná los tonos del bot
                            </p>
                            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                                Crea, editá y eliminá los{' '}
                                <span className="font-semibold text-primary">
                                    tonos personalizados
                                </span>{' '}
                                que el bot reproduce en Discord con un comando
                                slash. Todo desde un panel simple.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                {auth.user ? (
                                    <Link
                                        href="/tones"
                                        className="bg-brand-gradient transition-smooth inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-black shadow-md hover:scale-105 hover:shadow-lg active:scale-95"
                                    >
                                        <ListMusic className="size-4" />
                                        Ir a gestión de tonos
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className="bg-brand-gradient transition-smooth animate-pulse-glow inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-black shadow-md hover:scale-105 hover:shadow-lg active:scale-95"
                                    >
                                        <ListMusic className="size-4" />
                                        Entrar al panel
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="animate-fade-in-up-1 relative mx-auto w-full max-w-md lg:max-w-none">
                            <div className="bg-brand-gradient animate-gradient-shift absolute -inset-4 rounded-3xl opacity-30 blur-2xl" />
                            <img
                                src="/tuneOpsAvatar.jpg"
                                alt="tuneOps avatar"
                                className="animate-float-soft transition-smooth relative w-full rounded-3xl border-2 border-primary/30 shadow-2xl ring-1 ring-white/10 hover:scale-[1.02] hover:border-primary/60"
                            />
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <article className="group animate-fade-in-up transition-smooth rounded-xl border border-primary/30 bg-card/60 p-5 shadow-sm backdrop-blur-sm hover:-translate-y-1 hover:border-primary hover:shadow-lg">
                            <div className="transition-smooth mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:scale-110 group-hover:bg-primary/25">
                                <Radio className="size-5" />
                            </div>
                            <h2 className="text-base font-semibold">
                                Reproducción en Discord
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                El bot usa{' '}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                    yt-dlp
                                </code>{' '}
                                para extraer audio y reproducirlo en el canal de
                                voz donde estés.
                            </p>
                        </article>

                        <article className="group animate-fade-in-up-1 transition-smooth rounded-xl border border-accent/30 bg-card/60 p-5 shadow-sm backdrop-blur-sm hover:-translate-y-1 hover:border-accent hover:shadow-lg">
                            <div className="transition-smooth mb-3 flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent group-hover:scale-110 group-hover:bg-accent/25">
                                <ListMusic className="size-5" />
                            </div>
                            <h2 className="text-base font-semibold">
                                CRUD de tonos
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Guardá un nombre (ej.{' '}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                    intro
                                </code>
                                ) y un link de YouTube. Reproducí con{' '}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                    /tono intro
                                </code>
                                .
                            </p>
                        </article>

                        <article className="group animate-fade-in-up-2 transition-smooth rounded-xl border border-destructive/30 bg-card/60 p-5 shadow-sm backdrop-blur-sm hover:-translate-y-1 hover:border-destructive hover:shadow-lg">
                            <div className="transition-smooth mb-3 flex size-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive group-hover:scale-110 group-hover:bg-destructive/25">
                                <Bot className="size-5" />
                            </div>
                            <h2 className="text-base font-semibold">
                                Stack del bot
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Node.js · discord.js · yt-dlp · Laravel · React
                                · Redis · MariaDB · Docker.
                            </p>
                        </article>
                    </section>

                    <footer className="animate-fade-in-up-3 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
                        <span className="animate-shimmer-text font-semibold">
                            tuneOps
                        </span>{' '}
                        · cyan · purple · magenta
                    </footer>
                </main>
            </div>
        </>
    );
}
