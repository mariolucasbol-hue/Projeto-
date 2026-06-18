import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Pagamento } from '../types';
import { Download, DollarSign, ArrowUpRight, Clock, Receipt, Banknote } from 'lucide-react';

export default function FinanceiroTab({ uid }: { uid: string }) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  useEffect(() => {
    const qPagamentos = query(collection(db, 'personais', uid, 'pagamentos'), orderBy('criadoEm', 'desc'));
    const unsub = onSnapshot(qPagamentos, (snap) => {
      setPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pagamento)));
    });
    return unsub;
  }, [uid]);

  const currMonth = new Date().getMonth();
  const aprovados = pagamentos.filter(p => p.status === 'aprovado');
  const aprovadosMes = aprovados.filter(p => new Date(p.criadoEm).getMonth() === currMonth);
  const totalRecebidoMes = aprovadosMes.reduce((acc, p) => acc + p.valor, 0);
  const vendasMes = aprovadosMes.length;
  const pendentes = pagamentos.filter(p => p.status === 'pendente').length;

  const exportCSV = () => {
    const rows = [
      ['Data', 'Aluno', 'Plano', 'Valor', 'Status'],
      ...pagamentos.map(p => [
        new Date(p.criadoEm).toLocaleDateString(),
        p.alunoNome,
        p.planoNome,
        p.valor.toString(),
        p.status
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_fitplan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const statusColors: any = {
    'aprovado': 'bg-emerald-500/10 text-emerald-400 border-emerald-550/20',
    'pendente': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'rejeitado': 'bg-red-500/10 text-red-400 border-red-500/20',
    'falhou': 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-surface to-surface/40 p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Receipt className="w-6 h-6 text-primary" /> Painel Financeiro
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitore o faturamento, gerencie assinaturas ou vendas ativas e exporte relatórios consolidados.
          </p>
        </div>
        <button 
          onClick={exportCSV} 
          className="w-full sm:w-auto h-11 justify-center bg-gray-900 hover:bg-gray-800 border border-border text-white px-5 py-2.5 flex items-center gap-2 rounded-xl font-bold transition-all duration-300 shadow-lg active:scale-[0.98]"
        >
          <Download className="w-4.5 h-4.5" /> Exportar Relatório CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider">Total Recebido (Mês)</span>
            <span className="text-2xl font-bold text-primary">R$ {totalRecebidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider">Vendas Concluídas</span>
            <span className="text-2xl font-bold text-white">{vendasMes} adesões</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider">Aguardando Pagamento</span>
            <span className="text-2xl font-bold text-amber-500">{pendentes} pendentes</span>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-border/80 bg-gray-900/40">
          <h3 className="font-bold text-lg text-white">Extrato de Transações</h3>
          <p className="text-xs text-gray-400 mt-0.5">Histórico completo de pagamentos processados pelo checkout automatizado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-900/60 text-gray-400 border-b border-border font-medium">
              <tr>
                <th className="p-4 pl-6 font-semibold tracking-wider text-xs uppercase text-gray-500">Data</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Aluno</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Plano Pago</th>
                <th className="p-4 font-semibold tracking-wider text-xs uppercase text-gray-500">Valor Pago</th>
                <th className="p-4 pr-6 font-semibold tracking-wider text-xs uppercase text-gray-500 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {pagamentos.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/10 transition-colors">
                  <td className="p-4 pl-6 text-gray-400 font-mono text-xs whitespace-nowrap">
                    {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-white text-base leading-none">{p.alunoNome}</div>
                    <div className="text-xs text-gray-500 font-medium mt-1">{p.alunoEmail}</div>
                  </td>
                  <td className="p-4 text-gray-300 font-medium whitespace-nowrap">{p.planoNome}</td>
                  <td className="p-4 font-bold text-white whitespace-nowrap">R$ {p.valor.toFixed(2)}</td>
                  <td className="p-4 pr-6 text-right whitespace-nowrap">
                    <span className={`px-2.5 py-1 border rounded-full text-xs font-bold uppercase tracking-wider select-none ${statusColors[p.status] || 'bg-gray-800 text-gray-300 border-transparent'}`}>
                      {p.status === 'aprovado' ? 'Confirmado' : p.status === 'pendente' ? 'Aguardando' : p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagamentos.length === 0 && (
            <div className="p-12 text-center text-gray-500 max-w-sm mx-auto space-y-2">
              <Banknote className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-lg font-bold text-gray-300">Nenhum pagamento registrado</p>
              <p className="text-xs text-gray-500 leading-normal">As vendas e assinaturas dos planos de treinos aprovadas aparecerão aqui em tempo real.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
