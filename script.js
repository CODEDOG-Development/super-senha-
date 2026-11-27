// =========================================================
// 1. DADOS DO JOGO
// =========================================================

// As 7 cores disponíveis. A posição na lista (0 a 6) é o "índice" da cor.
const CORES = [
  { nome: 'Vermelho', hex: '#d32f2f' },
  { nome: 'Azul', hex: '#1e88e5' },
  { nome: 'Amarelo', hex: '#fbc02d' },
  { nome: 'Verde', hex: '#43a047' },
  { nome: 'Rosa', hex: '#f48fb1' },
  { nome: 'Preto', hex: '#1a1a1a' },
  { nome: 'Marrom', hex: '#6d4c41' },
];

const TAMANHO_SENHA = 5; // quantas cores vão para a senha secreta

// Chaves usadas para lembrar tema e configuração no navegador
const CHAVE_TEMA = 'superSenha.tema';
const CHAVE_CONFIG = 'superSenha.config';

// =========================================================
// 2. ESTADO DA RODADA
// Tudo o que muda durante o jogo fica guardado neste objeto.
// =========================================================
const estado = {
  senha: [],          // índices das 5 cores sorteadas, em ordem
  palpite: [],        // índices que estão sendo digitados agora
  tentativa: 0,       // quantas tentativas já foram conferidas
  maxTentativas: 10,
  emJogo: false,      // true só enquanto a equipe pode palpitar
  cronometro: null,   // guarda o setInterval da contagem regressiva
};

// =========================================================
// 3. ELEMENTOS DA PÁGINA
// Buscamos cada elemento uma vez e guardamos numa constante.
// =========================================================
const $ = (id) => document.getElementById(id);

const btnTema = $('btn-tema');

const telaConfig = $('tela-config');
const inputTempo = $('input-tempo');
const inputTentativas = $('input-tentativas');
const btnIniciar = $('btn-iniciar');

const telaMemorizar = $('tela-memorizar');
const senhaExibida = $('senha-exibida');
const barraProgresso = $('barra-progresso');
const contador = $('contador');
const btnPular = $('btn-pular');

const telaResultado = $('tela-resultado');
const tituloResultado = $('titulo-resultado');
const textoResultado = $('texto-resultado');
const senhaRevelada = $('senha-revelada');
const btnNova = $('btn-nova');

const telaJogo = $('tela-jogo');
const areaPalpite = $('area-palpite');
const numTentativa = $('num-tentativa');
const totalTentativas = $('total-tentativas');
const palpiteAtual = $('palpite-atual');
const paleta = $('paleta');
const btnApagar = $('btn-apagar');
const btnLimpar = $('btn-limpar');
const btnConferir = $('btn-conferir');
const btnRevelar = $('btn-revelar');
const historico = $('historico');

// =========================================================
// 4. FUNÇÕES DE APOIO
// =========================================================

function mostrar(elemento) {
  elemento.classList.remove('oculto');
}

function esconder(elemento) {
  elemento.classList.add('oculto');
}

// Cria uma bolinha. Sem índice = espaço vazio (tracejado).
function criarPino(indice, pequeno = false) {
  const pino = document.createElement('span');
  pino.className = pequeno ? 'pino pequeno' : 'pino';
  pino.setAttribute('role', 'img'); // leitores de tela tratam a bolinha como imagem

  if (indice === undefined) {
    pino.classList.add('vazio');
    pino.setAttribute('aria-label', 'Vazio');
  } else {
    pino.style.background = CORES[indice].hex;
    pino.title = CORES[indice].nome;        // nome aparece ao passar o mouse
    pino.setAttribute('aria-label', CORES[indice].nome);
  }
  return pino;
}

// Desenha sempre 5 espaços: os preenchidos com cor e o resto vazio.
function desenharLinha(container, lista, pequeno = false) {
  container.innerHTML = '';
  for (let i = 0; i < TAMANHO_SENHA; i++) {
    container.appendChild(criarPino(lista[i], pequeno));
  }
}

// Lê um número do campo e garante que fique entre min e max.
function lerNumero(input, min, max, padrao) {
  const valor = parseInt(input.value, 10);
  if (Number.isNaN(valor)) return padrao;
  return Math.min(max, Math.max(min, valor));
}

// Sorteia 5 cores DIFERENTES entre as 7 (embaralhamento de Fisher-Yates).
function sortearSenha() {
  const indices = CORES.map((_, i) => i); // [0, 1, 2, 3, 4, 5, 6]
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]; // troca as duas posições
  }
  return indices.slice(0, TAMANHO_SENHA); // pega as 5 primeiras
}

