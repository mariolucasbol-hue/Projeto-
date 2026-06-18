export type TipoPergunta = "texto" | "numero" | "selecao_unica" | "selecao_multipla";
export type Operador = "igual" | "diferente" | "maior" | "menor" | "entre" | "contem";

export interface Pergunta {
  id: string;
  texto: string;
  tipo: TipoPergunta;
  opcoes?: string[]; // for selecao
  obrigatoria: boolean;
  ordem: number;
  criadaEm: number;
}

export interface Regra {
  campo: string; // pergunta id or nome
  operador: Operador;
  valor: string;
  valorMin?: string;
  valorMax?: string;
}

export interface Plano {
  id: string;
  nome: string;
  descricao: string;
  pdfUrl: string;
  prioridade: number;
  regras: Regra[];
  preco: number;
  gratuito: boolean;
  criadoEm: number;
}

export interface RespostaAluno {
  [perguntaId: string]: any;
}

export interface Aluno {
  id: string;
  respostas: RespostaAluno;
  planoId: string;
  planoNome: string;
  nome: string;
  email: string;
  whatsapp: string;
  criadoEm: number;
}

export interface Pagamento {
  id: string;
  alunoId: string;
  alunoNome: string;
  alunoEmail: string;
  planoId: string;
  planoNome: string;
  valor: number;
  status: "aprovado" | "pendente" | "rejeitado" | "falhou";
  paymentIdMP?: string;
  externalReference: string;
  criadoEm: number;
  aprovadoEm?: number;
}

export interface ConfigMercadoPago {
  accessToken: string;
  urlBase: string;
  configuradoEm: number;
}

export interface ConfigBranding {
  logoUrl: string;
  corPrimaria: string;
  whatsappContato?: string;
  atualizadoEm: number;
}
