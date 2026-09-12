const enc = new TextEncoder();

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}
function crc32(bytes) {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function writeU16(view, offset, value) { view.setUint16(offset, value, true); }
function writeU32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
function concatArrays(parts) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function maybeDeflate(bytes) {
  if (typeof CompressionStream !== 'function') return {method: 0, data: bytes};
  try {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    if (compressed.length >= bytes.length) return {method: 0, data: bytes};
    return {method: 8, data: compressed};
  } catch {
    return {method: 0, data: bytes};
  }
}

export async function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((Math.floor(now.getSeconds() / 2)) & 31);
  const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);
  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const raw = entry.data instanceof Uint8Array ? entry.data : enc.encode(entry.data);
    const crc = crc32(raw);
    const compressed = await maybeDeflate(raw);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    writeU32(lv, 0, 0x04034b50); writeU16(lv, 4, 20); writeU16(lv, 6, 0x0800); writeU16(lv, 8, compressed.method);
    writeU16(lv, 10, dosTime); writeU16(lv, 12, dosDate); writeU32(lv, 14, crc);
    writeU32(lv, 18, compressed.data.length); writeU32(lv, 22, raw.length); writeU16(lv, 26, name.length); writeU16(lv, 28, 0);
    local.set(name, 30); localParts.push(local, compressed.data);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    writeU32(cv, 0, 0x02014b50); writeU16(cv, 4, 20); writeU16(cv, 6, 20); writeU16(cv, 8, 0x0800); writeU16(cv, 10, compressed.method);
    writeU16(cv, 12, dosTime); writeU16(cv, 14, dosDate); writeU32(cv, 16, crc); writeU32(cv, 20, compressed.data.length); writeU32(cv, 24, raw.length);
    writeU16(cv, 28, name.length); writeU16(cv, 30, 0); writeU16(cv, 32, 0); writeU16(cv, 34, 0); writeU16(cv, 36, 0); writeU32(cv, 38, 0); writeU32(cv, 42, offset);
    central.set(name, 46); centralParts.push(central); offset += local.length + compressed.data.length;
  }
  const central = concatArrays(centralParts);
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  writeU32(ev, 0, 0x06054b50); writeU16(ev, 4, 0); writeU16(ev, 6, 0); writeU16(ev, 8, entries.length); writeU16(ev, 10, entries.length);
  writeU32(ev, 12, central.length); writeU32(ev, 16, offset); writeU16(ev, 20, 0);
  return concatArrays([...localParts, central, eocd]);
}

export function plateColumnCount(n) {
  if (n <= 0) return 1;
  const v = Math.sqrt(n);
  const r = Math.floor(v + 0.5);
  return r + (v > r ? 1 : 0) || 1;
}

export function packRectangles(items, bedX, bedY, {margin = 6, gap = 7} = {}) {
  const queue = [...items].sort((a, b) => Math.max(b.width, b.depth) - Math.max(a.width, a.depth));
  const plates = [];
  function tryPlace(plate, item) {
    const candidates = item.allowRotate === false
      ? [{rotated: false, w: item.width, d: item.depth}]
      : [{rotated: false, w: item.width, d: item.depth}, {rotated: true, w: item.depth, d: item.width}];
    for (const c of candidates) {
      if (c.w + 2 * margin > bedX || c.d + 2 * margin > bedY) continue;
      for (let row = 0; row < plate.rows.length; row++) {
        const r = plate.rows[row];
        if (c.d <= r.height && r.x + c.w <= bedX - margin) {
          plate.items.push({...item, rotated: c.rotated, packedWidth: c.w, packedDepth: c.d, x: r.x, y: r.y});
          r.x += c.w + gap;
          return true;
        }
      }
      const y = plate.rows.length ? Math.max(...plate.rows.map(r => r.y + r.height + gap)) : margin;
      if (y + c.d <= bedY - margin) {
        plate.rows.push({x: margin + c.w + gap, y, height: c.d});
        plate.items.push({...item, rotated: c.rotated, packedWidth: c.w, packedDepth: c.d, x: margin, y});
        return true;
      }
    }
    return false;
  }
  for (const item of queue) {
    let placed = false;
    for (const plate of plates) if (tryPlace(plate, item)) { placed = true; break; }
    if (!placed) {
      const plate = {items: [], rows: []};
      if (!tryPlace(plate, item)) return {ok: false, error: `${item.name} non entra nel piano ${bedX} × ${bedY} mm`, plates: []};
      plates.push(plate);
    }
  }
  return {ok: true, plates};
}

