import { useState, useEffect } from 'react';
import { getAccessToken, googleSignInWithScopes } from './firebase';

export function useGooglePicker(onPick: (url: string, name: string) => void) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    const loadGoogleApi = () => {
      if ((window as any).gapi) {
        setIsScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('picker', { callback: () => setIsScriptLoaded(true) });
      };
      document.body.appendChild(script);
    };
    loadGoogleApi();
  }, []);

  const openPicker = async () => {
    try {
      let token = getAccessToken();
      
      // If we don't have a token, we force a login with scopes
      if (!token) {
        const { accessToken } = await googleSignInWithScopes();
        token = accessToken;
      }

      if (!token) {
        throw new Error('Não foi possível obter a permissão do Google Drive.');
      }

      const googleWindow = (window as any).google;
      if (!isScriptLoaded || !googleWindow || !googleWindow.picker) {
        alert('A biblioteca do Google Drive ainda está carregando. Tente novamente em alguns segundos.');
        return;
      }

      const pickerOrigin =
        window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[
              window.location.ancestorOrigins.length - 1
            ]
          : window.location.origin;

      const picker = new googleWindow.picker.PickerBuilder()
        .addView(new googleWindow.picker.DocsView().setIncludeFolders(true).setMimeTypes('application/pdf'))
        .setOAuthToken(token)
        .setOrigin(pickerOrigin)
        .setTitle('Selecione um PDF de treino do seu Google Drive')
        .setCallback((data: any) => {
          if (data.action === googleWindow.picker.Action.PICKED) {
            const file = data.docs[0];
            onPick(file.url, file.name);
          }
        })
        .build();
        
      picker.setVisible(true);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao abrir o Google Drive: ' + err.message);
    }
  };

  return { openPicker, isScriptLoaded };
}
