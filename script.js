// =========================================================
// 1. DADOS DO JOGO
// =========================================================

// As 7 cores disponíveis. A posição na lista (0 a 6) é o "índice" da cor.
const CORES = [
  { nome: 'Vermelho', hex: '#ff0000' },
  { nome: 'Azul', hex: '#0050ff' },
  { nome: 'Amarelo', hex: '#ffc000' },
  { nome: 'Verde', hex: '#33cc33' },
  { nome: 'Rosa', hex: '#ff00ff' },
  { nome: 'Preto', hex: '#000000' },
  { nome: 'Marrom', hex: '#8b4513' },
];

// Cada nível é só um "pacote" de configurações prontas.
// tempo          = segundos que a senha fica na tela
// tentativas     = quantos palpites a equipe tem
// tamanho        = quantas cores tem a senha
// tempoTentativa = segundos para cada palpite (0 = sem limite)
// repetidas      = a senha pode repetir cores?
// sequencia      = mostrar uma cor por vez em vez de todas juntas?
const NIVEIS = {
  facil: { tempo: 15, tentativas: 10, tamanho: 5, tempoTentativa: 0, repetidas: false, sequencia: false },
  medio: { tempo: 10, tentativas: 8, tamanho: 5, tempoTentativa: 0, repetidas: true, sequencia: false },
  dificil: { tempo: 6, tentativas: 6, tamanho: 6, tempoTentativa: 60, repetidas: true, sequencia: true },
};

// Chaves usadas para lembrar tema e configuração no navegador
const CHAVE_TEMA = 'superSenha.tema';
const CHAVE_CONFIG = 'superSenha.config.v2';

// =========================================================
// 2. ESTADO DA RODADA
// Tudo o que muda durante o jogo fica guardado neste objeto.
// =========================================================
const estado = {
  config: { ...NIVEIS.facil }, // cópia das regras da rodada atual
  senha: [],                   // índices das cores sorteadas, em ordem
  palpite: [],                 // índices que estão sendo digitados agora
  tentativa: 0,                // quantas tentativas já foram usadas
  emJogo: false,               // true só enquanto a equipe pode palpitar
  cronometro: null,            // contagem da tela de memorização
  cronometroTentativa: null,   // relógio de cada tentativa
};

// =========================================================
// 3. ELEMENTOS DA PÁGINA
// =========================================================
const $ = (id) => document.getElementById(id);

const btnTema = $('btn-tema');

const telaConfig = $('tela-config');
const selectNivel = $('select-nivel');
const inputTempo = $('input-tempo');
const inputTentativas = $('input-tentativas');
const selectTamanho = $('select-tamanho');
const inputTempoTentativa = $('input-tempo-tentativa');
const checkRepetidas = $('check-repetidas');
const checkSequencia = $('check-sequencia');
const textoRegra = $('texto-regra');
const btnIniciar = $('btn-iniciar');

const telaMemorizar = $('tela-memorizar');
const tituloMemorizar = $('titulo-memorizar');
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
const relogioTentativa = $('relogio-tentativa');
const tempoTentativa = $('tempo-tentativa');
const palpiteAtual = $('palpite-atual');
const paleta = $('paleta');
const btnApagar = $('btn-apagar');
const btnLimpar = $('btn-limpar');
const btnConferir = $('btn-conferir');
const infoRegras = $('info-regras');
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
  pino.setAttribute('role', 'img');

  if (indice === undefined) {
    pino.classList.add('vazio');
    pino.setAttribute('aria-label', 'Vazio');
  } else {
    pino.style.background = CORES[indice].hex;
    pino.title = CORES[indice].nome;
    pino.setAttribute('aria-label', CORES[indice].nome);
  }
  return pino;
}

// Desenha a quantidade de espaços da senha (5 ou 6):
// os preenchidos com cor e o resto vazio.
function desenharLinha(container, lista, pequeno = false) {
  container.innerHTML = '';
  for (let i = 0; i < estado.config.tamanho; i++) {
    container.appendChild(criarPino(lista[i], pequeno));
  }
}

// Lê um número do campo e garante que fique entre min e max.
function lerNumero(input, min, max, padrao) {
  const valor = parseInt(input.value, 10);
  if (Number.isNaN(valor)) return padrao;
  return Math.min(max, Math.max(min, valor));
}

// Sorteia a senha.
// Com repetição: cada posição sorteia qualquer uma das 7 cores.
// Sem repetição: embaralha as 7 (Fisher-Yates) e pega as primeiras.
function sortearSenha(tamanho, repetidas) {
  if (repetidas) {
    return Array.from({ length: tamanho }, () => Math.floor(Math.random() * CORES.length));
  }

  const indices = CORES.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, tamanho);
}

