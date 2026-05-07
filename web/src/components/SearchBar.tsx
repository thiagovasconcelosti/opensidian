import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, SearchResultItem } from '../api/client';

interface SearchBarProps {
  vaultPath: string;
  onSelect: (path: string) => void;
}

export default function SearchBar({ vaultPath, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!vaultPath || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.search.fullText(vaultPath, query);
        setResults(res.results.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, vaultPath]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (path: string) => {
    setOpen(false);
    setQuery('');
    onSelect(path);
    navigate(`/notes/${encodeURIComponent(path)}`);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        placeholder="Buscar notas..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: 220 }}
      />
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map(item => (
            <div key={item.path} className="search-result-item" onClick={() => select(item.path)}>
              <div className="result-title">{item.filename}</div>
              <div className="result-excerpt" dangerouslySetInnerHTML={{ __html: item.snippet }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
