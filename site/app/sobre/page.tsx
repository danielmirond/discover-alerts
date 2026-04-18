import { siteConfig } from '@/lib/site-config';

export const metadata = {
  title: 'Quiénes somos',
  description: `Sobre ${siteConfig.name}: misión, metodología editorial y uso de IA.`,
};

export default function AboutPage() {
  return (
    <article className="prose prose-neutral max-w-none prose-headings:font-serif prose-a:text-accent">
      <h1>Quiénes somos</h1>

      <p>
        <strong>{siteConfig.name}</strong> es un medio digital que traduce
        el Boletín Oficial del Estado al lenguaje de la calle. Publicamos un
        resumen diario de lo que el BOE saca y noticias con foco en el
        impacto real: tu nómina, tu calendario, tus obligaciones y tus
        derechos.
      </p>

      <h2>Metodología editorial</h2>
      <p>
        Cada día leemos el sumario completo del BOE, identificamos las
        disposiciones con impacto ciudadano directo y las contrastamos con
        lo que está generando conversación y búsquedas en España. De ahí
        salen nuestros dos formatos:
      </p>
      <ul>
        <li>
          <strong>Resumen BOE diario</strong>: qué se publicó, ordenado por
          relevancia ciudadana.
        </li>
        <li>
          <strong>Noticias de impacto</strong>: artículos que explican una
          disposición concreta con contexto y consecuencias prácticas.
        </li>
      </ul>

      <h2>Uso de inteligencia artificial</h2>
      <p>
        Creemos en la transparencia. {siteConfig.name} utiliza modelos de
        inteligencia artificial para asistir en la redacción a partir de
        fuentes oficiales del BOE. Todo contenido publicado:
      </p>
      <ul>
        <li>Parte exclusivamente de documentos oficiales del Boletín Oficial del Estado.</li>
        <li>Incluye enlaces a las fuentes originales (PDF y HTML del BOE).</li>
        <li>Es revisado por un editor humano antes de publicar.</li>
        <li>Lleva declaración visible de asistencia por IA al final de cada pieza.</li>
      </ul>
      <p>
        Si detectas un error, escríbenos a{' '}
        <a href={`mailto:${siteConfig.authors[0].email}`}>
          {siteConfig.authors[0].email}
        </a>{' '}
        y lo corregiremos con constancia pública de la modificación.
      </p>

      <h2>Contacto</h2>
      <p>
        Redacción:{' '}
        <a href={`mailto:${siteConfig.authors[0].email}`}>
          {siteConfig.authors[0].email}
        </a>
      </p>
    </article>
  );
}
