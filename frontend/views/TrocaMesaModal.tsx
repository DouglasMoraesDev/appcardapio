import React, { useState } from 'react';
import { useApp } from '../store';
import { Lock } from 'lucide-react';

const TrocaMesaModal: React.FC<{ onLiberar: () => void; onClose: () => void }> = ({ onLiberar, onClose }) => {
  const { setDeviceTableId } = useApp();
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleLiberar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      // Valida senha do garçom no backend
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'douglas', password: senha, role: 'waiter' })
      });
      if (!res.ok) {
        setErro('Senha incorreta!');
        setLoading(false);
        return;
      }
      setDeviceTableId(null);
      onLiberar();
    } catch (err) {
      setErro('Erro ao validar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-xs rounded-[3rem] p-10 border border-white/5 space-y-8 shadow-2xl animate-in zoom-in-95 bg-[#0d1f15]">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 mx-auto text-[#d18a59]" />
          <h3 className="font-serif text-2xl uppercase tracking-widest text-[#d18a59]">Trocar Mesa</h3>
          <p className="text-[10px] text-white uppercase font-bold opacity-80">Informe a senha do garçom</p>
        </div>
        <form onSubmit={handleLiberar} className="space-y-6">
          <input
            type="password"
            placeholder="Senha do Garçom"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-3xl py-6 text-center text-4xl tracking-[0.5em] text-white outline-none"
            autoFocus
            required
          />
          {erro && <div className="text-red-500 text-xs text-center">{erro}</div>}
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 text-xs font-bold text-white uppercase opacity-40">Cancelar</button>
            <button type="submit" className="flex-1 bg-[#d18a59] text-black py-4 rounded-2xl text-[10px] font-bold uppercase" disabled={loading}>{loading ? 'Validando...' : 'Liberar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrocaMesaModal;
