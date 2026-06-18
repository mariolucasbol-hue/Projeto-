import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Pergunta } from '../types';
import { Plus, Edit2, Trash2, GripVertical, ChevronUp, ChevronDown, CheckCircle, HelpCircle } from 'lucide-react';

export default function PerguntasTab({ uid }: { uid: string }) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<Pergunta['tipo']>('texto');
  const [opcoes, setOpcoes] = useState<string[]>(['']);
  const [obrigatoria, setObrigatoria] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; texto: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'personais', uid, 'perguntas'), orderBy('ordem'));
    const unsub = onSnapshot(q, (snap) => {
      setPerguntas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pergunta)));
    });
    return unsub;
  }, [uid]);

  const resetForm = () => {
    setTexto('');
    setTipo('texto');
    setOpcoes(['']);
    setObrigatoria(true);
    setEditingId(null);
  };

  const openModal = (p?: Pergunta) => {
    if (p) {
      setEditingId(p.id);
      setTexto(p.texto);
      setTipo(p.tipo);
      setOpcoes(p.opcoes || ['']);
      setObrigatoria(p.obrigatoria);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        texto,
        tipo,
        opcoes: tipo.includes('selecao') ? (opcoes || []).filter(o => o && o.trim() !== '') : [],
        obrigatoria,
        ordem: editingId ? perguntas.find(p => p.id === editingId)?.ordem || 0 : perguntas.length + 1,
        criadaEm: Date.now()
      };

      if (editingId) {
        await updateDoc(doc(db, 'personais', uid, 'perguntas', editingId), data);
      } else {
        await addDoc(collection(db, 'personais', uid, 'perguntas'), data);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleDelete = (pergunta: Pergunta) => {
    setDeleteConfirm({ id: pergunta.id, texto: pergunta.texto });
  };

  const confirmDeletePergunta = async () => {
    if (!deleteConfirm) return;
    try {
      setErrorMsg('');
      await deleteDoc(doc(db, 'personais', uid, 'perguntas', deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error(error);
      setErrorMsg('Erro ao excluir pergunta: ' + error.message);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const curr = perguntas[index];
    const prev = perguntas[index - 1];
    await updateDoc(doc(db, 'personais', uid, 'perguntas', curr.id), { ordem: prev.ordem });
    await updateDoc(doc(db, 'personais', uid, 'perguntas', prev.id), { ordem: curr.ordem });
  };

  const moveDown = async (index: number) => {
    if (index === perguntas.length - 1) return;
    const curr = perguntas[index];
    const next = perguntas[index + 1];
    await updateDoc(doc(db, 'personais', uid, 'perguntas', curr.id), { ordem: next.ordem });
    await updateDoc(doc(db, 'personais', uid, 'perguntas', next.id), { ordem: curr.ordem });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-surface to-surface/40 p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <HelpCircle className="w-6 h-6 text-primary" /> Perguntas do Questionário
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Defina as perguntas que o aluno responderá. O sistema usa as respostas para recomendar o treino correto.
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="w-full sm:w-auto h-11 justify-center bg-primary hover:bg-primary-hover text-black px-5 py-2.5 flex items-center gap-2 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          Adicionar Pergunta
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
        {perguntas.map((p, idx) => (
          <div 
            key={p.id} 
            className="p-5 border-b border-border/60 last:border-0 flex items-center gap-4 hover:bg-surface-hover/30 transition-all duration-200"
          >
            <div className="flex flex-col gap-0.5">
              <button 
                onClick={() => moveUp(idx)} 
                className="p-1 text-gray-500 hover:text-primary hover:bg-gray-800 rounded-lg transition-all disabled:opacity-20 disabled:hover:text-gray-500 disabled:hover:bg-transparent" 
                disabled={idx === 0}
                title="Mover para cima"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button 
                onClick={() => moveDown(idx)} 
                className="p-1 text-gray-500 hover:text-primary hover:bg-gray-800 rounded-lg transition-all disabled:opacity-20 disabled:hover:text-gray-500 disabled:hover:bg-transparent" 
                disabled={idx === perguntas.length - 1}
                title="Mover para baixo"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white sm:text-lg tracking-tight leading-tight">{p.texto}</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  {p.obrigatoria && (
                    <span className="text-[11px] font-bold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/10">
                      Obrigatória
                    </span>
                  )}
                  <span className="text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/10 capitalize">
                    {p.tipo === 'selecao_unica' ? 'Escolha Única' : p.tipo === 'selecao_multipla' ? 'Múltipla Escolha' : p.tipo}
                  </span>
                </div>
              </div>
              {p.tipo.includes('selecao') && p.opcoes && (
                <div className="text-xs text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                  <span className="text-gray-400 font-semibold">Opções disponíveis:</span> 
                  <span className="bg-gray-900 px-2 py-0.5 border border-border rounded text-gray-300 font-mono text-[11px]">{p.opcoes.join(' • ')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => openModal(p)} 
                className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                title="Editar pergunta"
              >
                <Edit2 className="w-4.5 h-4.5" />
              </button>
              <button 
                onClick={() => handleDelete(p)} 
                className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                title="Excluir pergunta"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        ))}
        {perguntas.length === 0 && (
          <div className="p-12 text-center text-gray-500 max-w-sm mx-auto space-y-2">
            <HelpCircle className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-lg font-bold text-gray-300">Nenhuma pergunta cadastrada</p>
            <p className="text-xs text-gray-500 leading-normal">Utilize o botão acima para adicionar sua primeira pergunta do questionário.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/80 flex justify-between items-center bg-gray-900/40">
              <h3 className="text-xl font-bold text-white">{editingId ? 'Editar Pergunta' : 'Nova Pergunta'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                type="button"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Texto da pergunta</label>
                <input 
                  type="text" 
                  required
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="Ex: Qual é o seu principal objetivo na academia?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Tipo de Resposta</label>
                <div className="relative">
                  <select 
                    value={tipo}
                    onChange={e => setTipo(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm.5 appearance-none cursor-pointer"
                  >
                    <option value="texto">Texto livre (Parágrafo)</option>
                    <option value="numero">Número (Idade, Peso, etc.)</option>
                    <option value="selecao_unica">Escolha única (Rádios)</option>
                    <option value="selecao_multipla">Múltipla escolha (Checkboxes)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 border-l border-border/65">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {tipo.includes('selecao') && (
                <div className="space-y-3 bg-gray-900/30 p-4 border border-border/60 rounded-xl">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Opções do Menu</label>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {opcoes.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input 
                          type="text" 
                          required
                          value={opt}
                          onChange={e => {
                            const newOpts = [...opcoes];
                            newOpts[i] = e.target.value;
                            setOpcoes(newOpts);
                          }}
                          placeholder={`Opção ${i + 1}`}
                          className="flex-1 bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-all"
                        />
                        <button 
                          type="button" 
                          onClick={() => setOpcoes(opcoes.filter((_, idx) => idx !== i))}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remover opção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setOpcoes([...opcoes, ''])}
                    className="text-primary hover:text-primary-hover text-xs font-bold flex items-center gap-1.5 transition-colors mt-2"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Adicionar opção
                  </button>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input 
                    type="checkbox"
                    checked={obrigatoria}
                    onChange={e => setObrigatoria(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-border text-primary focus:ring-primary/20 bg-background accent-primary transition-all cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Pergunta obrigatória</span>
                    <p className="text-[11px] text-gray-500">O aluno não poderá pular esta pergunta sem responder</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-xl transition-all shadow-md hover:shadow-primary/5 active:scale-95"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-white">Excluir Pergunta</h3>
            <p className="text-sm text-gray-400">
              Tem certeza que deseja excluir a pergunta <strong className="text-white">"{deleteConfirm.texto}"</strong>? Essa ação não pode ser desfeita.
            </p>
            {errorMsg && (
              <p className="text-sm text-red-500 bg-red-500/10 p-2.5 rounded border border-red-500/20">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setDeleteConfirm(null); setErrorMsg(''); }}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePergunta}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
