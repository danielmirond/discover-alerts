import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 font-serif text-7xl font-bold tracking-tight text-accent">
        404
      </div>
      <h1 className="mb-3 font-serif text-3xl font-bold text-ink">
        Esta página no existe en el BOE
      </h1>
      <p className="mb-8 max-w-md text-neutral-700">
        La URL que has abierto no corresponde a ningún artículo publicado.
        Es posible que la hayamos retirado o que el enlace esté mal formado.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-paper no-underline hover:bg-accent"
        >
          Volver a la portada
        </Link>
        <Link
          href="/boe"
          className="rounded-sm border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-ink no-underline hover:border-accent hover:text-accent"
        >
          Resúmenes BOE
        </Link>
      </div>
    </div>
  );
}
