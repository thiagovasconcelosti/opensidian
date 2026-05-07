import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, SearchResultItem } from '../api/client';

interface Filters {
  tag: string;
  after: string;
  before: string;
  hasBacklinks: '' | 'true' | 'false';
}

const emptyFilters: Filters = { tag: '', after: '', before: '', hasBacklinks: '' };

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const vaultPath = new URLSearchParams(window.location.search).get('vault') || '';

  const doSearch = useCallback(async () => {
    if (!query || !vaultPath) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.search.fullText(vaultPath, query, {
        tag: filters.tag || undefined,
        after: filters.after || undefined,
        before: filters.before || undefined,
        hasBacklinks: filters.hasBacklinks ? filters.hasBacklinks === 'true' : undefined,
      });
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, filters, vaultPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) doSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [query, filters]);

  const selectNote = (path: string) => {
    navigate(`/notes/${encodeURIComponent(path)}`);
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="content-area">
      <div style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <input
              placeholder="Pesquisar no conteúdo das notas..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', fontSize: 16, padding: '10px 14px' }}
              autoFocus
            />
          </div>
          <button onClick={clearFilters}>Limpar</button>
        </div>

        <details open style={{ marginBottom: 20 }}>
          <summary style={{ cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Filtros
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FilterField label="Tag" value={filters.tag} onChange={v => updateFilter('tag', v)} placeholder="ex: javascript" />
            <div />
            <FilterField label="Após data" value={filters.after} onChange={v => updateFilter('after', v)} type="date" />
            <FilterField label="Antes de" value={filters.before} onChange={v => updateFilter('before', v)} type="date" />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Backlinks</label>
            <select
              value={filters.hasBacklinks}
              onChange={e => updateFilter('hasBacklinks', e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="">Qualquer</option>
              <option value="true">Com backlinks</option>
              <option value="false">Sem backlinks</option>
            </select>
          </div>
        </details>

        {loading && <p>Buscando...</p>}

        {searched && !loading && results.length === 0 && (
          <div className="empty-state">
            <h2>Nenhum resultado</h2>
            <p>Tente termos diferentes ou ajuste os filtros</p>
          </div>
        )}

        <div className="search-results-list">
          {results.map(item => (
            <div key={item.path} className="search-result-full" onClick={() => selectNote(item.path)}>
              <div className="result-title">{item.filename}</div>
              <div className="result-excerpt" dangerouslySetInnerHTML={{ __html: item.snippet }} />
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                <span>Relevância: {item.score.toFixed(2)}</span>
                {item.tags.length > 0 && <span>Tags: {item.tags.join(', ')}</span>}
                <span>{item.backlinks} backlinks</span>
                <span>{new Date(item.modified).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, value, onChange, placeholder, type }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  );
}