// Compara palpite e senha. Funciona com ou sem cores repetidas.
// 1º passo: conta os pretos (cor e posição certas) e separa o que sobrou.
// 2º passo: nas sobras, cada cor do palpite que ainda existe na senha vira
//           um branco, e essa cor é "riscada" para não ser contada duas vezes.
function avaliar(palpite, senha) {
  let pretos = 0;
  const sobraSenha = [];
  const sobraPalpite = [];

  palpite.forEach((cor, posicao) => {
    if (cor === senha[posicao]) {
      pretos++;
    } else {
      sobraSenha.push(senha[posicao]);
      sobraPalpite.push(cor);
    }
  });

  let brancos = 0;
  sobraPalpite.forEach((cor) => {
    const achou = sobraSenha.indexOf(cor);
    if (achou !== -1) {
      brancos++;
      sobraSenha.splice(achou, 1); // risca a cor usada
    }
  });

  return { pretos, brancos };
}

// =========================================================
// 5. CONFIGURAÇÃO, NÍVEIS E PREFERÊNCIAS
// =========================================================

// Coloca os valores de uma configuração nos campos da tela.
function preencherCampos(config) {
  inputTempo.value = config.tempo;
  inputTentativas.value = config.tentativas;
  selectTamanho.value = config.tamanho;
  inputTempoTentativa.value = config.tempoTentativa;
  checkRepetidas.checked = config.repetidas;
  checkSequencia.checked = config.sequencia;
}

// Lê os campos da tela e devolve uma configuração já validada.
function lerCampos() {
  return {
    tempo: lerNumero(inputTempo, 3, 120, 15),
    tentativas: lerNumero(inputTentativas, 1, 20, 10),
    tamanho: Number(selectTamanho.value),
    tempoTentativa: lerNumero(inputTempoTentativa, 0, 300, 0),
    repetidas: checkRepetidas.checked,
    sequencia: checkSequencia.checked,
  };
}

// Escreve um resumo das regras embaixo dos campos.
function atualizarRegra() {
  const config = lerCampos();
  let texto = `Serão sorteadas ${config.tamanho} cores entre as 7`;
  texto += config.repetidas ? ', podendo repetir' : ', todas diferentes';
  if (config.sequencia) texto += ', mostradas uma por vez';
  if (config.tempoTentativa > 0) texto += `. Cada tentativa tem ${config.tempoTentativa} s`;
  textoRegra.textContent = texto + '.';
}

// Ao escolher Fácil/Médio/Difícil, os campos recebem os valores do nível.
function escolherNivel() {
  const nivel = NIVEIS[selectNivel.value];
  if (nivel) preencherCampos(nivel); // "personalizado" não existe em NIVEIS
  atualizarRegra();
}

// Se o facilitador mexer em qualquer campo, vira "Personalizado".
function marcarPersonalizado() {
  selectNivel.value = 'personalizado';
  atualizarRegra();
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
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

function salvarConfig(nivel, config) {
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify({ nivel, config }));
  } catch (erro) {
    // Sem armazenamento: segue sem salvar.
  }
}

function carregarPreferencias() {
  let tema = null;
  let salvo = null;
  try {
    tema = localStorage.getItem(CHAVE_TEMA);
    salvo = JSON.parse(localStorage.getItem(CHAVE_CONFIG));
  } catch (erro) {
    // Dado salvo inválido ou sem armazenamento: usa os padrões.
  }

  if (salvo && salvo.config) {
    selectNivel.value = salvo.nivel;
    // Junta com o Fácil para garantir que nenhum campo fique sem valor
    preencherCampos({ ...NIVEIS.facil, ...salvo.config });
  } else {
    selectNivel.value = 'facil';
    preencherCampos(NIVEIS.facil);
  }
  atualizarRegra();

  // Sem tema salvo, segue o tema do sistema operacional
  if (!tema) {
    tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }
  aplicarTema(tema);
}

// =========================================================
// 6. MEMORIZAÇÃO
// =========================================================

function iniciarRodada() {
  // Guarda as regras desta rodada e devolve os valores corrigidos aos campos
  estado.config = lerCampos();
  preencherCampos(estado.config);
  salvarConfig(selectNivel.value, estado.config);

  // Zera a rodada
  estado.senha = sortearSenha(estado.config.tamanho, estado.config.repetidas);
  estado.palpite = [];
  estado.tentativa = 0;
  historico.innerHTML = '';

  esconder(telaConfig);
  esconder(telaResultado);
  esconder(telaJogo);
  mostrar(telaMemorizar);

  tituloMemorizar.textContent = estado.config.sequencia ? 'Memorize a sequência!' : 'Memorize a senha!';
  iniciarContagem();
}