function meshXml(mesh) {
  const pos = mesh.getAttribute('position');
  const idx = mesh.index;
  const vertices = [];
  for (let i = 0; i < pos.count; i++) vertices.push(`<vertex x="${pos.getX(i).toFixed(5)}" y="${pos.getY(i).toFixed(5)}" z="${pos.getZ(i).toFixed(5)}"/>`);
  const triangles = [];
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) triangles.push(`<triangle v1="${idx.getX(i)}" v2="${idx.getX(i + 1)}" v3="${idx.getX(i + 2)}"/>`);
  } else {
    for (let i = 0; i < pos.count; i += 3) triangles.push(`<triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>`);
  }
  return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh>`;
}

function projectSettings(printer) {
  const settings = {
    name: 'project_settings',
    from: 'project',
    printable_area: ['0x0', `${printer.x}x0`, `${printer.x}x${printer.y}`, `0x${printer.y}`],
    filament_diameter: ['1.75'],
    filament_colour: ['#3E77AD'],
    filament_type: ['PLA'],
  };
  if (printer.systemPreset !== false && printer.profile) settings.printer_settings_id = printer.profile;
  if (printer.filamentProfile) settings.filament_settings_id = [printer.filamentProfile];
  if (printer.printProfile) settings.print_settings_id = printer.printProfile;
  return settings;
}

export async function makeBambu3mf({plates, printer, title = 'DrawerForge project'}) {
  const cols = plateColumnCount(plates.length);
  const strideX = printer.x * 1.2;
  const strideY = printer.y * 1.2;
  let oid = 1;
  const objects = [];
  const builds = [];
  const settingsObjects = [];
  const plateBlocks = [];

  for (let pi = 0; pi < plates.length; pi++) {
    const plate = plates[pi];
    const row = Math.floor(pi / cols);
    const col = pi % cols;
    const ox = col * strideX;
    const oy = -row * strideY;
    const instances = [];

    for (const part of plate.items) {
      const g = part.geometry.clone();
      if (part.rotated) g.rotateZ(Math.PI / 2);
      g.computeBoundingBox();
      const bb = g.boundingBox;
      g.translate(-bb.min.x + part.x + ox, -bb.min.y + part.y + oy, -bb.min.z);
      objects.push(`<object id="${oid}" type="model">${meshXml(g)}</object>`);
      builds.push(`<item objectid="${oid}"/>`);
      settingsObjects.push(`<object id="${oid}"><metadata key="name" value="${xmlEscape(part.name)}"/><metadata key="extruder" value="1"/></object>`);
      instances.push(`<model_instance><metadata key="object_id" value="${oid}"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="${oid}"/></model_instance>`);
      oid++;
      g.dispose();
    }

    plateBlocks.push(`<plate><metadata key="plater_id" value="${pi + 1}"/><metadata key="plater_name" value="${xmlEscape(plate.name || `Piatto ${pi + 1}`)}"/>${instances.join('')}</plate>`);
  }

  const model = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="it-IT" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021"><metadata name="BambuStudio:3mfVersion">1</metadata><metadata name="Application">BambuStudio-02.08.02.61</metadata><metadata name="Title">${xmlEscape(title)}</metadata><metadata name="Description">Generated by DrawerForge 0.4.6</metadata><resources>${objects.join('')}</resources><build>${builds.join('')}</build></model>`;
  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?>\n<config>${settingsObjects.join('')}${plateBlocks.join('')}</config>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/></Types>`;

  return makeZip([
    {name: '[Content_Types].xml', data: contentTypes},
    {name: '_rels/.rels', data: rels},
    {name: '3D/3dmodel.model', data: model},
    {name: 'Metadata/project_settings.config', data: JSON.stringify(projectSettings(printer), null, 2)},
    {name: 'Metadata/model_settings.config', data: modelSettings},
  ]);
}
