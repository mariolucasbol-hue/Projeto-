import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGooglePicker } from '../lib/useGooglePicker';
import { Plano, Pergunta, Regra } from '../types';
import { Plus, Edit2, Trash2, FileText, Link as LinkIcon, UploadCloud, Info, ChevronDown } from 'lucide-react';
import { formatDriveUrl } from '../lib/utils';

export default function PlanosTab({ uid }: { uid: string }) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [prioridade, setPrioridade] = useState(1);
  const [preco, setPreco] = useState<number>(0);
  const [gratuito, setGratuito] = useState(true);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { openPicker } = useGooglePicker((url, _name) => {
    setPdfUrl(url);
  });

  useEffect(() => {
    const qPlanos = query(collection(db, 'personais', uid, 'planos'), orderBy('prioridade'));
    const unsubPlanos = onSnapshot(qPlanos, (snap) => setPlanos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plano))));

    const qPerguntas = query(collection(db, 'personais', uid, 'perguntas'), orderBy('ordem'));
    const unsubPerguntas = onSnapshot(qPerguntas, (snap) => setPerguntas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pergunta))));

    return () => { unsubPlanos(); unsubPerguntas(); };
  }, [uid]);

  const resetForm = () => {
    setNome(''); setDescricao(''); setPdfUrl('');
    setPrioridade(1); setPreco(0); setGratuito(true); setRegras([]);
    setEditingId(null);
  };

  const openModal = (p?: Plano) => {
    if (p) {
      setEditingId(p.id); setNome(p.nome); setDescricao(p.descricao);
      setPdfUrl(p.pdfUrl); setPrioridade(p.prioridade);
      setPreco(p.preco || 0); setGratuito(p.gratuito !== undefined ? p.gratuito : (p.preco === 0));
      setRegras(p.regras || []);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfUrl) return alert("Por favor, cole o link do PDF.");

    try {
      const cleanRegras = regras.map(r => {
        const nr: any = { campo: r.campo || '', operador: r.operador || 'igual', valor: r.valor || '' };
        if (r.valorMin !== undefined) nr.valorMin = r.valorMin;
        if (r.valorMax !== undefined) nr.valorMax = r.valorMax;
        return nr;
      });

      const formattedUrl = formatDriveUrl(pdfUrl);

      const data = {
        nome, descricao, pdfUrl: formattedUrl, prioridade, 
        preco: gratuito ? 0 : preco, gratuito, regras: cleanRegras, criadoEm: Date.now()
      };

      if (editingId) {
        await updateDoc(doc(db, 'personais', uid, 'planos', editingId), data);
      } else {
        await addDoc(collection(db, 'personais', uid, 'planos'), data);
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar plano: ' + error.message);
    }
  };

  const handleDelete = (plano: Plano) => {
    setDeleteConfirm({ id: plano.id, nome: plano.nome });
  };

  const confirmDeletePlano = async () => {
    if (!deleteConfirm) return;
    try {
      setErrorMsg('');
      await deleteDoc(doc(db, 'personais', uid, 'planos', deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error(error);
      setErrorMsg('Erro ao excluir plano: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-surface to-surface/40 p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <FileText className="w-6 h-6 text-primary" /> Planos de Treino
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure as rotinas de treino (PDFs) e defina as condições lógicas automáticas para recomendá-las aos alunos.
          </p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="w-full sm:w-auto h-11 justify-center bg-primary hover:bg-primary-hover text-black px-5 py-2.5 flex items-center gap-2 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" /> Novo Plano
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-900/60 text-gray-400 border-b border-border font-medium">
              <tr>
                <th className="p-4 pl-6 font-semibold tracking-wider text-xs uppercase text-gray-500 w-16">Ordem</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Nome do Plano</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Regras de Ativação</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500 text-center">PDF de Treino</th>
                <th className="p-4 pr-6 font-semibold tracking-wider text-xs uppercase text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {planos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto" />
                      <p className="text-lg font-bold text-gray-300">Nenhum plano cadastrado</p>
                      <p className="text-xs text-gray-500 leading-normal">Crie planos de treino e adicione as regras lógicas para recomendação automática.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                planos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-800/10 transition-colors group">
                    <td className="p-4 pl-6 whitespace-nowrap">
                      <span className="bg-gray-900 text-gray-300 px-2.5 py-1 rounded-lg text-xs font-mono border border-border inline-block min-w-[32px] text-center font-bold">
                        {p.prioridade}º
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white text-base leading-tight">{p.nome}</div>
                      <div className="text-xs font-medium mt-1 inline-flex items-center gap-1">
                        {p.gratuito ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Gratuito</span>
                        ) : (
                          <span className="text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/10">Venda R$ {p.preco.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {p.regras && p.regras.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          <span className="text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/10 inline-flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            {p.regras.length} {p.regras.length === 1 ? 'Regra' : 'Regras'} de Seleção
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 border border-amber-500/10 rounded-full inline-flex items-center gap-1 shadow-sm">
                          Plano Padrão (Sem Regras)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <a 
                        href={p.pdfUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="h-9 px-3 text-xs font-bold text-gray-300 hover:text-white bg-gray-900 border border-border group-hover:border-primary/30 rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 hover:bg-gray-800"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" /> Visualizar PDF
                      </a>
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => openModal(p)} 
                          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Editar de Plano"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p)} 
                          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Excluir Plano"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center p-4 py-12 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex-shrink-0 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/85 flex justify-between items-center bg-gray-900/40">
              <h3 className="text-xl font-bold text-white">{editingId ? 'Editar Plano de Treino' : 'Novo Plano de Treino'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                type="button"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Nome do Plano</label>
                  <input 
                    type="text" 
                    required 
                    value={nome} 
                    onChange={e=>setNome(e.target.value)} 
                    placeholder="Ex: Treino Hipertrofia Iniciante" 
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Ordem de Prioridade (Filtro)</label>
                  <div className="relative">
                    <select 
                      required 
                      value={prioridade} 
                      onChange={e=>setPrioridade(Number(e.target.value))} 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option value={1}>1º - Prioridade máxima</option>
                      <option value={2}>2º - Segunda Opção</option>
                      <option value={3}>3º - Terceira Opção</option>
                      <option value={4}>4º - Quarta Opção</option>
                      <option value={5}>5º - Quinta Opção</option>
                      <option value={6}>6º - Sexta Opção</option>
                      <option value={7}>7º - Sétima Opção</option>
                      <option value={8}>8º - Oitava Opção</option>
                      <option value={9}>9º - Nona Opção</option>
                      <option value={10}>10º - Plano Padrão (Fallback final)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 border-l border-border/65">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Descrição Curta (Exibida para o Aluno)</label>
                <textarea 
                  required 
                  value={descricao} 
                  onChange={e=>setDescricao(e.target.value)} 
                  placeholder="Descreva brevemente a rotina de exercícios, divisão muscular e para quem é recomendado..." 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 h-24 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm leading-relaxed" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-gray-950/40 p-4 border border-border rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input 
                    type="checkbox" 
                    checked={gratuito} 
                    onChange={e=>setGratuito(e.target.checked)} 
                    className="w-5 h-5 rounded-lg border-border text-primary focus:ring-primary/20 bg-background accent-primary transition-all cursor-pointer" 
                  />
                  <div>
                    <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">Distribuir gratuitamente</span>
                    <p className="text-[10px] text-gray-500 leading-tight">O aluno baixa o plano de graça logo após o envio</p>
                  </div>
                </label>
                {!gratuito && (
                  <div className="animate-in slide-in-from-right-3 duration-200">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Preço de Venda (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={preco} 
                      onChange={e=>setPreco(Number(e.target.value))} 
                      placeholder="Ex: 49.90" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold" 
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Link do PDF do Treino</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <LinkIcon className="h-4.5 w-4.5 text-gray-500" />
                    </div>
                    <input 
                      type="url" 
                      required 
                      placeholder="https://drive.google.com/file/d/..." 
                      value={pdfUrl} 
                      onChange={e => setPdfUrl(e.target.value)} 
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={openPicker} 
                    className="bg-white hover:bg-gray-100 text-black font-bold py-3 px-4 rounded-xl transition-all flex flex-shrink-0 items-center gap-2 text-sm shadow-md hover:shadow-white/5 active:scale-95"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 87.3 122.88">
                      <g><path fill="#0066da" d="M57.94,84.14l-29,50.23c-1.39,2.4-3.95,3.88-6.73,3.88H5.97L41.34,77.56 c2.78-4.81,0.06-2.58,16.59-31.25L57.94,84.14L57.94,84.14z"></path><path fill="#00ac47" d="M22.18,138.25h32.61c2.78,0,5.34-1.48,6.73-3.88l39.02-67.58H61.5L22.18,138.25L22.18,138.25z"></path><path fill="#ffba00" d="M72.04,74.52l-29-50.23c-1.39-2.4-1.39-5.36,0-7.76l6.63-11.48c1.39-2.4,3.95-3.88,6.73-3.88h32.61L41.34,77.56c-2.78,4.81-0.06,2.58-16.59,31.25L72.04,74.52L72.04,74.52z"></path></g>
                    </svg>
                    <span className="hidden sm:inline">Carregar do Drive</span>
                  </button>
                </div>
                
                {pdfUrl && pdfUrl.includes('drive.google.com') && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/15 rounded-xl p-4 text-xs text-amber-300 leading-relaxed flex gap-3 items-start animate-in fade-in duration-200">
                    <Info className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1 pr-1">
                      <p className="font-extrabold text-amber-200 text-[13px] tracking-wide uppercase">Nota de Compartilhamento:</p>
                      <p>
                        Para garantir que seu aluno abra esse arquivo de forma instantânea e sem solicitar acesso, certifique-se de configurar o arquivo no Google Drive como: <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded">Qualquer pessoa com o link (Leitor)</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border/80 pt-5 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-base text-white">Regras de Recomendação Inteligente</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Se as respostas do aluno combinarem com estas regras, esse plano será sugerido.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setRegras([...regras, { campo: perguntas[0]?.id || '', operador: 'igual', valor: '' }])} 
                    className="w-full sm:w-auto h-10 bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all hover:bg-primary/20 shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1 stroke-[2.5]"/> Adicionar Regra
                  </button>
                </div>
                {regras.map((r, i) => (
                  <div key={i} className="flex flex-col md:flex-row gap-2 mb-3 bg-gray-900/20 p-4 rounded-xl border border-border items-start md:items-center shadow-sm relative group animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                      <div className="relative">
                        <select 
                          value={r.campo} 
                          onChange={e => { const nc = [...regras]; nc[i].campo = e.target.value; setRegras(nc); }} 
                          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Selecione a Pergunta</option>
                          {perguntas.map(pq => <option key={pq.id} value={pq.id}>{pq.texto}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="relative">
                        <select 
                          value={r.operador} 
                          onChange={e => { const nc = [...regras]; nc[i].operador = e.target.value as any; setRegras(nc); }} 
                          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                          <option value="igual">Resposta Igual a</option>
                          <option value="diferente">Resposta Diferente de</option>
                          <option value="maior">Valor Maior que (&gt;)</option>
                          <option value="menor">Valor Menor que (&lt;)</option>
                          <option value="entre">Valor Estiver Entre</option>
                          <option value="contem">Contiver (Múltiplas escolhas)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      {r.operador === 'entre' ? (
                        <div className="flex gap-2 w-full">
                          <input 
                            type="text" 
                            placeholder="Mín" 
                            value={r.valorMin||''} 
                            onChange={e => { const nc = [...regras]; nc[i].valorMin = e.target.value; setRegras(nc); }} 
                            className="w-1/2 min-w-0 bg-background border border-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all font-semibold" 
                          />
                          <input 
                            type="text" 
                            placeholder="Máx" 
                            value={r.valorMax||''} 
                            onChange={e => { const nc = [...regras]; nc[i].valorMax = e.target.value; setRegras(nc); }} 
                            className="w-1/2 min-w-0 bg-background border border-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all font-semibold" 
                          />
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Digite o valor ou termo..." 
                          value={r.valor} 
                          onChange={e => { const nc = [...regras]; nc[i].valor = e.target.value; setRegras(nc); }} 
                          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all font-medium" 
                        />
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setRegras(regras.filter((_, idx)=>idx!==i))} 
                      className="p-2 text-red-450 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all self-end md:self-center mt-2.5 md:mt-0" 
                      title="Excluir regra"
                    >
                      <Trash2 className="w-4.5 h-4.5"/>
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-5 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-surface/90 backdrop-blur-md pb-2 z-10">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-black font-extrabold rounded-xl transition-all shadow-md hover:shadow-primary/5 active:scale-95"
                >
                  Salvar Plano de Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-white">Excluir Plano</h3>
            <p className="text-sm text-gray-400">
              Tem certeza que deseja excluir o plano de treino <strong className="text-white">{deleteConfirm.nome}</strong>? Essa ação não pode ser desfeita.
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
                onClick={confirmDeletePlano}
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
