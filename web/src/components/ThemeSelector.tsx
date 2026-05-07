import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/ThemeContext';
import { BUILT_IN_THEMES } from '../api/themes';

export default function ThemeSelector() {
  const { themeName, selectTheme, customThemes } = useTheme();
  const allThemes = [...BUILT_IN_THEMES, ...customThemes];
  const navigate = useNavigate();

  return (
    <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, padding: '0 8px' }}>
        TEMA
      </div>
      {allThemes.map(theme => (
        <div
          key={theme.name}
          onClick={() => selectTheme(theme.name)}
          className={`nav-item ${themeName === theme.name ? 'active' : ''}`}
          style={{ fontSize: 13, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: theme.variables['--accent'],
          }} />
          {theme.name}
        </div>
      ))}
      <div
        onClick={() => navigate('/themes')}
        className="nav-item"
        style={{ fontSize: 13, padding: '6px 8px' }}
      >
        ✏️ Gerenciar temas
      </div>
    </div>
  );
}
