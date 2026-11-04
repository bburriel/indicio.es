// Genera data/mapa-provincias.json: contornos de provincias y límites de comunidades autónomas ya proyectados
// (cónica conforme de España, con Canarias en un recuadro), listos para pintar como SVG sin cargar d3 en el navegador.
// Parte de data/municipios.topo.json y de las librerías de vendor/. Solo hay que volver a ejecutarlo si cambia esa geometría:
//   node scripts/datos/mapa-provincias.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const load = (file, req) => { const m = { exports: {} }; new Function("module", "exports", "require", fs.readFileSync(path.join(root, "vendor", file), "utf8")).call(globalThis, m, m.exports, req); return m.exports; };
const d3 = load("d3.min.js", () => { throw new Error("d3 no debería pedir módulos"); });
const tj = load("topojson-client.min.js", () => { throw new Error("topojson no debería pedir módulos"); });
const cp = load("d3-composite-projections.min.js", n => (n === "d3-geo" || n === "d3-path") ? d3 : (() => { throw new Error("módulo inesperado: " + n); })());

const topo = JSON.parse(fs.readFileSync(path.join(root, "data/municipios.topo.json"), "utf8"));
const geoms = topo.objects.provinces.geometries.filter(g => g.id !== "54"); // 54: Gibraltar, no es una provincia
const fc = tj.feature(topo, { type: "GeometryCollection", geometries: geoms });
// d3 necesita los anillos exteriores en sentido horario
const rewind = rings => rings.map((r, i) => { const a = d3.geoArea({ type: "Polygon", coordinates: [r] }); return (i === 0 ? a > 2 * Math.PI : a < 2 * Math.PI) ? r.slice().reverse() : r; });
fc.features.forEach(f => { const g = f.geometry; g.coordinates = g.type === "Polygon" ? rewind(g.coordinates) : g.coordinates.map(rewind); });

const W = 900, H = 720, VIEWBOX = "-30 30 930 660";
const proj = cp.geoConicConformalSpain().fitSize([W - 8, H - 8], fc);
const gp = d3.geoPath(proj);
const MIN = 2.8; // px: se descartan vértices más cercanos que esto; basta para 930 px de ancho
const thin = pts => { const out = []; let last = null; pts.forEach((p, i) => { if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= MIN || i === pts.length - 1) { out.push(p); last = p; } }); return out; };
const parse = d => d.split("M").filter(Boolean).map(s => s.replace(/Z/g, "").split("L").map(q => q.split(",").map(Number)));
const fmt = pts => pts.map(p => Math.round(p[0]) + "," + Math.round(p[1])).join("L");

const provs = {}, pts = {};
for (const f of fc.features) {
  if (f.id === "51" || f.id === "52") { pts[f.id] = proj(d3.geoCentroid(f)).map(Math.round); continue; } // Ceuta y Melilla: un punto
  provs[f.id] = parse(gp(f) || "").map(thin).filter(r => r.length >= 3).map(r => "M" + fmt(r) + "Z").join("");
}
const mesh = tj.mesh(topo, topo.objects.autonomous_regions, (a, b) => a !== b);
const regions = parse(gp(mesh) || "").map(thin).filter(r => r.length >= 2 && r.some(p => p[0] !== r[0][0] || p[1] !== r[0][1])).map(r => "M" + fmt(r)).join("");
const border = proj.getCompositionBorders().replace(/(-?\d+)\.\d+/g, "$1"); // recuadro de Canarias

// Comunidades autónomas por código INE de provincia
const ccaa = [["and", "Andalucía", ["04", "11", "14", "18", "21", "23", "29", "41"]], ["ara", "Aragón", ["22", "44", "50"]], ["ast", "Asturias", ["33"]], ["bal", "Illes Balears", ["07"]],
  ["can", "Canarias", ["35", "38"]], ["cnt", "Cantabria", ["39"]], ["cyl", "Castilla y León", ["05", "09", "24", "34", "37", "40", "42", "47", "49"]], ["clm", "Castilla-La Mancha", ["02", "13", "16", "19", "45"]],
  ["cat", "Cataluña", ["08", "17", "25", "43"]], ["val", "Comunitat Valenciana", ["03", "12", "46"]], ["ext", "Extremadura", ["06", "10"]], ["gal", "Galicia", ["15", "27", "32", "36"]],
  ["mad", "Madrid", ["28"]], ["mur", "Murcia", ["30"]], ["nav", "Navarra", ["31"]], ["pv", "País Vasco", ["01", "20", "48"]], ["rio", "La Rioja", ["26"]],
  ["ceu", "Ceuta", ["51"]], ["mel", "Melilla", ["52"]]].map(([id, name, ps]) => ({ id, name, provs: ps }));

const todas = ccaa.flatMap(c => c.provs).sort();
if (todas.length !== 52 || new Set(todas).size !== 52) throw new Error("Las comunidades no cubren las 52 provincias exactamente una vez");
for (const id of todas) if (!provs[id] && !pts[id]) throw new Error("Falta la geometría de la provincia " + id);

const out = { viewBox: VIEWBOX, border, regions, provs, pts, ccaa };
fs.writeFileSync(path.join(root, "data/mapa-provincias.json"), JSON.stringify(out));
console.log("data/mapa-provincias.json:", Object.keys(provs).length, "provincias,", Object.keys(pts).length, "puntos,", (fs.statSync(path.join(root, "data/mapa-provincias.json")).size / 1024).toFixed(1), "KB");
