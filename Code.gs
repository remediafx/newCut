// RitaglioLite - server: solo Drive + foglio dati. Tutta l'elaborazione immagine è nel browser (Index.html).
const P = PropertiesService.getScriptProperties(), IMG = /^image\//;
const srt = (a, b) => a.name < b.name ? -1 : 1;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Ritaglio')
    .addMetaTag('viewport', 'width=device-width,initial-scale=1');
}
function setSheet(id) { P.setProperty('SHEET', id); }

// Etichette per classe (foglio "renamer": riga1 = classe, righe successive = etichette) e cartelle (foglio "folders")
function cfg() {
  const id = P.getProperty('SHEET'); if (!id) return { need: 1 };
  const ss = SpreadsheetApp.openById(id), r = ss.getSheetByName('renamer').getDataRange().getValues(),
    f = ss.getSheetByName('folders').getDataRange().getValues().slice(1).filter(x => x[0]);
  return {
    classes: r[0].map((c, i) => ({ c: String(c), names: r.slice(1).map(x => String(x[i])).filter(String) })).filter(o => o.c),
    folders: Object.fromEntries(f.map(x => [String(x[0]).split('-')[0], String(x[1]).match(/[-\w]{20,}/)[0]]))
  };
}
// Immagini nella cartella classe + sottocartelle di progetto (quelle che iniziano con _ sono escluse)
function list(fid) {
  const d = DriveApp.getFolderById(fid), files = [], projs = [];
  for (const it = d.getFiles(); it.hasNext();) { const f = it.next(); if (IMG.test(f.getMimeType())) files.push({ id: f.getId(), name: f.getName() }); }
  for (const it = d.getFolders(); it.hasNext();) { const f = it.next(); if (f.getName()[0] != '_') projs.push({ id: f.getId(), name: f.getName() }); }
  return { files: files.sort(srt), projs: projs.sort(srt) };
}
function get(id) { return Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()); }
function mk(fid, n) { return DriveApp.getFolderById(fid).createFolder(n).getId(); }
// Salva l'elaborato nella cartella di progetto e sposta l'originale in _ORIGINALI (dentro la cartella classe)
function save(b64, name, pid, oid, cid) {
  DriveApp.getFolderById(pid).createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', name));
  const c = DriveApp.getFolderById(cid), it = c.getFoldersByName('_ORIGINALI'), b = it.hasNext() ? it.next() : c.createFolder('_ORIGINALI');
  DriveApp.getFileById(oid).moveTo(b);
  return 1;
}
