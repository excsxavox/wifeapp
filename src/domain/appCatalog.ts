/** Tipos de gasto para clasificar apps instaladas. */
export type AppKind = 'banca' | 'comida' | 'entretenimiento' | 'movilidad' | 'otros';

export type CatalogApp = {
  label: string;
  androidPackage: string;
  kind: AppKind;
  suggested: boolean;
};

export const KIND_TO_CATEGORY_NAME: Record<AppKind, string> = {
  banca: 'Banca',
  comida: 'Comida',
  entretenimiento: 'Entretenimiento',
  movilidad: 'Movilidad',
  otros: 'Otros',
};

export const KIND_LABELS: Record<AppKind, string> = {
  banca: 'Banca',
  comida: 'Comida',
  entretenimiento: 'Entretenimiento',
  movilidad: 'Movilidad',
  otros: 'Otros',
};

/** Fallback / hints cuando no hay lista nativa (web) o para sugerir categoría. */
export const APP_CATALOG: CatalogApp[] = [
  { label: 'Uber', androidPackage: 'com.ubercab', kind: 'movilidad', suggested: true },
  { label: 'DiDi', androidPackage: 'com.didiglobal.passenger', kind: 'movilidad', suggested: true },
  { label: 'Cabify', androidPackage: 'com.cabify.rider', kind: 'movilidad', suggested: false },
  { label: 'Uber Eats', androidPackage: 'com.ubercab.eats', kind: 'comida', suggested: true },
  { label: 'Rappi', androidPackage: 'com.grability.rappi', kind: 'comida', suggested: true },
  { label: 'PedidosYa', androidPackage: 'com.pedidosya', kind: 'comida', suggested: true },
  { label: 'DoorDash', androidPackage: 'com.dd.doordash', kind: 'comida', suggested: false },
  { label: 'PayPal', androidPackage: 'com.paypal.android.p2pmobile', kind: 'banca', suggested: true },
  { label: 'Venmo', androidPackage: 'com.venmo', kind: 'banca', suggested: true },
  { label: 'Cash App', androidPackage: 'com.squareup.cash', kind: 'banca', suggested: true },
  { label: 'Pichincha Banca Móvil', androidPackage: 'com.yellowpepper.pichincha', kind: 'banca', suggested: true },
  { label: 'Bancolombia', androidPackage: 'com.bancolombia.bancolombia', kind: 'banca', suggested: false },
  { label: 'Netflix', androidPackage: 'com.netflix.mediaclient', kind: 'entretenimiento', suggested: true },
  { label: 'Spotify', androidPackage: 'com.spotify.music', kind: 'entretenimiento', suggested: true },
  { label: 'YouTube', androidPackage: 'com.google.android.youtube', kind: 'entretenimiento', suggested: false },
  { label: 'Prime Video', androidPackage: 'com.amazon.avod.thirdpartyclient', kind: 'entretenimiento', suggested: false },
  { label: 'Disney+', androidPackage: 'com.disney.disneyplus', kind: 'entretenimiento', suggested: false },
];

/** Sugiere categoría según package conocido o palabras del nombre. */
export function suggestKind(androidPackage: string, label = ''): AppKind {
  const fromCatalog = APP_CATALOG.find(
    (app) => app.androidPackage === androidPackage
  );
  if (fromCatalog) return fromCatalog.kind;

  const hay = `${androidPackage} ${label}`.toLowerCase();
  if (
    /(bank|banca|banco|paypal|venmo|cash|pichincha|yellowpepper|wallet|pago)/.test(
      hay
    )
  ) {
    return 'banca';
  }
  if (/(eats|rappi|food|comida|pedidos|doordash|uber\.eats)/.test(hay)) {
    return 'comida';
  }
  if (/(uber|didi|cabify|taxi|maps|mobility|movilid)/.test(hay)) {
    return 'movilidad';
  }
  if (
    /(netflix|spotify|youtube|disney|prime|twitch|game|play|music|video)/.test(
      hay
    )
  ) {
    return 'entretenimiento';
  }
  return 'otros';
}
