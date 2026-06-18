import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ConfigMercadoPago, ConfigBranding } from '../types';
import { Palette, Image as ImageIcon, CheckCircle, ShieldAlert, KeyRound, Globe, PhoneCall } from 'lucide-react';

export default function ConfigTab({ uid }: { uid: string }) {
  const [accessToken, setAccessToken] = useState('');
  const [urlBase, setUrlBase] = useState(window.location.origin);
  const [loadingMP, setLoadingMP] = useState(false);
  const [msgMP, setMsgMP] = useState('');
  const [configurado, setConfigurado] = useState(false);

  // Branding States
  const [logoBase64, setLogoBase64] = useState('');
  const [corPrimaria, setCorPrimaria] = useState('#00e676');
  const [whatsappContato, setWhatsappContato] = useState('');
  const [loadingBranding, setLoadingBranding] = useState(false);
  const [msgBranding, setMsgBranding] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConfigMP = async () => {
      const docRef = doc(db, 'personais', uid, 'config', 'mercadopago');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as ConfigMercadoPago;
        setAccessToken(data.accessToken);
        if (data.urlBase) setUrlBase(data.urlBase);
        setConfigurado(true);
      }
    };
    const fetchConfigBranding = async () => {
      const docRef = doc(db, 'personais', uid, 'config', 'branding');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as ConfigBranding;
        if (data.logoUrl) setLogoBase64(data.logoUrl);
        if (data.corPrimaria) setCorPrimaria(data.corPrimaria);
        if (data.whatsappContato) setWhatsappContato(data.whatsappContato);
      }
    };
    fetchConfigMP();
    fetchConfigBranding();
  }, [uid]);

  const handleSaveMP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMP(true);
    setMsgMP('');
    try {
      await setDoc(doc(db, 'personais', uid, 'config', 'mercadopago'), {
        accessToken,
        urlBase,
        configuradoEm: Date.now()
      });
      setConfigurado(true);
      setMsgMP('Configurações salvas com sucesso!');
    } catch (error: any) {
      setMsgMP('Erro: ' + error.message);
    } finally {
      setLoadingMP(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingBranding(true);
    setMsgBranding('');
    try {
      await setDoc(doc(db, 'personais', uid, 'config', 'branding'), {
        logoUrl: logoBase64,
        corPrimaria,
        whatsappContato,
        atualizadoEm: Date.now()
      } as ConfigBranding);
      setMsgBranding('Personalização salva com sucesso!');
    } catch (error: any) {
      setMsgBranding('Erro: ' + error.message);
    } finally {
      setLoadingBranding(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { // limit 500kb
         alert("O logo deve ter no máximo 500KB para ser salvo (use um ícone de tamanho reduzido).");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div className="bg-gradient-to-r from-surface to-surface/40 p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" /> Integrações & Configurações
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Customize as opções visuais da marca e configure as chaves de checkout para receber pagamentos PIX/Cartão dos alunos.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-550/10">MP</div>
            <div>
              <h3 className="font-bold text-lg text-white">Mercado Pago (Checkout Pro)</h3>
              <p className="text-xs text-gray-500">Credenciais para faturamento automático de treinos recomendados</p>
            </div>
          </div>
          <div>
            {configurado ? (
              <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-550/10 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Configurado
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/10 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Chave Pendente
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveMP} className="space-y-5">
          <div className="bg-gray-900/40 p-4 rounded-xl text-xs text-gray-300 border border-border/80 leading-relaxed space-y-2">
            <p className="font-extrabold text-white text-[13px] tracking-wide uppercase">Instruções de Integração:</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-gray-400">
              <li>Acesse o painel do seu <strong className="text-gray-300">Mercado Pago</strong> com seus dados de login.</li>
              <li>Acesse <strong className="text-gray-300">Seu negócio</strong> ou navegue até as <strong className="text-gray-300">Credenciais</strong> na barra lateral.</li>
              <li>Copie a chave do <strong className="text-gray-300">Access Token de Produção</strong> (normalmente inicia com <code className="bg-black/40 px-1 py-0.5 rounded text-primary text-[10px]">APP_USR-...</code>).</li>
            </ol>
            <p className="text-[10px] text-amber-400 font-medium flex items-start gap-1.5 pt-1.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Para receber pagamentos via PIX ou Cartão de no aplicativo, verifique se sua conta do Mercado Pago está com os dados atualizados e ativos.</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Access Token de Produção</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <input 
                type="text" 
                required
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="Ex: APP_USR-87612398..."
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm leading-normal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">URL Principal para Retorno do Aluno</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Globe className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <input 
                type="url" 
                required
                value={urlBase}
                onChange={e => setUrlBase(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-gray-400 focus:outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <p className="text-[10px] text-gray-550 italic leading-snug">Geralmente, você não precisa alterar esta rota. Ela é calibrada para garantir que o aluno retorne ao seu aplicativo após pagar.</p>
          </div>

          {msgMP && (
            <div className={`p-4 rounded-xl text-xs font-semibold animate-in fade-in duration-200 border ${msgMP.includes('Erro') ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-green-500/10 text-green-400 border-green-550/10'}`}>
              {msgMP}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loadingMP}
              className="bg-primary hover:bg-primary-hover text-black font-extrabold h-11 px-6 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loadingMP ? 'Salvando...' : 'Salvar Token do Mercado Pago'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-border/80 pb-4">
          <div className="w-10 h-10 bg-gray-900 border border-border/80 rounded-xl flex items-center justify-center text-primary shadow-sm">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white font-sans">Identidade Visual (Branding)</h3>
            <p className="text-xs text-gray-500">Deixe as telas de avaliação e venda com as cores e imagens do seu negócio</p>
          </div>
        </div>

        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="space-y-3.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Logotipo ou Avatar do Personal</label>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-gray-950 to-gray-900 border border-border rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                {logoBase64 ? (
                  <img src={logoBase64} alt="Previsualizar" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-4 bg-gray-800 hover:bg-gray-700 hover:border-gray-600 border border-border text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    {logoBase64 ? 'Alterar Logo' : 'Enviar Logo'}
                  </button>
                  {logoBase64 && (
                     <button 
                       type="button" 
                       onClick={() => setLogoBase64('')} 
                       className="h-9 px-3 text-xs text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-all font-bold"
                     >
                       Remover
                     </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-550 leading-relaxed mt-2.5">Use JPEG, PNG. Para preservar espaço de banco de dados, limite o tamanho para até 500KB.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Tom de Cor de Destaque</label>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-inner border border-border/80">
                <input 
                  type="color" 
                  value={corPrimaria}
                  onChange={e => setCorPrimaria(e.target.value)}
                  className="absolute inset--2 w-[150%] h-[150%] rounded-xl cursor-pointer border-0 p-0"
                />
              </div>
              <div className="flex-1 max-w-[150px]">
                <input 
                  type="text" 
                  value={corPrimaria}
                  onChange={e => setCorPrimaria(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary font-mono text-sm uppercase text-white font-semibold text-center tracking-wide"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
               {['#00e676', '#3b82f6', '#ef4444', '#f97316', '#a855f7'].map(color => (
                 <button 
                   key={color} 
                   type="button" 
                   onClick={() => setCorPrimaria(color)} 
                   className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer hover:scale-105 active:scale-95 ${corPrimaria.toLowerCase() === color.toLowerCase() ? 'border-white' : 'border-transparent shadow-sm'}`}
                   style={{ backgroundColor: color }}
                   title={`Paleta ${color}`}
                 />
               ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">WhatsApp para Atendimento Técnico (Opcional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <PhoneCall className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <input 
                type="text" 
                value={whatsappContato}
                onChange={e => setWhatsappContato(e.target.value)}
                placeholder="Ex: 11999999999 (Apenas números)"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all text-sm"
              />
            </div>
            <p className="text-[10px] text-gray-550 italic leading-snug">Usado na tela final do aluno caso ele necessite entrar em contato direto ou relatar problemas de pagamento.</p>
          </div>

          {msgBranding && (
            <div className={`p-4 rounded-xl text-xs font-semibold animate-in fade-in duration-200 border ${msgBranding.includes('Erro') ? 'bg-red-500/10 text-red-500 border-red-500/10' : 'bg-green-500/10 text-green-400 border-green-550/10'}`}>
              {msgBranding}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loadingBranding}
              className="bg-primary hover:bg-primary-hover text-black font-extrabold h-11 px-6 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loadingBranding ? 'Salvando...' : 'Salvar Configurações Visuais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