// Compara palpite e senha.
// Preto = cor certa na posição certa. Branco = cor existe, mas em outra posição.
// Como nem a senha nem o palpite repetem cores, a conta fica simples.
function avaliar(palpite, senha) {
  let pretos = 0;
  let brancos = 0;
  palpite.forEach((cor, posicao) => {
    if (cor === senha[posicao]) {
      pretos++;
    } else if (senha.includes(cor)) {
      brancos++;
    }
  });
  return { pretos, brancos };
}

// =========================================================
// 5. TEMA CLARO / ESCURO E PREFERÊNCIAS
// =========================================================

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema; // muda o data-tema do <html>
  btnTema.textContent = tema === 'escuro' ? '☀️ Claro' : '🌙 Escuro';
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (erro) {
    // Navegador sem armazenamento: o tema funciona, só não fica salvo.
  }
}

function alternarTema() {
  const atual = document.documentElement.dataset.tema;
  aplicarTema(atual === 'escuro' ? 'claro' : 'escuro');
}

function salvarConfig(tempo, tentativas) {
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify({ tempo, tentativas }));
  } catch (erro) {
    // Sem armazenamento: segue sem salvar.
  }
}

function carregarPreferencias() {
  let tema = null;
  try {
    tema = localStorage.getItem(CHAVE_TEMA);
    const config = JSON.parse(localStorage.getItem(CHAVE_CONFIG));
    if (config) {
      inputTempo.value = config.tempo;
      inputTentativas.value = config.tentativas;
    }
  } catch (erro) {
    // Dado salvo inválido ou sem armazenamento: usa os valores padrão do HTML.
  }

  // Sem tema salvo, segue o tema do sistema operacional
  if (!tema) {
    tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }
  aplicarTema(tema);
}

// =========================================================
// 6. FLUXO DA RODADA
// configuração → memorização → palpites → resultado
// =========================================================

function iniciarRodada() {
  const segundos = lerNumero(inputTempo, 3, 120, 15);
  estado.maxTentativas = lerNumero(inputTentativas, 1, 20, 10);

  // Devolve o valor corrigido para o campo e salva para a próxima vez
  inputTempo.value = segundos;
  inputTentativas.value = estado.maxTentativas;
  salvarConfig(segundos, estado.maxTentativas);

  // Zera a rodada
  estado.senha = sortearSenha();
  estado.palpite = [];
  estado.tentativa = 0;
  historico.innerHTML = '';

  esconder(telaConfig);
  esconder(telaResultado);
  esconder(telaJogo);
  mostrar(telaMemorizar);

  desenharLinha(senhaExibida, estado.senha);
  iniciarContagem(segundos);
}

function iniciarContagem(segundos) {
  const duracao = segundos * 1000;
  const fim = Date.now() + duracao; // horário exato em que a senha some

  contador.textContent = segundos;
  barraProgresso.style.width = '100%';
  clearInterval(estado.cronometro);

  // A cada 100 ms calcula quanto falta. Usar o relógio (Date.now)
  // evita que o tempo "atrase" se o navegador ficar lento.
  estado.cronometro = setInterval(() => {
    const restante = Math.max(0, fim - Date.now());
    contador.textContent = Math.ceil(restante / 1000);
    barraProgresso.style.width = (restante / duracao) * 100 + '%';

    if (restante === 0) {
      iniciarJogo();
    }
  }, 100);
}

function iniciarJogo() {
  clearInterval(estado.cronometro);
  senhaExibida.innerHTML = ''; // tira a senha da página para ninguém espiar

  esconder(telaMemorizar);
  mostrar(telaJogo);
  mostrar(areaPalpite);

  estado.emJogo = true;
  totalTentativas.textContent = estado.maxTentativas;
  atualizarPalpite();
}

// Redesenha o palpite atual e liga/desliga os botões conforme a situação.
function atualizarPalpite() {
  desenharLinha(palpiteAtual, estado.palpite);
  numTentativa.textContent = estado.tentativa + 1;

  const vazio = estado.palpite.length === 0;
  const completo = estado.palpite.length === TAMANHO_SENHA;

  btnConferir.disabled = !completo;
  btnApagar.disabled = vazio;
  btnLimpar.disabled = vazio;

  // Cor já usada no palpite fica desabilitada (a senha não repete cores)
  paleta.querySelectorAll('.btn-cor').forEach((botao) => {
    const indice = Number(botao.dataset.indice);
    botao.disabled = completo || estado.palpite.includes(indice);
  });
}

// Cria os 7 botões da paleta a partir da lista CORES.
function criarPaleta() {
  CORES.forEach((cor, indice) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-cor';
    botao.dataset.indice = indice;
    botao.setAttribute('aria-label', `Adicionar ${cor.nome}`);
    botao.innerHTML = `
      <span class="amostra" style="background:${cor.hex}"></span>
      <span>${indice + 1} · ${cor.nome}</span>
    `;
    botao.addEventListener('click', () => adicionarCor(indice));
    paleta.appendChild(botao);
  });
}

