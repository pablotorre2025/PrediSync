const CANONICAL_BOOKS = [
  { name: 'Génesis', abbr: 'Gn', testament: 'Antiguo Testamento' },
  { name: 'Éxodo', abbr: 'Ex', testament: 'Antiguo Testamento' },
  { name: 'Levítico', abbr: 'Lv', testament: 'Antiguo Testamento' },
  { name: 'Números', abbr: 'Nm', testament: 'Antiguo Testamento' },
  { name: 'Deuteronomio', abbr: 'Dt', testament: 'Antiguo Testamento' },
  { name: 'Josué', abbr: 'Jos', testament: 'Antiguo Testamento' },
  { name: 'Jueces', abbr: 'Jue', testament: 'Antiguo Testamento' },
  { name: 'Rut', abbr: 'Rut', testament: 'Antiguo Testamento' },
  { name: '1 Samuel', abbr: '1 S', testament: 'Antiguo Testamento' },
  { name: '2 Samuel', abbr: '2 S', testament: 'Antiguo Testamento' },
  { name: '1 Reyes', abbr: '1 R', testament: 'Antiguo Testamento' },
  { name: '2 Reyes', abbr: '2 R', testament: 'Antiguo Testamento' },
  { name: '1 Crónicas', abbr: '1 Cr', testament: 'Antiguo Testamento' },
  { name: '2 Crónicas', abbr: '2 Cr', testament: 'Antiguo Testamento' },
  { name: 'Esdras', abbr: 'Esd', testament: 'Antiguo Testamento' },
  { name: 'Nehemías', abbr: 'Neh', testament: 'Antiguo Testamento' },
  { name: 'Ester', abbr: 'Est', testament: 'Antiguo Testamento' },
  { name: 'Job', abbr: 'Job', testament: 'Antiguo Testamento' },
  { name: 'Salmos', abbr: 'Sal', testament: 'Antiguo Testamento' },
  { name: 'Proverbios', abbr: 'Pr', testament: 'Antiguo Testamento' },
  { name: 'Eclesiastés', abbr: 'Ec', testament: 'Antiguo Testamento' },
  { name: 'Cantares', abbr: 'Cnt', testament: 'Antiguo Testamento' },
  { name: 'Isaías', abbr: 'Is', testament: 'Antiguo Testamento' },
  { name: 'Jeremías', abbr: 'Jer', testament: 'Antiguo Testamento' },
  { name: 'Lamentaciones', abbr: 'Lam', testament: 'Antiguo Testamento' },
  { name: 'Ezequiel', abbr: 'Ez', testament: 'Antiguo Testamento' },
  { name: 'Daniel', abbr: 'Dn', testament: 'Antiguo Testamento' },
  { name: 'Oseas', abbr: 'Os', testament: 'Antiguo Testamento' },
  { name: 'Joel', abbr: 'Jl', testament: 'Antiguo Testamento' },
  { name: 'Amós', abbr: 'Am', testament: 'Antiguo Testamento' },
  { name: 'Abdías', abbr: 'Abd', testament: 'Antiguo Testamento' },
  { name: 'Jonás', abbr: 'Jon', testament: 'Antiguo Testamento' },
  { name: 'Miqueas', abbr: 'Miq', testament: 'Antiguo Testamento' },
  { name: 'Nahúm', abbr: 'Nah', testament: 'Antiguo Testamento' },
  { name: 'Habacuc', abbr: 'Hab', testament: 'Antiguo Testamento' },
  { name: 'Sofonías', abbr: 'Sof', testament: 'Antiguo Testamento' },
  { name: 'Hageo', abbr: 'Hag', testament: 'Antiguo Testamento' },
  { name: 'Zacarías', abbr: 'Zac', testament: 'Antiguo Testamento' },
  { name: 'Malaquías', abbr: 'Mal', testament: 'Antiguo Testamento' },
  { name: 'Mateo', abbr: 'Mt', testament: 'Nuevo Testamento' },
  { name: 'Marcos', abbr: 'Mr', testament: 'Nuevo Testamento' },
  { name: 'Lucas', abbr: 'Lc', testament: 'Nuevo Testamento' },
  { name: 'Juan', abbr: 'Jn', testament: 'Nuevo Testamento' },
  { name: 'Hechos', abbr: 'Hch', testament: 'Nuevo Testamento' },
  { name: 'Romanos', abbr: 'Ro', testament: 'Nuevo Testamento' },
  { name: '1 Corintios', abbr: '1 Co', testament: 'Nuevo Testamento' },
  { name: '2 Corintios', abbr: '2 Co', testament: 'Nuevo Testamento' },
  { name: 'Gálatas', abbr: 'Ga', testament: 'Nuevo Testamento' },
  { name: 'Efesios', abbr: 'Ef', testament: 'Nuevo Testamento' },
  { name: 'Filipenses', abbr: 'Flp', testament: 'Nuevo Testamento' },
  { name: 'Colosenses', abbr: 'Col', testament: 'Nuevo Testamento' },
  { name: '1 Tesalonicenses', abbr: '1 Ts', testament: 'Nuevo Testamento' },
  { name: '2 Tesalonicenses', abbr: '2 Ts', testament: 'Nuevo Testamento' },
  { name: '1 Timoteo', abbr: '1 Ti', testament: 'Nuevo Testamento' },
  { name: '2 Timoteo', abbr: '2 Ti', testament: 'Nuevo Testamento' },
  { name: 'Tito', abbr: 'Tit', testament: 'Nuevo Testamento' },
  { name: 'Filemón', abbr: 'Flm', testament: 'Nuevo Testamento' },
  { name: 'Hebreos', abbr: 'Heb', testament: 'Nuevo Testamento' },
  { name: 'Santiago', abbr: 'Stg', testament: 'Nuevo Testamento' },
  { name: '1 Pedro', abbr: '1 P', testament: 'Nuevo Testamento' },
  { name: '2 Pedro', abbr: '2 P', testament: 'Nuevo Testamento' },
  { name: '1 Juan', abbr: '1 Jn', testament: 'Nuevo Testamento' },
  { name: '2 Juan', abbr: '2 Jn', testament: 'Nuevo Testamento' },
  { name: '3 Juan', abbr: '3 Jn', testament: 'Nuevo Testamento' },
  { name: 'Judas', abbr: 'Jud', testament: 'Nuevo Testamento' },
  { name: 'Apocalipsis', abbr: 'Ap', testament: 'Nuevo Testamento' },
] as const;

function normalizeBookName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getBookMeta(name: string) {
  const normalized = normalizeBookName(name);
  const canonical = CANONICAL_BOOKS.find(entry => normalizeBookName(entry.name) === normalized);
  return {
    abbr: canonical?.abbr || name.slice(0, 4),
    testament: canonical?.testament || 'Antiguo Testamento',
    order: canonical ? CANONICAL_BOOKS.indexOf(canonical) : Number.MAX_SAFE_INTEGER,
  };
}