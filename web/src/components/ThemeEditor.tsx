import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/ThemeContext';
import { BUILT_IN_THEMES, THEME_VARIABLE_LABELS, DEFAULT_VARIABLES, CustomTheme } from '../api/themes';

export default function ThemeEditor() {
  const { customThemes, saveCustomTheme, deleteCustomTheme, selectTheme, themeName } = useTheme();
  const allThemes = [...BUILT_IN_THEMES, ...customThemes];

  const [editing, setEditing] = useState<CustomTheme | null>(null);
  const [newName, setNewName] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const startEditing = (theme: CustomTheme) => {
    setEditing(theme);
    setNewName(theme.name);
    setVariables({ ...theme.variables });
  };

  const startNew = () => {
    setEditing({ name: '', variables: { ...DEFAULT_VARIABLES } });
    setNewName('');
    setVariables({ ...DEFAULT_VARIABLES });
  };

  const handleSave = async () => {
    if (!editing || !newName.trim()) return;
    await saveCustomTheme({ name: newName.trim(), variables });
    setEditing(null);
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Deletar tema "${name}"?`)) return;
    await deleteCustomTheme(name);
  };

  const updateVariable = (key: string, value: string) => {
    const root = document.documentElement;
    root.style.setProperty(key, value);
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (editing) {
      for (const [key, val] of Object.entries(variables)) {
        document.documentElement.style.setProperty(key, val as string);
      }
    } else {
      const current = allThemes.find(t => t.name === themeName);
      if (current) {
        for (const [key, val] of Object.entries(current.variables)) {
          document.documentElement.style.setProperty(key, val as string);
        }
      }
    }
  }, [editing]);

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Temas</h2>
        <button className="primary" onClick={startNew}>+ Novo Tema</button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        {allThemes.map(theme => (
          <div
            key={theme.name}
            className={`theme-card ${themeName === theme.name ? 'theme-card--active' : ''}`}
            onClick={() => selectTheme(theme.name)}
          >
            <div className="theme-card-preview">
              <div style={{ background: theme.variables['--accent'], width: 8, height: 8, borderRadius: '50%' }} />
              <div style={{ background: theme.variables['--bg'], width: 24, height: 24, borderRadius: 4, border: `1px solid ${theme.variables['--border']}` }} />
              <div style={{ background: theme.variables['--bg-secondary'], width: 24, height: 24, borderRadius: 4, border: `1px solid ${theme.variables['--border']}` }} />
              <div style={{ background: theme.variables['--bg-tertiary'], width: 24, height: 24, borderRadius: 4 }} />
            </div>
            <div className="theme-card-name">{theme.name}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); startEditing(theme); }} style={{ fontSize: 12, padding: '2px 8px' }}>
                Editar
              </button>
              {!BUILT_IN_THEMES.find(t => t.name === theme.name) && (
                <button onClick={e => { e.stopPropagation(); handleDelete(theme.name); }} style={{ fontSize: 12, padding: '2px 8px', color: 'var(--danger)' }}>
                  Deletar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="theme-editor">
          <h3>{editing.name ? 'Editar Tema' : 'Novo Tema'}</h3>
          <input
            placeholder="Nome do tema"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ width: '100%', marginBottom: 16 }}
          />
          <div className="theme-editor-grid">
            {Object.entries(THEME_VARIABLE_LABELS).map(([key, label]) => (
              <div key={key} className="theme-editor-field">
                <label>{label}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={variables[key] || DEFAULT_VARIABLES[key]}
                    onChange={e => updateVariable(key, e.target.value)}
                    style={{ width: 40, height: 36, padding: 0, border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    value={variables[key] || ''}
                    onChange={e => updateVariable(key, e.target.value)}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="primary" onClick={handleSave}>Salvar</button>
            <button onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
