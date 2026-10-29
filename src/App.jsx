import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, FileSpreadsheet, Filter, Info, LayoutGrid, ListFilter, Plus, Search, SlidersHorizontal, Sparkles, Upload, X } from 'lucide-react';

const demo = `Order ID,Customer,Email,Product,Category,Amount,Status,Date
ORD-1048,Olivia Chen,olivia.chen@email.com,Wireless Headphones,Electronics,129.00,Delivered,2024-05-18
ORD-1047,Noah Williams,noah.w@email.com,Desk Lamp,Home & Living,48.50,Processing,2024-05-18
ORD-1046,Emma Patel,emma.patel@email.com,Running Shoes,Apparel,94.00,Shipped,2024-05-17
ORD-1045,Liam Johnson,liam.j@email.com,Mechanical Keyboard,Electronics,159.00,Delivered,2024-05-17
ORD-1044,Ava Martinez,ava.m@email.com,Ceramic Mug,Home & Living,24.00,Cancelled,2024-05-16
ORD-1043,Ethan Kim,ethan.kim@email.com,Organic Cotton Tee,Apparel,38.00,Delivered,2024-05-16
ORD-1042,Sophia Brown,sophia.b@email.com,USB-C Hub,Electronics,67.00,Processing,2024-05-15
ORD-1041,Mason Davis,mason.d@email.com,Canvas Backpack,Accessories,82.00,Shipped,2024-05-15
ORD-1040,Isabella Garcia,isabella.g@email.com,Leather Wallet,Accessories,56.00,Delivered,2024-05-14
ORD-1039,Lucas Wilson,lucas.w@email.com,Glass Water Bottle,Home & Living,32.00,Delivered,2024-05-14
ORD-1038,Mia Thompson,mia.t@email.com,Noise-Canceling Earbuds,Electronics,199.00,Processing,2024-05-13
ORD-1037,James Anderson,james.a@email.com,Merino Wool Sweater,Apparel,145.00,Shipped,2024-05-13
ORD-1036,Charlotte Lee,charlotte.lee@email.com,Table Clock,Home & Living,72.00,Delivered,2024-05-12
ORD-1035,Benjamin Taylor,ben.t@email.com,Sunglasses,Accessories,110.00,Cancelled,2024-05-12
ORD-1034,Amelia White,amelia.w@email.com,Bluetooth Speaker,Electronics,89.00,Delivered,2024-05-11
ORD-1033,Henry Harris,henry.h@email.com,Trail Running Jacket,Apparel,128.00,Processing,2024-05-11
ORD-1032,Harper Clark,harper.c@email.com,Throw Blanket,Home & Living,76.00,Shipped,2024-05-10
ORD-1031,Alexander Lewis,alex.l@email.com,Phone Stand,Accessories,29.00,Delivered,2024-05-10
ORD-1030,Evelyn Robinson,evelyn.r@email.com,Portable SSD,Electronics,179.00,Delivered,2024-05-09
ORD-1029,Daniel Walker,daniel.w@email.com,Linen Shirt,Apparel,68.00,Shipped,2024-05-09`;

function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(v => v.trim() !== '')) rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  row.push(cell); if (row.some(v => v.trim() !== '')) rows.push(row);
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows.shift().map((h, i) => h.trim() || `Column ${i + 1}`);
  return { headers, records: rows.map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))) };
}

const operators = [
  { value: 'contains', label: 'contains' }, { value: 'equals', label: 'is' },
  { value: 'notEquals', label: 'is not' }, { value: 'starts', label: 'starts with' },
  { value: 'gt', label: 'greater than' }, { value: 'lt', label: 'less than' },
];
const initialData = parseCSV(demo);
const initialFilters = [{ id: 1, column: 'Status', operator: 'equals', value: 'Delivered' }, { id: 2, column: 'Amount', operator: 'gt', value: '50' }];

