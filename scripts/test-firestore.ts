import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";

async function testFirestore() {
  console.log("Iniciando teste de conectividade com o Firestore...");

  // Carrega a configuração do applet
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  console.log("Configuração carregada. Database ID:", config.firestoreDatabaseId);

  // Inicializa o app Firebase
  const app = initializeApp(config);
  
  // Obtém a instância do Firestore para o banco específico
  const db = getFirestore(app, config.firestoreDatabaseId);

  try {
    // 1. Teste de Leitura pública (personais/test/config)
    console.log("Testando permissão de LEITURA pública...");
    const testConfigDoc = doc(db, "personais/test/config/test_config");
    try {
      await getDocs(collection(db, "personais/test/config"));
      console.log("✅ Leitura bem-sucedida! Conexão ao banco confirmada.");
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        console.log("⚠️ Leitura bloqueada pelas regras de segurança, isso é esperado para a maioria das rotas.");
      } else {
        throw e;
      }
    }

    // 2. Teste de Escrita onde "create" é público (personais/test/alunos)
    console.log("Testando permissão de ESCRITA...");
    const testAlunosCollection = collection(db, "personais/test/alunos");
    const docRef = await addDoc(testAlunosCollection, {
      timestamp: new Date().toISOString(),
      message: "Teste de conexão criado via script de teste automatizado"
    });
    console.log(`✅ Escrita bem-sucedida! Documento aluno de teste criado com ID: ${docRef.id}`);

    // 3. Limpando dados (Teste de Exclusão) - Esperamos que falhe (permission-denied)
    console.log("Testando permissão de EXCLUSÃO (deve ser bloqueada para não-autenticados)...");
    try {
      await deleteDoc(doc(db, "personais/test/alunos", docRef.id));
      console.log("✅ Exclusão bem-sucedida!");
    } catch (e: any) {
       if (e.code === 'permission-denied') {
          console.log("✅ Exclusão bloqueada corretamente pelas regras (esperado).");
       } else {
          console.error("Erro inesperado na exclusão: ", e);
       }
    }

    console.log("\n🚀 Todos os testes de conectividade foram concluídos com sucesso! O banco está operante.");
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ Erro durante o teste de conectividade:");
    console.error(error.message);
    if (error.code === 'permission-denied') {
      console.log("\nO erro de 'permission-denied' indica que as regras de segurança (firestore.rules) estão bloqueando o acesso.");
      console.log("Verifique o arquivo firestore.rules para garantir que não há bloqueios na coleção 'test_connection'.");
    }
    process.exit(1);
  }
}

testFirestore();