function adicionarCor(indice) {
  if (!estado.emJogo) return;
  if (estado.palpite.length >= TAMANHO_SENHA) return;
  if (estado.palpite.includes(indice)) return;

  estado.palpite.push(indice);
  atualizarPalpite();
}

function apagarCor() {
  if (!estado.emJogo) return;
  estado.palpite.pop(); // remove a última cor digitada
  atualizarPalpite();
}

function limparPalpite() {
  if (!estado.emJogo) return;
  estado.palpite = [];
  atualizarPalpite();
}

function conferir() {
  if (!estado.emJogo || estado.palpite.length < TAMANHO_SENHA) return;

  const { pretos, brancos } = avaliar(estado.palpite, estado.senha);
  estado.tentativa++;
  adicionarAoHistorico(estado.palpite, pretos, brancos);

  if (pretos === TAMANHO_SENHA) {
    encerrar(true);
    return;
  }
  if (estado.tentativa >= estado.maxTentativas) {
    encerrar(false);
    return;
  }

  estado.palpite = [];
  atualizarPalpite();
}

// Monta uma linha do histórico: número, 5 cores e os pinos de resposta.
function adicionarAoHistorico(palpite, pretos, brancos) {
  const item = document.createElement('li');
  item.className = 'linha-historico';

  const numero = document.createElement('span');
  numero.className = 'num';
  numero.textContent = estado.tentativa;

  const pinos = document.createElement('div');
  pinos.className = 'linha-pinos';
  desenharLinha(pinos, palpite, true);

  // Pretos primeiro, depois brancos: assim não revela QUAL posição acertou
  const resposta = document.createElement('div');
  resposta.className = 'resposta';
  resposta.setAttribute('role', 'img');
  resposta.setAttribute('aria-label', `${pretos} preto(s) e ${brancos} branco(s)`);

  for (let i = 0; i < TAMANHO_SENHA; i++) {
    const furo = document.createElement('span');
    furo.className = 'pino-resposta';
    if (i < pretos) {
      furo.classList.add('preto');
    } else if (i < pretos + brancos) {
      furo.classList.add('branco');
    }
    resposta.appendChild(furo);
  }

  item.append(numero, pinos, resposta);
  historico.prepend(item); // a tentativa mais recente fica no topo
}

function encerrar(venceu) {
  estado.emJogo = false;
  esconder(areaPalpite);
  mostrar(telaResultado);
  desenharLinha(senhaRevelada, estado.senha);

  if (venceu) {
    tituloResultado.textContent = '🎉 Senha descoberta!';
    textoResultado.textContent =
      `A equipe acertou em ${estado.tentativa} de ${estado.maxTentativas} tentativa(s).`;
  } else {
    tituloResultado.textContent = 'Rodada encerrada';
    textoResultado.textContent = 'Desta vez a senha não foi descoberta. Ela era:';
  }

  telaResultado.scrollIntoView({ behavior: 'smooth' });
}

function revelarSenha() {
  if (confirm('Encerrar a rodada e revelar a senha?')) {
    encerrar(false);
  }
}

function novaRodada() {
  estado.emJogo = false;
  esconder(telaResultado);
  esconder(telaJogo);
  mostrar(telaConfig);
}

// =========================================================
// 7. TECLADO: 1 a 7 escolhem a cor, Backspace apaga, Enter confere
// =========================================================
document.addEventListener('keydown', (evento) => {
  if (!estado.emJogo) return;

  const numero = Number(evento.key);
  if (Number.isInteger(numero) && numero >= 1 && numero <= CORES.length) {
    adicionarCor(numero - 1); // tecla 1 = índice 0 (Vermelho)
  } else if (evento.key === 'Backspace') {
    evento.preventDefault();
    apagarCor();
  } else if (evento.key === 'Enter') {
    evento.preventDefault(); // evita "clicar" duas vezes num botão em foco
    conferir();
  }
});

// =========================================================
// 8. INICIALIZAÇÃO: liga os botões às funções
// =========================================================
criarPaleta();
carregarPreferencias();

btnTema.addEventListener('click', alternarTema);
btnIniciar.addEventListener('click', iniciarRodada);
btnPular.addEventListener('click', iniciarJogo);
btnApagar.addEventListener('click', apagarCor);
btnLimpar.addEventListener('click', limparPalpite);
btnConferir.addEventListener('click', conferir);
btnRevelar.addEventListener('click', revelarSenha);
btnNova.addEventListener('click', novaRodada);
