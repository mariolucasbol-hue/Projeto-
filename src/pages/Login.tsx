import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, googleSignInWithScopes } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUP, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUP) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'personais', userCred.user.uid), {
          nome: email.split('@')[0],
          email: email,
          criadoEm: Date.now()
        });
        
        // Add default questions
        const defaultQuestions = [
          { texto: "Nome completo", tipo: "texto", obrigatoria: true, ordem: 1 },
          { texto: "E-mail", tipo: "texto", obrigatoria: true, ordem: 2 },
          { texto: "WhatsApp", tipo: "texto", obrigatoria: true, ordem: 3 },
          { texto: "Peso em kg", tipo: "numero", obrigatoria: true, ordem: 4 },
          { texto: "Altura em cm", tipo: "numero", obrigatoria: true, ordem: 5 },
          { texto: "Objetivo", tipo: "selecao_unica", opcoes: ["Emagrecer", "Ganhar massa", "Condicionamento", "Saúde geral"], obrigatoria: true, ordem: 6 },
          { texto: "Nível de experiência", tipo: "selecao_unica", opcoes: ["Iniciante", "Intermediário", "Avançado"], obrigatoria: true, ordem: 7 },
          { texto: "Quantos dias por semana pode treinar", tipo: "selecao_unica", opcoes: ["2", "3", "4", "5"], obrigatoria: true, ordem: 8 },
          { texto: "Possui alguma lesão ou restrição médica?", tipo: "selecao_unica", opcoes: ["Sim", "Não"], obrigatoria: true, ordem: 9 },
          { texto: "Onde vai treinar?", tipo: "selecao_unica", opcoes: ["Academia", "Em casa com equipamentos", "Em casa sem equipamentos"], obrigatoria: true, ordem: 10 }
        ];

        for (const [index, q] of defaultQuestions.entries()) {
          const qRef = doc(db, 'personais', userCred.user.uid, 'perguntas', `default_${index + 1}`);
          await setDoc(qRef, { ...q, criadaEm: Date.now() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Senha incorreta ou e-mail não encontrado');
      } else if (err.code === 'unavailable') {
        setError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await googleSignInWithScopes();
      const userCred = { user: result.user };
      
      const userRef = doc(db, 'personais', userCred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          nome: userCred.user.displayName || userCred.user.email?.split('@')[0] || 'Personal',
          email: userCred.user.email,
          criadoEm: Date.now()
        });
        
        // Add default questions
        const defaultQuestions = [
          { texto: "Nome completo", tipo: "texto", obrigatoria: true, ordem: 1 },
          { texto: "E-mail", tipo: "texto", obrigatoria: true, ordem: 2 },
          { texto: "WhatsApp", tipo: "texto", obrigatoria: true, ordem: 3 },
          { texto: "Peso em kg", tipo: "numero", obrigatoria: true, ordem: 4 },
          { texto: "Altura em cm", tipo: "numero", obrigatoria: true, ordem: 5 },
          { texto: "Objetivo", tipo: "selecao_unica", opcoes: ["Emagrecer", "Ganhar massa", "Condicionamento", "Saúde geral"], obrigatoria: true, ordem: 6 },
          { texto: "Nível de experiência", tipo: "selecao_unica", opcoes: ["Iniciante", "Intermediário", "Avançado"], obrigatoria: true, ordem: 7 },
          { texto: "Quantos dias por semana pode treinar", tipo: "selecao_unica", opcoes: ["2", "3", "4", "5"], obrigatoria: true, ordem: 8 },
          { texto: "Possui alguma lesão ou restrição médica?", tipo: "selecao_unica", opcoes: ["Sim", "Não"], obrigatoria: true, ordem: 9 },
          { texto: "Onde vai treinar?", tipo: "selecao_unica", opcoes: ["Academia", "Em casa com equipamentos", "Em casa sem equipamentos"], obrigatoria: true, ordem: 10 }
        ];

        for (const [index, q] of defaultQuestions.entries()) {
          const qRef = doc(db, 'personais', userCred.user.uid, 'perguntas', `default_${index + 1}`);
          await setDoc(qRef, { ...q, criadaEm: Date.now() });
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'unavailable') {
        setError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">FitPlan</h1>
          <p className="text-gray-400">Plataforma para Personal Trainers</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm space-y-3">
            <p className="font-medium text-red-400">{error}</p>
            {(error.includes('bloqueou') || error.includes('popup') || error.includes('cancelado')) && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-xs text-center shadow-md cursor-pointer"
              >
                Abrir o App em Nova Aba ↗
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : isSignUP ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center space-x-2">
          <span className="h-px w-full bg-border"></span>
          <span className="text-sm font-medium text-gray-500">OU</span>
          <span className="h-px w-full bg-border"></span>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
          </svg>
          Continuar com Google
        </button>

        {(() => {
          try {
            if (window.self !== window.top) {
              return (
                <p className="mt-3 text-center text-xs text-amber-500/90 leading-normal">
                  💡 O Google Login requer abertura de pop-up. Caso seja bloqueado pelo navegador dentro do iframe,{' '}
                  <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-400">
                    abra o app numa nova aba ↗
                  </a>.
                </p>
              );
            }
          } catch (e) {
            return (
              <p className="mt-3 text-center text-xs text-amber-500/90 leading-normal">
                💡 O Google Login requer abertura de pop-up. Caso seja bloqueado pelo navegador dentro do iframe,{' '}
                <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-400">
                  abra o app numa nova aba ↗
                </a>.
              </p>
            );
          }
          return null;
        })()}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUP)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isSignUP ? 'Já tem conta? Entrar' : 'Não tem conta? Criar nova conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
