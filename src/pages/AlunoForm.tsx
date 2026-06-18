import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, query, orderBy, getDocs, getDoc, doc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Pergunta, Plano, ConfigMercadoPago, ConfigBranding } from '../types';
import { CheckCircle, Download, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDriveUrl } from '../lib/utils';

export default function AlunoForm() {
  const { personalId } = useParams();
  const [searchParams] = useSearchParams();

  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [configMP, setConfigMP] = useState<ConfigMercadoPago | null>(null);
  const [branding, setBranding] = useState<ConfigBranding | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [currentStep, setCurrentStep] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  
  // Results
  const [matchedPlano, setMatchedPlano] = useState<Plano | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [alunoDocId, setAlunoDocId] = useState(''); // To link payment to student
  const [nomeAluno, setNomeAluno] = useState('');
  const [emailAluno, setEmailAluno] = useState('');

  // Duplicate Check State
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [duplicateAlunoId, setDuplicateAlunoId] = useState('');
  const [tempAlunoData, setTempAlunoData] = useState<any>(null);

  // Payment Status handling on redirect
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'checking' | 'approved' | 'pending' | 'rejected'>('idle');

  // Load Data
  useEffect(() => {
    if (!personalId) return;
    const fetchData = async () => {
      try {
        const pSnap = await getDocs(query(collection(db, 'personais', personalId, 'perguntas'), orderBy('ordem')));
        const pgs = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pergunta));
        setPerguntas(pgs);

        const plSnap = await getDocs(query(collection(db, 'personais', personalId, 'planos'), orderBy('prioridade')));
        setPlanos(plSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plano)));

        const configSnap = await getDoc(doc(db, 'personais', personalId, 'config', 'mercadopago'));
        if (configSnap.exists()) setConfigMP(configSnap.data() as ConfigMercadoPago);

        const brandingSnap = await getDoc(doc(db, 'personais', personalId, 'config', 'branding'));
        if (brandingSnap.exists()) setBranding(brandingSnap.data() as ConfigBranding);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar o questionário. Verifique se o link está correto.');
        setLoading(false);
      }
    };
    fetchData();
  }, [personalId]);

  // Handle Payment Return
  useEffect(() => {
    const status = searchParams.get('status');
    const payment_id = searchParams.get('payment_id');
    const extRef = searchParams.get('external_reference');
    const planoIdURL = searchParams.get('plano');

    if (status && payment_id && extRef && personalId) {
      setPaymentStatus('checking');
      handlePaymentVerification(status, payment_id, extRef, planoIdURL);
    }
  }, [searchParams, personalId]);

  const handlePaymentVerification = async (urlStatus: string, payment_id: string, extRef: string, planoIdFallback: string | null) => {
    try {
      const parts = extRef.split('__');
      const alId = parts[0];
      const plId = parts[1] || planoIdFallback;

      let verifiedStatus = urlStatus;
      
      // Validação real com a API do Mercado Pago
      const configSnap = await getDoc(doc(db, 'personais', personalId!, 'config', 'mercadopago'));
      if (configSnap.exists()) {
        const conf = configSnap.data() as ConfigMercadoPago;
        if (conf.accessToken) {
          try {
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
              headers: { Authorization: `Bearer ${conf.accessToken}` }
            });
            if (mpRes.ok) {
              const mpData = await mpRes.json();
              verifiedStatus = mpData.status; // Pode ser 'approved', 'pending', 'rejected', etc.
            } else {
              console.warn("Erro ao validar pagamento com Mercado Pago, usando status da URL.", await mpRes.text());
            }
          } catch (err) {
            console.error("Erro na requisição ao Mercado Pago:", err);
          }
        }
      }
      
      const pDoc = await getDoc(doc(db, 'personais', personalId!, 'alunos', alId));
      let aName = 'Aluno';
      let aEmail = '';
      if(pDoc.exists()) {
         aName = pDoc.data().nome || 'Aluno';
         aEmail = pDoc.data().email || '';
      }

      // Re-hydrate plano to get Name and price
      const plSnap = await getDocs(query(collection(db, 'personais', personalId!, 'planos'), orderBy('prioridade')));
      const planList = plSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plano));
      const myPlan = planList.find(p => p.id === plId);

      // Save payment
      await addDoc(collection(db, 'personais', personalId!, 'pagamentos'), {
        alunoId: alId,
        alunoNome: aName,
        alunoEmail: aEmail,
        planoId: plId || '',
        planoNome: myPlan?.nome || 'Plano Desconhecido',
        valor: myPlan?.preco || 0,
        status: verifiedStatus === 'approved' ? 'aprovado' : (verifiedStatus === 'pending' ? 'pendente' : 'rejeitado'),
        paymentIdMP: payment_id,
        externalReference: extRef,
        criadoEm: Date.now(),
        aprovadoEm: verifiedStatus === 'approved' ? Date.now() : null
      });

      setPaymentStatus(verifiedStatus === 'approved' ? 'approved' : 'rejected');
      setMatchedPlano(myPlan || null);

    } catch(e) {
       console.error("Payment check error", e);
       setPaymentStatus('rejected');
    }
  };

  const handleNext = () => {
    if (currentStep < perguntas.length) setCurrentStep(c => c + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleFinish = async () => {
    if (loading) return; // Prevent double taps on mobile
    setLoading(true);
    try {
      // Logic Match
      let bestPlan: Plano | null = null;
      const planosOrdenados = [...planos].sort((a,b) => a.prioridade - b.prioridade);

      for (const plano of planosOrdenados) {
        if (!plano.regras || plano.regras.length === 0) {
          // If a plan has no rules, it's considered a fallback/default plan and matches anyone.
          bestPlan = plano;
          break;
        }
        
        let regrasOk = true;
        for (const regra of plano.regras) {
          const vAluno = respostas[regra.campo];
          const vAlunoNum = Number(vAluno);
          const rVal = regra.valor;
          const rValNum = Number(rVal);

          switch (regra.operador) {
            case 'igual': if (vAluno != rVal) regrasOk=false; break;
            case 'diferente': if (vAluno == rVal) regrasOk=false; break;
            case 'maior': if (vAlunoNum <= rValNum) regrasOk=false; break;
            case 'menor': if (vAlunoNum >= rValNum) regrasOk=false; break;
            case 'entre': if (vAlunoNum < Number(regra.valorMin) || vAlunoNum > Number(regra.valorMax)) regrasOk=false; break;
            case 'contem': if (!vAluno?.includes?.(rVal)) regrasOk=false; break;
          }
        }
        if (regrasOk) {
          bestPlan = plano;
          break;
        }
      }

      // Process native fields
      let fNome = ''; let fEmail = ''; let fWatts = '';
      Object.keys(respostas).forEach(k => {
        const pergunta = perguntas.find(p => p.id === k);
        const rawTxt = pergunta?.texto || '';
        const txt = rawTxt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const valorStr = Array.isArray(respostas[k]) ? respostas[k].join(' ') : String(respostas[k] || '');
        
        if (txt.includes('nome')) fNome = valorStr;
        if (txt.includes('e-mail') || txt.includes('email')) fEmail = valorStr;
        
        if (txt.includes('wpp') || txt.includes('whatsapp') || txt.includes('telefone') || txt.includes('celular')) {
          // Se for uma pergunta de contato as pessoas geralmente digitam vários números, 
          // então garantimos que tem pelo menos uns 8 dígitos para não ser um "Sim" ou "Não"
          const numbersOnly = valorStr.replace(/\D/g, '');
          if (numbersOnly.length >= 8) {
            fWatts = valorStr;
          }
        }
      });

      // Verification to prevent duplicate submissions
      const cleanEmail = fEmail.trim().toLowerCase();
      const cleanWatts = fWatts.replace(/\D/g, '');

      console.log('Fetching students to check duplicates');
      const alunosRef = collection(db, 'personais', personalId!, 'alunos');
      const alunosSnap = await getDocs(alunosRef);
      console.log('Students fetched', alunosSnap.size);
      
      let jaCadastrado = false;
      let foundId = '';

      const checkSamePhone = (p1: string, p2: string) => {
        if (!p1 || !p2 || p1.length < 8 || p2.length < 8) return false;
        return p1.slice(-8) === p2.slice(-8); // Comparando os últimos 8 dígitos é muito mais assertivo
      };

      alunosSnap.forEach(doc => {
        const data = doc.data();
        const docEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
        const docWatts = typeof data.whatsapp === 'string' ? data.whatsapp.replace(/\D/g, '') : '';
        
        if (
          (cleanEmail && docEmail === cleanEmail) || 
          checkSamePhone(cleanWatts, docWatts)
        ) {
          jaCadastrado = true;
          foundId = doc.id;
        }
      });

      if (jaCadastrado) {
        setDuplicateAlunoId(foundId);
        setTempAlunoData({ respostas, bestPlan, fNome, fEmail, fWatts });
        setShowDuplicatePrompt(true);
        setLoading(false);
        return;
      }

      await finalizeSave(null, { respostas, bestPlan, fNome, fEmail, fWatts });
    } catch(e) {
      console.error(e);
      alert("Erro ao processar as respostas: " + ((e as any).message || ''));
      setLoading(false);
    }
  };

  const confirmUpdateAluno = async () => {
    setShowDuplicatePrompt(false);
    setLoading(true);
    try {
      await finalizeSave(duplicateAlunoId, tempAlunoData);
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar os dados: " + ((e as any).message || ''));
      setLoading(false);
    }
  };

  const finalizeSave = async (existingId: string | null, data: any) => {
    console.log('Finalizando save. existingId:', existingId);
    const { respostas, bestPlan, fNome, fEmail, fWatts } = data;
    setNomeAluno(fNome);
    setEmailAluno(fEmail);

    let docId = existingId;

    try {
      if (existingId) {
        console.log('Update existing doc');
        await setDoc(doc(db, 'personais', personalId!, 'alunos', existingId), {
          respostas,
          planoId: bestPlan?.id || '',
          planoNome: bestPlan?.nome || '',
          nome: fNome,
          email: fEmail,
          whatsapp: fWatts,
          atualizadoEm: Date.now()
        }, { merge: true });
        console.log('Update existing doc success');
      } else {
        console.log('Create new doc');
        const refDoc = await addDoc(collection(db, 'personais', personalId!, 'alunos'), {
          respostas,
          planoId: bestPlan?.id || '',
          planoNome: bestPlan?.nome || '',
          nome: fNome,
          email: fEmail,
          whatsapp: fWatts,
          criadoEm: Date.now()
        });
        console.log('Create new doc success, id:', refDoc.id);
        docId = refDoc.id;
      }
    } catch (err) {
      console.error('Falhou no setDoc/addDoc:', err);
      throw err;
    }

    setAlunoDocId(docId!);


    if (bestPlan) {
      setMatchedPlano(bestPlan);
    } else {
      setNoMatch(true);
    }
    setLoading(false);
  };

  const handleComprar = async () => {
    if (!matchedPlano || !configMP || !configMP.accessToken) {
      alert("Erro: Integração de pagamento não configurada pelo Personal.");
      return;
    }
    try {
      const urlBase = configMP.urlBase || window.location.origin;
      const preference = {
        items: [{
          id: matchedPlano.id,
          title: matchedPlano.nome,
          description: matchedPlano.descricao,
          quantity: 1,
          currency_id: "BRL",
          unit_price: matchedPlano.preco
        }],
        payer: { name: nomeAluno, email: emailAluno || "email@desconhecido.com" },
        back_urls: {
          success: `${urlBase}/aluno/${personalId}?status=approved&plano=${matchedPlano.id}&aluno=${alunoDocId}`,
          failure: `${urlBase}/aluno/${personalId}?status=failure&plano=${matchedPlano.id}&aluno=${alunoDocId}`,
          pending: `${urlBase}/aluno/${personalId}?status=pending&plano=${matchedPlano.id}&aluno=${alunoDocId}`
        },
        auto_return: "approved",
        external_reference: `${alunoDocId}__${matchedPlano.id}`
      };

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${configMP.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preference)
      });
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.error(data);
        alert("Erro ao criar pagamento");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de rede ao criar pagamento");
    }
  };

  const currentQ = perguntas[currentStep];
  const isLast = currentStep === perguntas.length - 1;

  const cssVars = {
    '--color-primary': branding?.corPrimaria || '#00e676',
    '--color-primary-hover': branding?.corPrimaria || '#00e676'
  } as React.CSSProperties;

  const PageWrapper = ({ children, showBack, onBack }: { children: React.ReactNode; showBack?: boolean; onBack?: () => void }) => (
    <div style={cssVars} className="min-h-screen bg-background text-white flex flex-col font-sans relative">
      {/* Safe Area Top Buffer to prevent Notch/Camera overlapping on mobile */}
      <div 
        className="w-full shrink-0" 
        style={{ height: 'max(1.2rem, env(safe-area-inset-top))' }}
      />
      
      {/* Sleek Top Header containing Logo and Back Button */}
      <header className="w-full flex items-center justify-between px-4 md:px-8 py-3 shrink-0 relative border-b border-border/20 bg-background z-30 min-h-[4.5rem]">
        {/* Left slot: Back Button */}
        <div className="flex-1 flex justify-start items-center">
          {showBack && onBack && (
            <button 
              onClick={onBack} 
              type="button"
              className="z-40 p-2 px-3 md:p-3 text-gray-400 hover:text-white rounded-xl bg-gray-900/40 hover:bg-surface border border-gray-800 transition-all flex items-center gap-2 active:scale-95 shadow-sm cursor-pointer"
              title="Voltar para a pergunta anterior"
            >
              <ArrowLeft className="w-4 h-4 text-primary" /> 
              <span className="text-xs md:text-sm font-bold">Anterior</span>
            </button>
          )}
        </div>

        {/* Center slot: Logo */}
        <div className="flex-shrink-0 flex justify-center items-center">
          {branding?.logoUrl ? (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border border-gray-800 bg-gray-900 shadow-md">
              <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className="text-base md:text-lg font-bold tracking-tight text-white/95">FitPlan</span>
          )}
        </div>

        {/* Right slot: Spacer to maintain perfect center of logo */}
        <div className="flex-1 flex justify-end items-center">
          {showBack && (
            <span className="text-[10px] md:text-xs font-mono text-gray-500 uppercase tracking-wider hidden sm:block">
              Avaliação Física
            </span>
          )}
        </div>
      </header>

      {children}
    </div>
  );

  if (loading || paymentStatus === 'checking') {
    return <PageWrapper>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 font-medium">Processando...</p>
      </div>
    </PageWrapper>;
  }

  if (error) {
    return <PageWrapper>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-red-400 bg-red-500/10 p-4 rounded-xl">{error}</p>
      </div>
    </PageWrapper>;
  }

  if (showDuplicatePrompt) {
    return (
      <PageWrapper>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
           <div className="bg-surface border border-primary/20 p-8 rounded-3xl max-w-lg shadow-2xl space-y-6">
             <div className="w-16 h-16 bg-amber-500/20 text-amber-500 flex items-center justify-center rounded-full mx-auto shadow-sm">
               <CheckCircle className="w-8 h-8" />
             </div>
             <h1 className="text-2xl font-bold text-white leading-tight">Você já possui um cadastro no sistema</h1>
             <p className="text-gray-400 text-sm md:text-base leading-relaxed">
               Identificamos que você já preencheu este formulário anteriormente. Deseja falar diretamente com o seu personal pelo WhatsApp, ou prosseguir e atualizar seus dados para receber um novo treino?
             </p>
             
             <div className="space-y-3 pt-4">
               <button 
                 onClick={confirmUpdateAluno}
                 className="w-full bg-primary hover:bg-primary-hover text-black py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
               >
                 Avançar e Gerar Novo Treino
                 <ArrowRight className="w-5 h-5" />
               </button>
               
               <a 
                 href={branding?.whatsappContato ? `https://wa.me/${branding.whatsappContato.replace(/\D/g, '')}` : "#"} 
                 target={branding?.whatsappContato ? "_blank" : "_self"}
                 rel="noreferrer"
                 onClick={(e) => {
                   if (!branding?.whatsappContato) {
                     e.preventDefault();
                     alert("Por favor, acesse a conversa de WhatsApp de onde você recebeu o link do formulário.");
                   }
                 }}
                 className="w-full bg-gray-900 border border-border hover:bg-gray-800 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center transition-all"
               >
                 Falar com o Personal
               </a>
             </div>
           </div>
        </div>
      </PageWrapper>
    );
  }

  if (paymentStatus === 'approved' && matchedPlano) {
    return (
      <PageWrapper>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
           <div className="bg-surface p-10 rounded-3xl max-w-lg w-full border border-border shadow-2xl space-y-6">
             <div className="mx-auto w-16 h-16 bg-primary/20 flex items-center justify-center rounded-full text-primary mb-4">
               <CheckCircle className="w-8 h-8" />
             </div>
             <h1 className="text-3xl font-bold text-white">Pagamento Aprovado!</h1>
             <p className="text-gray-400">Seu plano <strong>{matchedPlano.nome}</strong> está liberado.</p>
             
             <a href={formatDriveUrl(matchedPlano.pdfUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full gap-3 py-4 bg-primary hover:bg-primary-hover text-black font-bold text-lg rounded-xl transition-all">
               <Download className="w-6 h-6" /> Baixar Meu Treino (PDF)
             </a>
           </div>
        </div>
      </PageWrapper>
    );
  }

  if (paymentStatus === 'rejected') {
    return (
      <PageWrapper>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
           <div className="bg-surface p-8 max-w-md w-full rounded-2xl border border-red-500/20 shadow-xl space-y-4">
             <p className="text-xl font-bold text-red-500">Pagamento não concluído</p>
             <p className="text-gray-400">Entre em contato com o Personal ou tente novamente.</p>
           </div>
        </div>
      </PageWrapper>
    );
  }

  if (noMatch) {
    return (
      <PageWrapper>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-surface border border-border p-10 rounded-3xl max-w-lg text-center space-y-4">
             <CheckCircle className="w-12 h-12 text-primary mx-auto" />
             <h1 className="text-2xl font-bold text-white">Questionário Recebido!</h1>
             <p className="text-gray-400 leading-relaxed text-lg">
               Suas informações foram recebidas! Seu personal analisará seu perfil e entrará em contato em breve com um plano personalizado ideal para você.
             </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (matchedPlano) {
    return (
      <PageWrapper>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-surface border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-green-300"></div>
            
            <div className="text-center mb-6">
              <span className="text-xs tracking-widest uppercase text-primary font-bold">Seu Plano Ideal Encontrado</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">{matchedPlano.nome}</h1>
            </div>

            <p className="text-gray-400 text-center mb-8 whitespace-pre-wrap">{matchedPlano.descricao}</p>

            <div className="bg-gray-900/50 p-5 rounded-2xl mb-8 border border-gray-800">
               <p className="text-sm text-gray-400 mb-2 font-medium">O que está incluído:</p>
               <ul className="space-y-2 text-sm text-white">
                 <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Treino customizado</li>
                 <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Metodologia comprovada</li>
                 <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> PDF Completo de exercícios</li>
               </ul>
            </div>

             {matchedPlano.gratuito ? (
               <a href={formatDriveUrl(matchedPlano.pdfUrl)} target="_blank" rel="noreferrer" className="w-full bg-primary hover:bg-primary-hover text-black font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all">
                  <Download className="w-5 h-5" /> Baixar Treino Grátis
               </a>
             ) : (
               <div className="space-y-4">
                  <button onClick={handleComprar} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all">
                    Comprar e Baixar — R$ {matchedPlano.preco?.toFixed(2)}
                  </button>
                  <p className="text-xs text-center text-gray-500 font-medium">Pagamento seguro Mercado Pago (PIX, Cartão)</p>
               </div>
             )}
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Typeform UI
  if (perguntas.length === 0) return <PageWrapper><div className="flex-1 flex justify-center p-8 text-center text-white items-center">Nenhuma pergunta encontrada.</div></PageWrapper>;

  const progress = ((currentStep) / perguntas.length) * 100;

  return (
    <PageWrapper showBack={currentStep > 0} onBack={handlePrev}>
      <div className="h-1 bg-gray-800 w-full z-20">
         <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">

         <form 
           onSubmit={(e) => {
             e.preventDefault();
             const isDisabled = currentQ.obrigatoria && (!respostas[currentQ.id] || (Array.isArray(respostas[currentQ.id]) && respostas[currentQ.id].length === 0));
             if (!isDisabled) {
               if (!isLast) handleNext();
               else handleFinish();
             }
           }}
           className="max-w-2xl w-full px-2 mt-12 md:mt-0"
         >
            <div className="text-primary font-bold text-sm tracking-widest mb-4 flex items-center gap-2">
              <span>{currentStep + 1}</span> <span className="text-gray-600">/</span> <span className="text-gray-600">{perguntas.length}</span>
            </div>
            
            <h2 className="text-2xl md:text-5xl font-bold mb-8 leading-tight">{currentQ.texto} {currentQ.obrigatoria && <span className="text-red-500 text-2xl">*</span>}</h2>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mb-8 md:mb-12">
               {currentQ.tipo === 'texto' && (() => {
                 const qText = currentQ.texto?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") || '';
                 let autoComplete = "on";
                 let inputType = "text";
                 let inputName = `q_${currentQ.id}`;

                 if (qText.includes('nome')) { autoComplete = "name"; inputName = "name"; }
                 else if (qText.includes('e-mail') || qText.includes('email')) { autoComplete = "email"; inputType = "email"; inputName = "email"; }
                 else if (qText.includes('wpp') || qText.includes('whatsapp') || qText.includes('telefone') || qText.includes('celular')) { autoComplete = "tel"; inputType = "tel"; inputName = "tel"; }
                 
                 return (
                   <input 
                     id={`input_${currentQ.id}`}
                     name={inputName}
                     autoFocus
                     type={inputType} 
                     autoComplete={autoComplete}
                     value={respostas[currentQ.id] || ''} 
                     onChange={e => setRespostas({ ...respostas, [currentQ.id]: e.target.value })}
                     placeholder="Digite sua resposta aqui..."
                     className="w-full bg-transparent border-b-2 border-gray-700 text-xl md:text-2xl py-3 md:py-4 focus:outline-none focus:border-primary placeholder-gray-600 transition-colors"
                   />
                 );
               })()}
               {currentQ.tipo === 'numero' && (() => {
                 const qText = currentQ.texto?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") || '';
                 let autoComplete = "on";
                 let inputType = "number";
                 let inputMode: 'numeric' | 'decimal' | 'tel' = "decimal";
                 let inputName = `q_${currentQ.id}`;

                 if (qText.includes('wpp') || qText.includes('whatsapp') || qText.includes('telefone') || qText.includes('celular')) { autoComplete = "tel"; inputType = "tel"; inputName = "tel"; inputMode = "tel"; }
                 
                 return (
                   <input 
                     id={`input_${currentQ.id}`}
                     name={inputName}
                     autoFocus
                     type={inputType}
                     inputMode={inputMode}
                     autoComplete={autoComplete}
                     value={respostas[currentQ.id] || ''} 
                     onChange={e => setRespostas({ ...respostas, [currentQ.id]: e.target.value })}
                     placeholder="Ex: 75"
                     className="w-full bg-transparent border-b-2 border-gray-700 text-2xl md:text-3xl py-3 md:py-4 focus:outline-none focus:border-primary placeholder-gray-600 transition-colors"
                   />
                 );
               })()}
               {currentQ.tipo === 'selecao_unica' && (
                 <div className="space-y-3">
                   {currentQ.opcoes?.map((opt, i) => (
                     <label key={i} className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${respostas[currentQ.id] === opt ? 'border-primary bg-primary/10' : 'border-gray-800 bg-surface hover:border-gray-600'}`}>
                       <input 
                         type="radio" 
                         name={`q_${currentQ.id}`} 
                         value={opt}
                         checked={respostas[currentQ.id] === opt}
                         onChange={() => {
                           setRespostas({ ...respostas, [currentQ.id]: opt });
                           setTimeout(() => {
                             if (!isLast) handleNext();
                             else handleFinish();
                           }, 450);
                         }}
                         className="w-5 h-5 text-primary bg-transparent border-gray-500 focus:ring-primary accent-primary flex-shrink-0"
                       />
                       <span className="text-lg md:text-xl font-medium">{opt}</span>
                     </label>
                   ))}
                 </div>
               )}
               {currentQ.tipo === 'selecao_multipla' && (
                 <div className="space-y-3">
                   {currentQ.opcoes?.map((opt, i) => {
                     const isChecked = (respostas[currentQ.id] as string[] || []).includes(opt);
                     return (
                       <label key={i} className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-primary bg-primary/10' : 'border-gray-800 bg-surface hover:border-gray-600'}`}>
                         <input 
                           type="checkbox" 
                           checked={isChecked}
                           onChange={(e) => {
                             const curr = (respostas[currentQ.id] as string[]) || [];
                             if (e.target.checked) setRespostas({ ...respostas, [currentQ.id]: [...curr, opt] });
                             else setRespostas({ ...respostas, [currentQ.id]: curr.filter(x => x !== opt) });
                           }}
                           className="w-5 h-5 rounded text-primary bg-transparent focus:ring-primary accent-primary flex-shrink-0"
                         />
                         <span className="text-lg md:text-xl font-medium">{opt}</span>
                       </label>
                     );
                   })}
                 </div>
               )}
            </div>

            <div className="pb-8 md:pb-0">
              {!isLast ? (
                <button 
                  type="submit"
                  disabled={currentQ.obrigatoria && (!respostas[currentQ.id] || (Array.isArray(respostas[currentQ.id]) && respostas[currentQ.id].length === 0))}
                  className="bg-primary hover:bg-primary-hover text-black px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed w-full md:w-auto justify-center md:justify-start"
                >
                  OK <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={loading || (currentQ.obrigatoria && (!respostas[currentQ.id] || (Array.isArray(respostas[currentQ.id]) && respostas[currentQ.id].length === 0)))}
                  className="bg-white hover:bg-gray-200 text-black px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed w-full md:w-auto justify-center md:justify-start"
                >
                  {loading ? 'Gerando...' : 'Gerar Meu Treino'} <CheckCircle className="w-5 h-5" />
                </button>
              )}
            </div>
         </form>
      </div>
    </PageWrapper>
  );
}
