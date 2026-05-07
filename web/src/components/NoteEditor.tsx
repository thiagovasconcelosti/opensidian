import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { api, Note } from '../api/client';

interface NoteEditorProps {
  vaultPath: string;
}

export default function NoteEditor({ vaultPath }: NoteEditorProps) {
  const { path: notePath } = useParams();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [html, setHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const navigate = useNavigate();

  const decodePath = useCallback(() => {
    return notePath ? decodeURIComponent(notePath) : '';
  }, [notePath]);

  useEffect(() => {
    if (!vaultPath || !notePath) return;
    const load = async () => {
      try {
        const res = await api.notes.get(vaultPath, decodePath());
        setNote(res.note);
        setContent(res.note.content);
      } catch {
        setNote(null);
        setContent('');
      }
    };
    load();
  }, [vaultPath, notePath]);

  useEffect(() => {
    marked.setOptions({ gfm: true, breaks: true });
    Promise.resolve(marked.parse(content)).then(h => setHtml(h));
  }, [content]);

  useEffect(() => {
    if (!dirty || saving) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await api.notes.update(vaultPath, decodePath(), content);
        setDirty(false);
      } catch {
        // ignore
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, dirty, saving]);

  const handleChange = (val: string) => {
    setContent(val);
    setDirty(true);
  };

  const handleDelete = async () => {
    if (!confirm('Deletar esta nota?')) return;
    try {
      await api.notes.delete(vaultPath, decodePath());
      navigate('/notes');
    } catch {
      // ignore
    }
  };

  const handleCreateLink = () => {
    const target = prompt('Nome da nota para link:');
    if (!target) return;
    const linkText = `[[${target}]]`;
    setContent(prev => prev + '\n' + linkText);
    setDirty(true);
  };

  if (!vaultPath || !notePath) {
    return <div className="content-area"><div className="empty-state"><h2>Selecione uma nota</h2></div></div>;
  }

  if (!note) {
    return <div className="content-area"><div className="empty-state"><h2>Nota não encontrada</h2></div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="toolbar">
        <button onClick={() => navigate('/notes')}>← Voltar</button>
        <span style={{ fontWeight: 500 }}>{note.filename}.md</span>
        <span style={{ flex: 1 }} />
        <button onClick={handleCreateLink}>🔗 Link</button>
        <button onClick={handleDelete} style={{ color: 'var(--danger)' }}>🗑️</button>
        {dirty && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Salvando...</span>}
        {!dirty && note && <span style={{ fontSize: 12, color: 'var(--success)' }}>Salvo</span>}
      </div>

      <div className="editor-layout">
        <div className="editor-pane">
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="preview-pane" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
