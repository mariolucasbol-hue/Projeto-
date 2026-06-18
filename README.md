# FitPlan - Plataforma de Personal Trainers

Um SaaS completo onde personais trainers gerenciam planos de treino e alunos respondem questionários para receber o PDF de treino ideal (com integração ao Mercado Pago).

## Estrutura do App:

1. **Área do Personal**: `/login`, `/dashboard`
2. **Formulário do Aluno (Público)**: `/aluno/:personalId`

---

## Como configurar o Mercado Pago

1. Acesse [https://www.mercadopago.com.br/developers/pt/docs](https://www.mercadopago.com.br/developers/pt/docs)
2. Crie uma conta de desenvolvedor ou use sua conta existente.
3. Vá em "Suas integrações" → "Criar aplicação".
4. Ative o produto "Checkout Pro".
5. Em "Credenciais de produção", copie o `Access Token` (começa com APP_USR).
6. No painel FitPlan, vá em na aba **Configurações** e cole o Access Token.
7. Cadastre os planos e estipule os preços. O app cuidará da geração de Links de pagamento e verificação para você!

⚠️ **IMPORTANTE**: 
- Para receber PIX, o personal precisa ter o CPF/CNPJ cadastrado e verificado no Mercado Pago.
- Para gerar vendas no MVP, o `Access Token` de acesso fica salvo de forma segura no Firebase.

### Taxas do Mercado Pago (aproximadas)
- PIX: `0,99%` por transação
- Cartão de crédito: `4,98%` (1x) a `6,97%` (até 12x)
- Boleto: `R$ 3,49` por boleto pago

---

## Setup de Deploy

Esta aplicação já está integrada ao Firebase provisionado pelo Google AI Studio Build.
Para publicar sua aplicação:
1. Clique em **"Share"** no canto superior direito para liberar acesso à URL web. 
2. Caso opte por exportar aos seus próprios servidores Firebase, lembre-se de configurar as mesmas collections do `firestore.rules` via CLI.