function iniciarContagem() {
  const { tempo, tamanho, sequencia } = estado.config;
  const duracao = tempo * 1000;
  const inicio = Date.now();
  const porCor = duracao / tamanho; // no modo sequência, o tempo é dividido entre as cores
  let ultimoQuadro = '';            // evita redesenhar se nada mudou

  // No modo normal, todas as cores aparecem de uma vez
  if (!sequencia) desenharLinha(senhaExibida, estado.senha);

  const passo = () => {
    const decorrido = Math.min(duracao, Date.now() - inicio);
    const restante = duracao - decorrido;
    contador.textContent = Math.ceil(restante / 1000);
    barraProgresso.style.width = (restante / duracao) * 100 + '%';

    if (sequencia) {
      // Qual cor é a da vez e se ela está acesa.
      // Cada cor fica acesa em 75% do seu tempo e apagada no resto:
      // essa pausa mostra quando a mesma cor aparece duas vezes seguidas.
      const atual = Math.floor(decorrido / porCor);
      const acesa = decorrido % porCor < porCor * 0.75;
      const quadro = `${atual}-${acesa}`;

      if (quadro !== ultimoQuadro) {
        ultimoQuadro = quadro;
        const visivel = [];
        if (acesa && atual < tamanho) visivel[atual] = estado.senha[atual];
        desenharLinha(senhaExibida, visivel); // acende só a posição da vez
      }
    }

    if (restante === 0) iniciarJogo();
  };

  clearInterval(estado.cronometro);
  passo();
  estado.cronometro = setInterval(passo, 50);
}

// =========================================================
// 7. PALPITES
// =========================================================

function iniciarJogo() {
  clearInterval(estado.cronometro);
  senhaExibida.innerHTML = ''; // tira a senha da página para ninguém espiar

  esconder(telaMemorizar);
  mostrar(telaJogo);
  mostrar(areaPalpite);

  estado.emJogo = true;
  totalTentativas.textContent = estado.config.tentativas;
  infoRegras.textContent = estado.config.repetidas
    ? 'Atenção: nesta rodada as cores podem se repetir.'
    : 'A senha não repete cores.';

  atualizarPalpite();
  iniciarRelogioTentativa();
}

