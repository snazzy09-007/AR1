// Utilitaires d'affichage (côté client & serveur, sans dépendance DB).

const nf = new Intl.NumberFormat("fr-FR");

export const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : nf.format(n);

export const fmtSigned = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : "−"}${nf.format(Math.abs(n))}`;

export const clock = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return "jamais";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h ${m % 60} min`;
};

export const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
