/**
 * YouCam's own sample portraits for Skin Analysis (from the API playground).
 * Used for "Try with a sample photo", so anyone can run a real YouCam scan
 * without taking a selfie. Scored by URL (src_file_url), nothing is uploaded.
 */
const BASE = "https://plugins-media.makeupar.com/strapi/assets/";
const IDS = ["01_5b5defd339", "02_875f3b51a3", "03_b1d98441a6", "04_1b6339716b", "05_d6671299a6", "06_c9136eea8f"];

export const SAMPLE_PHOTOS = IDS.map((id, i) => ({
  index: i,
  url: `${BASE}skin_analysis_${id}.png`,
  thumb: `${BASE}thumbnail_skin_analysis_${id}.png`,
}));
