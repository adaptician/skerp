// fingerprint.js — structural fingerprint of Figma frames, for design-fidelity-check.
//
// Pass this file's text VERBATIM as the `code` of a read-only `use_figma` call, with the
// NODE_IDS line below edited to list the frames to fingerprint. Do not paraphrase it: the
// fingerprint is only comparable across sessions if every session runs the same algorithm.
// Changing anything below the NODE_IDS line is a new algorithm — bump ALGO.
//
// What it covers: every node in the frame's subtree — type, name, visibility, size, position
// relative to its parent, auto-layout, corner radius, opacity, fills and strokes (colour, opacity,
// bound variable), effects, text content and type settings, and the main component of each
// instance. A change to any of these changes the fingerprint. It is read-only.

const NODE_IDS = ["0:0"]; // <- edit: the frame node IDs to fingerprint

const ALGO = "fp1";

const r2 = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v === figma.mixed ? "mixed" : v ?? null);

function paints(list) {
  if (list === figma.mixed) return "mixed";
  if (!Array.isArray(list)) return null;
  return list.map((p) => [
    p.type,
    p.visible !== false,
    r2(p.opacity ?? 1),
    p.color ? [r2(p.color.r), r2(p.color.g), r2(p.color.b)] : null,
    p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null,
    p.imageHash ?? null,
  ]);
}

async function describe(node, isRoot) {
  const d = [node.type, node.name, node.visible !== false];
  if ("width" in node) d.push(r2(node.width), r2(node.height));
  if (!isRoot && "x" in node) d.push(r2(node.x), r2(node.y));
  if ("layoutMode" in node) {
    d.push(node.layoutMode, r2(node.itemSpacing), r2(node.paddingTop), r2(node.paddingRight),
      r2(node.paddingBottom), r2(node.paddingLeft), node.primaryAxisAlignItems, node.counterAxisAlignItems);
  }
  if ("cornerRadius" in node) d.push(r2(node.cornerRadius));
  if ("opacity" in node) d.push(r2(node.opacity));
  if ("fills" in node) d.push(paints(node.fills));
  if ("strokes" in node) d.push(paints(node.strokes), r2(node.strokeWeight));
  if ("effects" in node && Array.isArray(node.effects)) {
    d.push(node.effects.map((e) => [e.type, e.visible !== false, r2(e.radius ?? null)]));
  }
  if (node.type === "TEXT") {
    const font = node.fontName === figma.mixed ? "mixed" : `${node.fontName.family}/${node.fontName.style}`;
    d.push(node.characters, font, r2(node.fontSize), node.textAlignHorizontal);
  }
  if (node.type === "INSTANCE") {
    const main = await node.getMainComponentAsync();
    d.push(main ? main.key || main.id : null);
  }
  const kids = [];
  if ("children" in node) for (const c of node.children) kids.push(await describe(c, false));
  d.push(kids);
  return d;
}

// Two independent 32-bit FNV-1a passes -> 64 bits of hex. No BigInt, no crypto: both are
// unavailable or unreliable in the plugin sandbox.
function hash(s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193) >>> 0;
    b = (b ^ (b >>> 13)) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

const out = [];
for (const id of NODE_IDS) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) { out.push({ id, exists: false }); continue; }
  let page = node.parent;
  while (page && page.type !== "PAGE") page = page.parent;
  const text = JSON.stringify(await describe(node, true));
  out.push({ id, exists: true, name: node.name, page: page ? page.name : null, fingerprint: `${ALGO}:${hash(text)}` });
}
return out;
