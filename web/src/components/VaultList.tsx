import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Vault } from '../api/client';

interface VaultListProps {
  onSelect: (path: string) => void;
}

export default function VaultList({ onSelect }: VaultListProps) {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.vaults.list();
      setVaults(res.vaults);
    } catch (err) {
      console.error('Failed to load vaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName || !newPath) return;
    try {
      await api.vaults.create(newName, newPath);
      setShowCreate(false);
      setNewName('');
      setNewPath('');
      await load();
    } catch (err) {
      console.error('Failed to create vault:', err);
    }
  };

  const selectVault = (vault: Vault) => {
    onSelect(vault.path);
    navigate('/notes');
  };

  if (loading) return <div className="content-area"><p>Carregando...</p></div>;

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Vaults</h2>
        <button className="primary" onClick={() => setShowCreate(true)}>+ Novo Vault</button>
      </div>

      {vaults.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum vault ainda</h2>
          <p>Crie um vault para começar a escrever notas</p>
        </div>
      ) : (
        <div className="vault-grid">
          {vaults.map(vault => (
            <div key={vault.path} className="vault-card" onClick={() => selectVault(vault)}>
              <h3>{vault.name}</h3>
              <p>{vault.notes.length} notas</p>
              <p>{new Date(vault.created).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Novo Vault</h2>
            <input placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
            <input placeholder="Caminho (ex: ./vaults/meu-vault)" value={newPath} onChange={e => setNewPath(e.target.value)} style={{ width: '100%' }} />
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
