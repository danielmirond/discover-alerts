import type { BoeItem } from '../types.js';

const BASE_URL = 'https://www.boe.es/datosabiertos/api/boe/sumario';

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// url_pdf can be a plain string or an object with a texto field when it has attributes
function extractUrl(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') return (val.texto ?? val['#text'] ?? '').toString().trim();
  return '';
}

function todayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function extractItems(data: any): BoeItem[] {
  const items: BoeItem[] = [];
  const sumario = data?.data?.sumario ?? data?.sumario;
  if (!sumario) return items;

  const diarios = toArray(sumario.diario);

  for (const diario of diarios) {
    const secciones = toArray(diario.seccion);

    for (const seccion of secciones) {
      const seccionNombre = seccion?.['@nombre'] ?? seccion?.nombre ?? '';
      const departamentos = toArray(seccion.departamento);

      for (const depto of departamentos) {
        const deptoNombre = depto?.['@nombre'] ?? depto?.nombre ?? '';
        // Epigrafes can be direct children or nested under a texto element
        const epigrafes = [
          ...toArray(depto.epigrafe),
          ...toArray(depto.texto?.epigrafe),
        ];

        for (const epigrafe of epigrafes) {
          const epigrafeNombre = epigrafe?.['@nombre'] ?? epigrafe?.nombre ?? '';
          const rawItems = toArray(epigrafe.item);

          for (const item of rawItems) {
            const titulo = item?.titulo ?? '';
            const identificador = item?.identificador ?? '';
            if (!titulo && !identificador) continue;

            items.push({
              identificador,
              titulo,
              urlPdf: extractUrl(item?.urlPdf ?? item?.url_pdf),
              urlHtml: extractUrl(item?.urlHtml ?? item?.url_html),
              seccion: seccionNombre,
              departamento: deptoNombre,
              epigrafe: epigrafeNombre,
            });
          }
        }

        // Items can also be directly under departamento without epigrafe
        const directItems = toArray(depto.item);
        for (const item of directItems) {
          const titulo = item?.titulo ?? '';
          const identificador = item?.identificador ?? '';
          if (!titulo && !identificador) continue;

          items.push({
            identificador,
            titulo,
            urlPdf: extractUrl(item?.urlPdf ?? item?.url_pdf),
            urlHtml: extractUrl(item?.urlHtml ?? item?.url_html),
            seccion: seccionNombre,
            departamento: deptoNombre,
            epigrafe: '',
          });
        }
      }
    }
  }

  return items;
}

export async function fetchBoeSumario(date?: string): Promise<BoeItem[]> {
  const dateStr = date ?? todayDateStr();
  const url = `${BASE_URL}/${dateStr}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    // BOE returns 404 on days with no publication (Sundays, holidays)
    if (res.status === 404) {
      console.log(`[boe] No BOE published for ${dateStr}`);
      return [];
    }
    const text = await res.text().catch(() => '');
    throw new Error(`BOE API ${res.status}: ${text}`);
  }

  const json = await res.json();
  return extractItems(json);
}
