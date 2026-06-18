import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Aluno, Plano } from '../types';
import { 
  Eye, 
  Trash2, 
  MessageCircle, 
  Search, 
  Filter, 
  Users, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  Award,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { formatDriveUrl } from '../lib/utils';

export default function AlunosTab({ uid }: { uid: string }) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [planos, setPlanos] = useState<Record<string, Plano>>({});
  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [perguntasDict, setPerguntasDict] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filtroPlano, setFiltroPlano] = useState('todos');

  useEffect(() => {
    const qAlunos = query(collection(db, 'personais', uid, 'alunos'), orderBy('criadoEm', 'desc'));
    const unsubAlunos = onSnapshot(
      qAlunos,
      (snap) => {
        setAlunos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Aluno)));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching students: ", error);
        setLoading(false);
      }
    );

    // Fetch perguntas
    const unsubPerguntas = onSnapshot(collection(db, 'personais', uid, 'perguntas'), (snap) => {
      const pDict: Record<string, string> = {};
      snap.docs.forEach(doc => { pDict[doc.id] = doc.data().texto; });
      setPerguntasDict(pDict);
    });

    // Fetch planos
    const unsubPlanos = onSnapshot(collection(db, 'personais', uid, 'planos'), (snap) => {
      const pDict: Record<string, Plano> = {};
      snap.docs.forEach(doc => { pDict[doc.id] = { id: doc.id, ...doc.data() } as Plano; });
      setPlanos(pDict);
    });

    return () => { 
      unsubAlunos(); 
      unsubPerguntas();
      unsubPlanos();
    };
  }, [uid]);

  const viewUrl = `${window.location.origin}/aluno/${uid}`;

  const handleDeleteAluno = (aluno: Aluno) => {
    setDeleteConfirm({ id: aluno.id, nome: aluno.nome });
  };

  const confirmDeleteAluno = async () => {
    if (!deleteConfirm) return;
    try {
      setErrorMsg('');
      await deleteDoc(doc(db, 'personais', uid, 'alunos', deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao excluir aluno.');
    }
  };

  const handleSendWhatsApp = (aluno: Aluno) => {
    if (!aluno.whatsapp) {
      alert("Aluno não possui número de WhatsApp cadastrado.");
      return;
    }
    const cleanNumber = aluno.whatsapp.replace(/\D/g, '');
    let finalNumber = cleanNumber;
    if (finalNumber.length === 10 || finalNumber.length === 11) {
      finalNumber = '55' + finalNumber; // Assume Brazil
    }
    
    const planoRef = planos[aluno.planoId];
    let pdfLink = planoRef?.pdfUrl ? formatDriveUrl(planoRef.pdfUrl) : '(link não disponível)';
    
    const message = `Olá, ${aluno.nome}! Seu treino personalizado já está pronto. Acesse aqui: ${pdfLink}`;
    
    const waUrl = `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyAnswers = (al: Aluno) => {
    const lines = [
      `ALUNO: ${al.nome}`,
      `E-MAIL: ${al.email}`,
      `WHATSAPP: ${al.whatsapp}`,
      `PLANO RECOMENDADO: ${al.planoNome}`,
      `DATA DE REGISTRO: ${new Date(al.criadoEm).toLocaleString()}`,
      `========================`,
      `PERGUNTAS & RESPOSTAS:`,
      `========================`
    ];
    Object.entries(al.respostas).forEach(([qid, resp]) => {
      const qText = perguntasDict[qid] || 'Pergunta deletada';
      const ansText = Array.isArray(resp) ? resp.join(', ') : String(resp);
      lines.push(`❓ P: ${qText}`);
      lines.push(`💡 R: ${ansText}`);
      lines.push(`------------------------`);
    });
    
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // KPI Calculations
  const totalAlunos = alunos.length;

  const novosHoje = alunos.filter(al => {
    const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
    return al.criadoEm > umDiaAtras;
  }).length;

  const planoCounts = alunos.reduce((acc, al) => {
    acc[al.planoNome] = (acc[al.planoNome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let planoMaisComum = '-';
  let maxCount = 0;
  (Object.entries(planoCounts) as [string, number][]).forEach(([nome, count]) => {
    if (count > maxCount) {
      maxCount = count;
      planoMaisComum = nome;
    }
  });

  // Filter Logic
  const filteredAlunos = alunos.filter(al => {
    const term = search.toLowerCase();
    const matchesSearch = 
      al.nome.toLowerCase().includes(term) ||
      al.email.toLowerCase().includes(term) ||
      al.whatsapp.toLowerCase().includes(term);
    
    const matchesPlano = filtroPlano === 'todos' || al.planoId === filtroPlano;
    
    return matchesSearch && matchesPlano;
  });

  // Helper for beautiful gradient random avatars
  const getAvatarColors = (name: string) => {
    const colors = [
      'from-emerald-400 to-teal-600',
      'from-blue-400 to-indigo-600',
      'from-purple-400 to-pink-600',
      'from-amber-400 to-orange-600',
      'from-indigo-400 to-cyan-600',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header section with Link */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-surface to-surface/40 p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Users className="w-6 h-6 text-primary" /> Histórico de Alunos
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie os alunos recomendados, envie treinos rápidos e analise os questionários de avaliação recebidos.
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2.5 w-full lg:w-auto">
          <a 
            href={viewUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary hover:text-primary-hover text-sm font-semibold transition-all shadow-sm"
          >
            Formulário Público <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider">Total de Alunos</span>
            <span className="text-2xl font-black text-white">{totalAlunos}</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 relative">
            {novosHoje > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
            )}
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider">Últimas 24h</span>
            <span className="text-2xl font-black text-teal-400">+{novosHoje}</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider">Plano Mais Recomendado</span>
            <span className="text-lg font-black text-amber-400 truncate block" title={planoMaisComum}>{planoMaisComum}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nome, e-mail ou WhatsApp..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 placeholder-gray-500 text-white text-sm focus:outline-none focus:border-primary transition-all"
          />
        </div>
        <div className="relative min-w-[220px]">
          <Filter className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select 
            value={filtroPlano} 
            onChange={e => setFiltroPlano(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
          >
            <option value="todos">Todos os Planos</option>
            {(Object.values(planos) as Plano[]).map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500 border-l border-border pr-3">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Main Student History Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-900/60 text-gray-400 border-b border-border font-medium">
              <tr>
                <th className="p-4 pl-6 font-semibold tracking-wider text-xs uppercase text-gray-500 w-12">Avatar</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Aluno</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Contato</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Plano Recomendado</th>
                <th className="p-4 pr-6 font-semibold tracking-wider text-xs uppercase text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="w-10 h-10 bg-gray-800 rounded-full" /></td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-800 rounded w-44 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-28" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-800 rounded w-36 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-20" />
                    </td>
                    <td className="p-4"><div className="h-6 bg-gray-800 rounded-lg w-28" /></td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-9 w-9 bg-gray-800 rounded-lg" />
                        <div className="h-9 w-9 bg-gray-800 rounded-lg" />
                        <div className="h-9 w-9 bg-gray-800 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredAlunos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-lg font-bold text-gray-400">Nenhum registro encontrado</p>
                      <p className="text-xs text-gray-500">
                        {search || filtroPlano !== 'todos' ? 'Tente ajustar os filtros de busca para encontrar o aluno.' : 'Os alunos aparecerão assim que terminarem o questionário.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlunos.map(al => {
                  const initials = al.nome 
                    ? al.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
                    : 'AL';
                  
                  return (
                    <tr key={al.id} className="hover:bg-gray-800/20 group transition-colors">
                      {/* Avatar */}
                      <td className="p-4 pl-6 whitespace-nowrap">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarColors(al.nome)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                          {initials}
                        </div>
                      </td>

                      {/* Aluno info inline */}
                      <td className="p-4">
                        <div>
                          <span className="font-semibold text-white block truncate max-w-[200px] lg:max-w-xs">{al.nome}</span>
                          <span className="text-xs text-gray-500 block font-medium truncate max-w-[200px] lg:max-w-xs mt-0.5">{al.email}</span>
                        </div>
                      </td>

                      {/* Contact and Date */}
                      <td className="p-4 whitespace-nowrap">
                        <div>
                          <span className="text-white block font-medium text-sm">{al.whatsapp || 'Não informado'}</span>
                          <span className="text-[11px] text-gray-500 block mt-0.5 font-mono">
                            {new Date(al.criadoEm).toLocaleDateString()} ás {new Date(al.criadoEm).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </td>

                      {/* Recommended Plan Status tag */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 bg-primary/10 select-none border border-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          {al.planoNome}
                        </span>
                      </td>

                      {/* Action buttons inside structured div (avoiding flex on td layout bugs) */}
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={() => handleSendWhatsApp(al)} 
                            className="w-9 h-9 flex items-center justify-center text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-xl transition-all shadow-sm" 
                            title="Enviar treino no WhatsApp"
                          >
                            <MessageCircle className="w-4.5 h-4.5" />
                          </button>
                          
                          <button 
                            onClick={() => {
                              setModalAluno(al);
                              setCopied(false);
                            }} 
                            className="w-9 h-9 flex items-center justify-center text-gray-400 bg-gray-800 hover:bg-gray-700/80 hover:text-white rounded-xl border border-border transition-all shadow-sm" 
                            title="Visualizar Diagnóstico Completo"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>

                          <button 
                            onClick={() => handleDeleteAluno(al)} 
                            className="w-9 h-9 flex items-center justify-center text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-xl border border-red-500/10 transition-all shadow-sm" 
                            title="Remover Registro"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Response Modal */}
      {modalAluno && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-900/40">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${getAvatarColors(modalAluno.nome)} flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0`}>
                  {modalAluno.nome ? modalAluno.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AL'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-white truncate leading-tight">{modalAluno.nome}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                    <span className="font-semibold text-primary">{modalAluno.planoNome}</span>
                    <span className="text-gray-600">•</span>
                    <span>Questionário de Avaliação</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalAluno(null)} 
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Scroll Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Contact Information & Short actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-gray-950/40 p-4 rounded-xl border border-border">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>WhatsApp: <strong className="text-white">{modalAluno.whatsapp || 'Não cadastrado'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="truncate">Email: <strong className="text-white">{modalAluno.email}</strong></span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Cadastrado em: <strong className="text-white">{new Date(modalAluno.criadoEm).toLocaleDateString()}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Treino Recom.: <strong className="text-primary">{modalAluno.planoNome}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons to send routine or copy responses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => handleSendWhatsApp(modalAluno)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition-all shadow-md"
                >
                  <MessageCircle className="w-5 h-5 fill-current" /> Enviar Treino por WhatsApp
                </button>
                <button 
                  onClick={() => handleCopyAnswers(modalAluno)}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all border shadow-md ${
                    copied 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-gray-800 hover:bg-gray-750 border-border text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-primary" /> Diagnóstico Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 text-gray-400" /> Copiar Diagnóstico (Resumo)
                    </>
                  )}
                </button>
              </div>

              {/* Q&A Responses breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Respostas da Ficha de Cadastro
                </h4>
                
                <div className="space-y-3">
                  {Object.entries(modalAluno.respostas).map(([id, resposta]) => (
                    <div key={id} className="bg-gray-950/20 rounded-xl border border-border/80 p-4 hover:border-gray-700/60 transition-colors">
                      <p className="text-xs text-gray-500 mb-1.5 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                        {perguntasDict[id] || 'Pergunta removida do sistema'}
                      </p>
                      <p className="text-white font-medium text-sm leading-relaxed pl-2.5 border-l-2 border-primary/40">
                        {Array.isArray(resposta) ? resposta.join(', ') : String(resposta)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exclude modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" /> Excluir Aluno
            </h3>
            <p className="text-sm text-gray-400">
              Tem certeza que deseja excluir o aluno(a) <strong className="text-white">{deleteConfirm.nome}</strong>? Essa ação não pode ser desfeita e todas as informações serão deletadas permanentemente.
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
                onClick={confirmDeleteAluno}
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
