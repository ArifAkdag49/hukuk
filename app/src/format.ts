/** Küçük biçimlendirme yardımcıları (Türkçe). */

const LAW_ABBR: Record<string, string> = {
  "Türk Borçlar Kanunu": "TBK",
  "Türk Ceza Kanunu": "TCK",
  "Türk Medeni Kanunu": "TMK",
  "Türk Ticaret Kanunu": "TTK",
  "Hukuk Muhakemeleri Kanunu": "HMK",
  "Ceza Muhakemesi Kanunu": "CMK",
  "İş Kanunu": "İşK",
  "Türkiye Cumhuriyeti Anayasası": "AY",
  "İdari Yargılama Usulü Kanunu": "İYUK",
};

export function lawAbbrev(lawName: string): string {
  return LAW_ABBR[lawName] ?? lawName;
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // Karar tarihleri "09.03.2017" (gün.ay.yıl) gelir; Date bunu ay.gün sanabilir
  const tr = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(iso);
  const d = tr ? new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** "3 dakika önce" gibi kısa göreli zaman. */
export function timeAgo(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "hiç";
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "az önce";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} dakika önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.round(h / 24);
  return `${d} gün önce`;
}

/** Markdown işaretlerini atıp düz metin önizlemesi verir. */
export function plain(md: string, max = 140): string {
  const t = md.replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
