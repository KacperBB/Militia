export const SITE_NAME = "Militia";
export const SITE_TITLE = "Militia Marketplace";
export const SITE_DESCRIPTION = "Militia to marketplace ogłoszeń z kategoriami dynamicznymi, moderacją, zapisanymi ofertami i lokalizacją wspierającą statystyki oraz wyszukiwanie.";

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").split(",")[0].replace(/\/$/, "");
}