function matchesFilter(record, filter) {
  const raw = String(record[filter.column] ?? ''), value = filter.value.trim();
  if (!value) return true;
  const a = Number(raw.replace(/[^\d.-]/g, '')), b = Number(value.replace(/[^\d.-]/g, ''));
  switch (filter.operator) {
    case 'equals': return raw.toLowerCase() === value.toLowerCase();
    case 'notEquals': return raw.toLowerCase() !== value.toLowerCase();
    case 'starts': return raw.toLowerCase().startsWith(value.toLowerCase());
    case 'gt': return Number.isFinite(a) && Number.isFinite(b) && a > b;
    case 'lt': return Number.isFinite(a) && Number.isFinite(b) && a < b;
    default: return raw.toLowerCase().includes(value.toLowerCase());
  }
}

function App() {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [fileName, setFileName] = useState('orders_may_2024.csv');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const pageSize = 8;
  const filtered = useMemo(() => data.records.filter(record => filters.every(f => matchesFilter(record, f)) && (!query || Object.values(record).some(v => String(v).toLowerCase().includes(query.toLowerCase())))), [data, filters, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  const importFile = useCallback(file => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setNotice('Please choose a .csv file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result || '').replace(/^\uFEFF/, ''));
      if (!parsed.headers.length) { setNotice('This file appears to be empty.'); return; }
      setData(parsed); setFileName(file.name); setFilters([]); setQuery(''); setPage(1); setNotice('');
    };
    reader.onerror = () => setNotice('We couldn’t read that file. Please try again.');
    reader.readAsText(file);
  }, []);
  const updateFilter = (id, key, value) => { setFilters(current => current.map(f => f.id === id ? { ...f, [key]: value } : f)); setPage(1); };
  const addFilter = () => { setFilters(current => [...current, { id: Date.now(), column: data.headers[0], operator: 'contains', value: '' }]); };
  const removeFilter = id => { setFilters(current => current.filter(f => f.id !== id)); setPage(1); };
  const exportCSV = () => {
    const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const text = [data.headers.map(esc).join(','), ...filtered.map(r => data.headers.map(h => esc(r[h])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `filtered_${fileName}`; a.click(); URL.revokeObjectURL(url);
  };
  const statusClass = value => `status status-${String(value).toLowerCase()}`;

  return <div className="app-shell" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (e.target === e.currentTarget) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); importFile(e.dataTransfer.files[0]); }}>
    {dragging && <div className="drop-overlay"><div className="drop-card"><Upload size={28}/><strong>Drop your CSV here</strong><span>We’ll take it from here</span></div></div>}
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span/></div><span>row<span className="brand-dot">.</span></span><span className="beta">BETA</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="workspace"><span className="workspace-avatar">S</span><span className="workspace-name">Studio workspace<small>Free plan</small></span><ChevronDown size={15}/></button>
      <div className="nav-label">YOUR DATA</div>
      <button className="nav-item active"><LayoutGrid size={17}/> Explorer</button>
      <button className="nav-item muted" onClick={() => setNotice('Saved views are coming soon.')}><FileSpreadsheet size={17}/> Saved views</button>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><span>Learn how to get the most out of Row.</span><button onClick={() => setNotice('Tip: combine as many column filters as you need to narrow down the results.')}>Explore the guide <ArrowRight size={14}/></button></div><button className="profile"><div className="profile-avatar">SC</div><span>Siddharth C.<small>Personal account</small></span><ChevronDown size={15}/></button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Explorer</span><span className="crumb-slash">/</span><span className="crumb-current">{fileName}</span></div><div className="topbar-right"><span className="saved-indicator"><span/> All changes saved</span><button className="icon-button" aria-label="Help" onClick={() => setNotice('Upload a CSV to explore your data. Your files stay in your browser.')}><CircleHelp size={18}/></button><div className="top-avatar">SC</div></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> DATA EXPLORER</div><h1>Explore your data<span className="heading-period">.</span></h1><p>Upload a CSV, then filter your way to the answers.</p></div><button className="button button-primary upload-btn" onClick={() => inputRef.current?.click()}><Upload size={16}/> Upload CSV</button><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e => { importFile(e.target.files[0]); e.target.value = ''; }}/></div>
        <section className="file-card"><div className="file-card-left"><div className="file-icon"><FileSpreadsheet size={19}/></div><div><div className="file-name">{fileName}<span className="live-tag"><i/> LIVE</span></div><div className="file-meta">{data.records.length.toLocaleString()} rows <span>·</span> {data.headers.length} columns <span>·</span> uploaded just now</div></div></div><button className="button button-secondary small-button" onClick={exportCSV} title="Export filtered rows"><ArrowDownToLine size={15}/> Export</button></section>

        <section className="filter-section"><div className="section-heading"><div className="section-title"><div className="filter-icon"><SlidersHorizontal size={17}/></div><div><h2>Filters</h2><p>Combine rules to narrow your results</p></div><span className="filter-count">{filters.length}</span></div><button className="text-button" onClick={() => { setFilters([]); setPage(1); }}>Clear all</button></div>
          <div className="filter-box">{filters.length === 0 ? <div className="empty-filters"><ListFilter size={18}/><span>No filters yet. Add a rule to refine your data.</span></div> : filters.map((filter, index) => <div className="filter-row" key={filter.id}><div className="filter-rule-label">{index === 0 ? 'WHERE' : 'AND'}</div><div className="select-wrap column-select"><select aria-label="Filter column" value={filter.column} onChange={e => updateFilter(filter.id, 'column', e.target.value)}>{data.headers.map(h => <option key={h}>{h}</option>)}</select><ChevronDown size={14}/></div><div className="select-wrap operator-select"><select aria-label="Filter condition" value={filter.operator} onChange={e => updateFilter(filter.id, 'operator', e.target.value)}>{operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={14}/></div><div className="filter-input-wrap"><Search size={14}/><input aria-label="Filter value" value={filter.value} placeholder="Enter a value…" onChange={e => updateFilter(filter.id, 'value', e.target.value)}/></div><button className="remove-filter" aria-label="Remove filter" onClick={() => removeFilter(filter.id)}><X size={16}/></button></div>)}<div className="filter-footer"><button className="add-filter" onClick={addFilter}><Plus size={15}/> Add filter</button><span className="and-hint"><Info size={13}/> All filters are combined with AND</span></div></div>
        </section>

        <section className="table-section"><div className="table-heading"><div className="table-title"><div className="table-icon"><FileSpreadsheet size={17}/></div><div><h2>Results</h2><p><strong>{filtered.length.toLocaleString()}</strong> of {data.records.length.toLocaleString()} rows</p></div></div><div className="table-tools"><label className="table-search"><Search size={15}/><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search all columns…"/><kbd>⌘ K</kbd></label><button className="table-view-button" title="Table view"><SlidersHorizontal size={16}/></button></div></div>
          <div className="table-container"><table><thead><tr><th className="row-number-head">#</th>{data.headers.map(h => <th key={h}><span>{h}</span><ArrowDown size={12}/></th>)}</tr></thead><tbody>{shown.map((record, index) => <tr key={`${page}-${index}`}><td className="row-number">{(page - 1) * pageSize + index + 1}</td>{data.headers.map(h => <td key={h}>{h.toLowerCase() === 'status' ? <span className={statusClass(record[h])}><i/>{record[h]}</span> : h.toLowerCase().includes('amount') || h.toLowerCase().includes('price') ? <span className="amount"><span className="currency">$</span>{Number(String(record[h]).replace(/[^\d.-]/g, '') || 0).toFixed(2)}</span> : <span className={h.toLowerCase().includes('id') ? 'mono' : ''}>{record[h] || <span className="blank-cell">—</span>}</span>}</td>)}</tr>)}{shown.length === 0 && <tr><td colSpan={data.headers.length + 1} className="no-results"><div className="no-results-icon"><Filter size={18}/></div><strong>No rows match your filters</strong><span>Try adjusting or clearing a filter to see more results.</span><button onClick={() => { setFilters([]); setQuery(''); }}>Clear filters</button></td></tr>}</tbody></table></div>
          <div className="table-footer"><span>Showing <strong>{filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> rows</span><div className="pagination"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ArrowLeft size={14}/></button><span>Page <strong>{page}</strong> of <strong>{pages}</strong></span><button aria-label="Next page" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}><ArrowRight size={14}/></button></div></div>
        </section>
        <div className="privacy-note"><Sparkles size={14}/> Your data stays in your browser. Nothing is uploaded to a server.</div>
        {notice && <div className="notice"><Info size={15}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}
      </div>
    </main>
  </div>;
}

export default App;
