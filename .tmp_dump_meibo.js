const ExcelJS = require('exceljs');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('pho-thong/template.xlsx');
  console.log('SHEETS:', wb.worksheets.map(w => w.name).join(' | '));
  const ws = wb.getWorksheet('名簿');
  if (!ws) { console.log('NO 名簿'); return; }
  console.log('rowCount', ws.rowCount, 'colCount', ws.columnCount);
  for (let r = 1; r <= 12; r++) {
    const row = ws.getRow(r);
    const out = [];
    for (let c = 1; c <= 32; c++) {
      const cell = row.getCell(c);
      let v = cell.value;
      if (v && typeof v === 'object' && v.richText) v = v.richText.map(t => t.text).join('');
      if (v && typeof v === 'object' && v.formula) v = '=' + v.formula;
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        out.push(cell.address + '=' + JSON.stringify(String(v)));
      }
    }
    console.log('ROW', r, out.join('  '));
  }
  console.log('MERGES:', ws.model.merges ? ws.model.merges.join(', ') : '');
})();
