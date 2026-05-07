import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Note } from '../api/client';
import SearchBar from './SearchBar';

interface NoteListProps {
  vaultPath: string;
}

export default function NoteList({ vaultPath }: NoteListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    if (!vaultPath) return;
    try {
      const res = await api.notes.list(vaultPath);
      setNotes(res.notes);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); load(); }, [vaultPath]);

  const handleCreate = async () => {
    if (!newFilename) return;
    try {
      await api.notes.create(vaultPath, newFilename, `# ${newFilename}\n\n`);
      setShowCreate(false);
      setNewFilename('');
      await load();
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  if (!vaultPath) {
    return <div className="content-area"><div className="empty-state"><h2>Selecione um vault</h2><p>Escolha um vault na página inicial</p></div></div>;
  }

  if (loading) return <div className="content-area"><p>Carregando...</p></div>;

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative' }}>
        <h2>Notas</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SearchBar vaultPath={vaultPath} onSelect={(path) => navigate(`/notes/${encodeURIComponent(path)}`)} />
          <button className="primary" onClick={() => setShowCreate(true)}>+ Nova</button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma nota</h2>
          <p>Crie sua primeira nota</p>
        </div>
      ) : (
        <div className="note-list">
          {notes.map(note => (
            <div key={note.path} className="note-item" onClick={() => navigate(`/notes/${encodeURIComponent(note.path)}`)}>
              <span className="note-title">{note.filename}</span>
              <span className="note-date">{new Date(note.modified).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nova Nota</h2>
            <input
              placeholder="Nome da nota"
              value={newFilename}
              onChange={e => setNewFilename(e.target.value)}
              style={{ width: '100%' }}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="primary" onClick={handleCreate}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