// Redesenha o palpite atual e liga/desliga os botões conforme a situação.
function atualizarPalpite() {
  desenharLinha(palpiteAtual, estado.palpite);
  numTentativa.textContent = estado.tentativa + 1;

  const vazio = estado.palpite.length === 0;
  const completo = estado.palpite.length === estado.config.tamanho;

  btnConferir.disabled = !completo;
  btnApagar.disabled = vazio;
  btnLimpar.disabled = vazio;

  // Sem repetição, a cor já usada fica bloqueada. Com repetição, todas ficam livres.
  paleta.querySelectorAll('.btn-cor').forEach((botao) => {
    const indice = Number(botao.dataset.indice);
    const jaUsada = !estado.config.repetidas && estado.palpite.includes(indice);
    botao.disabled = completo || jaUsada;
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
  if (estado.palpite.length >= estado.config.tamanho) return;
  if (!estado.config.repetidas && estado.palpite.includes(indice)) return;

  estado.palpite.push(indice);
  atualizarPalpite();
}

function apagarCor() {
  if (!estado.emJogo) return;
  estado.palpite.pop();
  atualizarPalpite();
}

function limparPalpite() {
  if (!estado.emJogo) return;
  estado.palpite = [];
  atualizarPalpite();
}

function conferir() {
  if (!estado.emJogo || estado.palpite.length < estado.config.tamanho) return;

  pararRelogioTentativa();
  const resultado = avaliar(estado.palpite, estado.senha);
  estado.tentativa++;
  adicionarAoHistorico(estado.palpite, resultado);

  if (resultado.pretos === estado.config.tamanho) {
    encerrar(true);
    return;
  }
  proximaTentativa();
}

// Passa para o próximo palpite ou encerra se as tentativas acabaram.
function proximaTentativa() {
  if (estado.tentativa >= estado.config.tentativas) {
    encerrar(false);
    return;
  }
  estado.palpite = [];
  atualizarPalpite();
  iniciarRelogioTentativa();
}

// =========================================================
// 8. RELÓGIO DE CADA TENTATIVA
// =========================================================

function iniciarRelogioTentativa() {
  pararRelogioTentativa();
  const segundos = estado.config.tempoTentativa;

  // 0 = sem limite: o relógio nem aparece
  if (segundos === 0) {
    esconder(relogioTentativa);
    return;
  }

  mostrar(relogioTentativa);
  const fim = Date.now() + segundos * 1000;

  const passo = () => {
    const restante = Math.max(0, fim - Date.now());
    const s = Math.ceil(restante / 1000);
    tempoTentativa.textContent = s;
    relogioTentativa.classList.toggle('alerta', s <= 10); // últimos 10 s em vermelho
    if (restante === 0) tempoEsgotado();
  };

  passo();
  estado.cronometroTentativa = setInterval(passo, 200);
}

function pararRelogioTentativa() {
  clearInterval(estado.cronometroTentativa);
  relogioTentativa.classList.remove('alerta');
}

// O tempo acabou: a tentativa é perdida e vai para o histórico como "esgotado".
function tempoEsgotado() {
  pararRelogioTentativa();
  if (!estado.emJogo) return;

  estado.tentativa++;
  adicionarAoHistorico(estado.palpite, null);
  proximaTentativa();
}

// =========================================================
// 9. HISTÓRICO E FIM DA RODADA
// =========================================================

// Monta uma linha do histórico: número, cores e os pinos de resposta.
// resultado = null quando o tempo da tentativa esgotou.
function adicionarAoHistorico(palpite, resultado) {
  const item = document.createElement('li');
  item.className = 'linha-historico';

  const numero = document.createElement('span');
  numero.className = 'num';
  numero.textContent = estado.tentativa;

  const pinos = document.createElement('div');
  pinos.className = 'linha-pinos';
  desenharLinha(pinos, palpite, true);

  let resposta;
  if (resultado === null) {
    resposta = document.createElement('span');
    resposta.className = 'esgotado';
    resposta.textContent = '⏱ Tempo esgotado';
  } else {
    const { pretos, brancos } = resultado;
    // Pretos primeiro, depois brancos: assim não revela QUAL posição acertou
    resposta = document.createElement('div');
    resposta.className = 'resposta';
    resposta.setAttribute('role', 'img');
    resposta.setAttribute('aria-label', `${pretos} preto(s) e ${brancos} branco(s)`);

    for (let i = 0; i < estado.config.tamanho; i++) {
      const furo = document.createElement('span');
      furo.className = 'pino-resposta';
      if (i < pretos) {
        furo.classList.add('preto');
      } else if (i < pretos + brancos) {
        furo.classList.add('branco');
      }
      resposta.appendChild(furo);
    }
  }

  item.append(numero, pinos, resposta);
  historico.prepend(item); // a tentativa mais recente fica no topo
}

function encerrar(venceu) {
  estado.emJogo = false;
  pararRelogioTentativa();
  esconder(areaPalpite);
  mostrar(telaResultado);
  desenharLinha(senhaRevelada, estado.senha);

  if (venceu) {
    tituloResultado.textContent = '🎉 Senha descoberta!';
    textoResultado.textContent =
      `A equipe acertou em ${estado.tentativa} de ${estado.config.tentativas} tentativa(s).`;
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
  clearInterval(estado.cronometro);
  pararRelogioTentativa();
  esconder(telaResultado);
  esconder(telaJogo);
  mostrar(telaConfig);
}

// =========================================================
// 10. TECLADO: 1 a 7 escolhem a cor, Backspace apaga, Enter confere
// =========================================================
document.addEventListener('keydown', (evento) => {
  if (!estado.emJogo) return;

  const numero = Number(evento.key);
  if (Number.isInteger(numero) && numero >= 1 && numero <= CORES.length) {
    adicionarCor(numero - 1);
  } else if (evento.key === 'Backspace') {
    evento.preventDefault();
    apagarCor();
  } else if (evento.key === 'Enter') {
    evento.preventDefault();
    conferir();
  }
});

// =========================================================
// 11. INICIALIZAÇÃO: liga os botões e campos às funções
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

// Configuração: escolher nível preenche; mexer num campo vira "Personalizado"
selectNivel.addEventListener('change', escolherNivel);
[inputTempo, inputTentativas, inputTempoTentativa].forEach((campo) => {
  campo.addEventListener('input', marcarPersonalizado);
});
[selectTamanho, checkRepetidas, checkSequencia].forEach((campo) => {
  campo.addEventListener('change', marcarPersonalizado);
});
