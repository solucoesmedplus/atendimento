/* ==========================================================
   MED PLUS+ WHATSAPP CRM — FRONT END SUPABASE REALTIME
   Etapa 6.8.1 — Filtros, Status, Etiqueta, Nota Interna e Transferência
   ========================================================== */

// 1) COLE AQUI OS DADOS DO SEU SUPABASE
const SUPABASE_URL = 'https://svauxpboymlokvxygzqn.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_Ky_LSdzHXuj0cSb29I8rmA_4PCD_qVr';

// 2) URLS DAS EDGE FUNCTIONS PARA ENVIAR RESPOSTAS AO WHATSAPP
const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;
const SEND_MEDIA_URL = `${SUPABASE_URL}/functions/v1/send-media`;
const SYNC_PROFILE_PHOTOS_URL = `${SUPABASE_URL}/functions/v1/sync-profile-photos`;
const EVOLUTION_MANAGER_URL = `${SUPABASE_URL}/functions/v1/evolution-manager`;

const $ = (id) => document.getElementById(id);

let db = null;
let usuarioAtual = null;
let conversaAtual = null;
let todasConversas = [];
let departamentos = [];
let etiquetas = [];
let usuarios = [];
let usuarioDepartamentos = [];
let clientesAdmin = [];
let mensagensRapidas = [];
let mensagensRapidasAdmin = [];
let quickReplyIndex = 0;
let quickReplyContext = null;
let mensagensRapidasErro = '';
let carregandoRapidas = false;
let tentativaLazyRapidas = false;
let realtimeChannel = null;
let pollingTimer = null;
let ultimaAssinaturaConversas = '';
let ultimaAssinaturaMensagens = '';
let carregandoConversas = false;
let carregandoMensagens = false;
let arquivoSelecionado = null;
let mediaRecorder = null;
let audioChunks = [];
let gravandoAudio = false;
let evolutionConfigCache = null;
let mensagensRenderizadas = new Map();
let mensagemRespondendo = null;

let baselineConversasPronto = false;
let notificacoesRecentes = new Map();
let destaqueConversas = new Set();
let audioContextNotificacao = null;
let tituloOriginalDocumento = document.title;
let naoLidasPorConversa = {};


let emojiCategoriaAtual = 'recentes';
let emojiBuscaAtual = '';
const EMOJI_CATEGORIAS = [
  { id: 'recentes', nome: 'Recentes', icone: '🕘', emojis: [] },
  { id: 'favoritos', nome: 'Mais usados', icone: '⭐', emojis: ['😀','😁','😂','🤣','😊','😍','🥰','😎','🤔','😅','🙏','👍','👏','👌','💪','🤝','✅','❌','⚠️','📌','📎','📄','📷','🎧','🚗','🏥','💰','📲','☎️','⏰','📅','🔧','🛠️','🧾','💳','📍','🚀','❤️','💙','💚'] },
  { id: 'rostos', nome: 'Rostos', icone: '😀', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤯','😳','🥶','😱','😨','😰','😥','😓','🤗','🤔','🫡','🤭','🫢','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴'] },
  { id: 'gestos', nome: 'Gestos', icone: '👍', emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','👏','🙌','🫶','💪','✍️','👀','🧠','🗣️'] },
  { id: 'trabalho', nome: 'Trabalho', icone: '💼', emojis: ['💼','📁','📂','📎','🖇️','📌','📍','📝','📄','📃','📑','🧾','📊','📈','📉','🗂️','📅','📆','🕐','⏰','📞','☎️','📲','💻','🖥️','⌨️','🖱️','🖨️','📡','🔋','🔌','⚙️','🔧','🛠️','🧰','🚗','🏍️','🏥','🩻','💊','🧑‍💻'] },
  { id: 'simbolos', nome: 'Símbolos', icone: '✅', emojis: ['✅','☑️','✔️','❌','❎','⚠️','🚫','⛔','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','⭐','🌟','✨','🔥','💥','💯','❗','❕','❓','❔','‼️','⁉️','🔔','📢','📣','🔒','🔓','🔑','🆗','🆕','🆘','🔁','🔄','➡️','⬅️','⬆️','⬇️'] },
  { id: 'objetos', nome: 'Objetos', icone: '📦', emojis: ['📦','🎁','🛒','💵','💰','💳','🧾','📷','📸','🎥','🎧','🎤','📻','📱','☎️','🔋','💡','🔦','🧯','🪛','🔧','🔨','⚒️','🛠️','🧰','🩺','💉','💊','🩹','🪪'] },
  { id: 'coracoes', nome: 'Corações', icone: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','🫶','🥰','😍','😘'] },
];



function chaveNaoLidasStorage() {
  const email = String(usuarioAtual?.email || 'anon').toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return `medplus_unread_counts_${email}`;
}

function carregarNaoLidasStorage() {
  try {
    naoLidasPorConversa = JSON.parse(localStorage.getItem(chaveNaoLidasStorage()) || '{}') || {};
  } catch {
    naoLidasPorConversa = {};
  }
}

function salvarNaoLidasStorage() {
  try {
    localStorage.setItem(chaveNaoLidasStorage(), JSON.stringify(naoLidasPorConversa || {}));
  } catch (_) {}
}

function obterNaoLidas(conversaId) {
  return Number(naoLidasPorConversa?.[conversaId] || 0);
}

function incrementarNaoLidas(conversaId, quantidade = 1) {
  if (!conversaId) return;
  const atual = obterNaoLidas(conversaId);
  naoLidasPorConversa[conversaId] = Math.min(99, atual + Number(quantidade || 1));
  salvarNaoLidasStorage();
}

function limparNaoLidas(conversaId) {
  if (!conversaId) return;
  if (naoLidasPorConversa[conversaId]) {
    delete naoLidasPorConversa[conversaId];
    salvarNaoLidasStorage();
  }
}

function badgeNaoLidasHtml(conversaId) {
  const total = obterNaoLidas(conversaId);
  if (!total) return '';
  return `<span class="unread-badge" title="${total} mensagem(ns) não lida(s)">${total > 99 ? '99+' : total}</span>`;
}

function iniciarSupabase() {
  if (!window.supabase) {
    alert('Biblioteca Supabase não carregou. Verifique sua internet.');
    return false;
  }

  if (!SUPABASE_URL || SUPABASE_PUBLIC_KEY.includes('COLE_AQUI')) {
    alert('Abra o script.js e cole sua Public/anon key do Supabase.');
    return false;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
  });

  return true;
}

function escapeHtml(texto) {
  return String(texto || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatarData(data) {
  if (!data) return '';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

function primeiraLetra(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?';
}

function avatarClienteHtml(cliente, classe = '') {
  const nome = cliente?.nome || cliente?.telefone || 'Cliente';
  const foto = cliente?.foto_url || '';
  if (foto) {
    return `<span class="cliente-avatar ${escapeHtml(classe)}"><img src="${escapeHtml(foto)}" alt="${escapeHtml(nome)}" loading="lazy" onerror="this.parentElement.textContent='${escapeHtml(primeiraLetra(nome))}'"></span>`;
  }
  return `<span class="cliente-avatar ${escapeHtml(classe)}">${escapeHtml(primeiraLetra(nome))}</span>`;
}

function formatarTamanho(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '0 KB';
  if (n < 1024 * 1024) return `${Math.ceil(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function detectarTipoArquivo(file) {
  const mime = String(file?.type || '').toLowerCase();
  const nome = String(file?.name || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(nome)) return 'IMAGEM';
  if (mime.startsWith('audio/') || /\.(ogg|opus|mp3|wav|m4a|aac|webm)$/i.test(nome)) return 'AUDIO';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(nome)) return 'VIDEO';
  return 'DOCUMENTO';
}

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = String(reader.result || '');
      resolve(resultado.includes(',') ? resultado.split(',')[1] : resultado);
    };
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

function arquivoParaDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não consegui gerar a prévia do arquivo.'));
    reader.readAsDataURL(file);
  });
}

function statusClasse(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'SEM_SETOR') return 'status-sem';
  if (s === 'EM_ATENDIMENTO') return 'status-atendimento';
  if (s === 'EM_NEGOCIACAO') return 'status-negociacao';
  if (s === 'FINALIZADO') return 'status-finalizado';
  return '';
}

function statusTexto(status) {
  const mapa = {
    SEM_SETOR: 'Sem setor',
    EM_ATENDIMENTO: 'Em atendimento',
    EM_NEGOCIACAO: 'Em negociação',
    FINALIZADO: 'Finalizado'
  };
  return mapa[String(status || '').toUpperCase()] || 'Sem status';
}

function dataBaseConversa(c) {
  const valor = c.ultima_mensagem_em || c.criado_em;
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function inicioDoDia(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia(data) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

function passaFiltroData(c) {
  const filtro = $('dateFilter')?.value || '';
  if (!filtro) return true;

  const data = dataBaseConversa(c);
  if (!data) return false;

  const agora = new Date();

  if (filtro === 'HOJE') {
    return data >= inicioDoDia(agora) && data <= fimDoDia(agora);
  }

  if (filtro === '7DIAS') {
    const inicio = new Date(agora);
    inicio.setDate(inicio.getDate() - 7);
    inicio.setHours(0, 0, 0, 0);
    return data >= inicio && data <= fimDoDia(agora);
  }

  if (filtro === 'PERIODO') {
    const de = $('dateFrom')?.value || '';
    const ate = $('dateTo')?.value || '';
    const inicio = de ? new Date(`${de}T00:00:00`) : null;
    const fim = ate ? new Date(`${ate}T23:59:59`) : null;

    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  }

  return true;
}

function atualizarCamposPeriodo() {
  const periodo = $('dateFilter')?.value === 'PERIODO';
  $('datePeriodFields')?.classList.toggle('hidden', !periodo);
}

function assinaturaConversas(lista) {
  return JSON.stringify((lista || []).map((c) => ({
    id: c.id,
    cliente_id: c.cliente_id,
    departamento_id: c.departamento_id,
    atendente_id: c.atendente_id,
    etiqueta_id: c.etiqueta_id,
    status: c.status,
    ultima_mensagem: c.ultima_mensagem,
    ultima_mensagem_tipo: c.ultima_mensagem_tipo,
    ultima_mensagem_em: c.ultima_mensagem_em,
    atualizado_em: c.atualizado_em,
    cliente_nome: c.cliente?.nome,
    cliente_telefone: c.cliente?.telefone,
    cliente_foto: c.cliente?.foto_url,
  })));
}

function assinaturaMensagens(lista) {
  return JSON.stringify((lista || []).map((m) => ({
    id: m.id,
    kind: m._kind,
    texto: m.texto,
    tipo: m.tipo,
    media_url: m.media_url,
    criado_em: m.criado_em,
    remetente_tipo: m.remetente_tipo,
    remetente_nome: m.remetente_nome,
  })));
}

function usuarioEstaDigitando() {
  const ativo = document.activeElement;
  return ativo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ativo.tagName);
}

function alternarFiltros() {
  const box = $('filtersAccordion');
  const btn = $('btnToggleFilters');
  if (!box || !btn) return;

  const vaiAbrir = box.classList.contains('hidden');
  box.classList.toggle('hidden', !vaiAbrir);
  btn.classList.toggle('active', vaiAbrir);
  btn.setAttribute('aria-expanded', String(vaiAbrir));
  btn.setAttribute('title', vaiAbrir ? 'Fechar filtros' : 'Abrir filtros');
  btn.setAttribute('aria-label', vaiAbrir ? 'Fechar filtros' : 'Abrir filtros');
}

function rolarPainelControlesPara(el) {
  const painel = $('chatControls');
  if (!painel || !el) return;

  requestAnimationFrame(() => {
    const topo = Math.max(0, el.offsetTop - 10);
    painel.scrollTo({ top: topo, behavior: 'smooth' });
  });
}

function configurarAcordeonsResponsivos() {
  document.querySelectorAll('.action-panel > summary').forEach((summary) => {
    if (summary.dataset.acordeonOk === '1') return;
    summary.dataset.acordeonOk = '1';

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      const details = summary.closest('details');
      if (!details) return;

      const vaiAbrir = !details.open;
      details.open = vaiAbrir;

      if (vaiAbrir) {
        rolarPainelControlesPara(details);
      }
    });

    summary.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      summary.click();
    });
  });
}

function optionHtml(valor, texto, selecionado = false) {
  return `<option value="${escapeHtml(valor || '')}" ${selecionado ? 'selected' : ''}>${escapeHtml(texto || '')}</option>`;
}

function toast(msg, tipo = 'ok') {
  document.querySelectorAll('.toast').forEach((antiga) => antiga.remove());

  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;

  const dialogAberto = document.querySelector('dialog[open]');
  if (dialogAberto) {
    el.classList.add('toast-in-dialog');
    const card = dialogAberto.querySelector('.admin-modal-card') || dialogAberto;
    card.appendChild(el);
  } else {
    document.body.appendChild(el);
  }

  setTimeout(() => el.remove(), 3600);
}


function atualizarContagemAtendimentos(visiveis, total) {
  const el = $('conversationCount');
  if (!el) return;
  const v = Number(visiveis || 0);
  const t = Number(total || 0);
  el.textContent = v === t ? String(v) : `${v}/${t}`;
  el.title = v === t ? `${v} atendimento(s)` : `${v} atendimento(s) filtrado(s) de ${t}`;
}

function prepararAudioNotificacao() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContextNotificacao) audioContextNotificacao = new AudioCtx();
    if (audioContextNotificacao.state === 'suspended') audioContextNotificacao.resume().catch(() => {});
  } catch (_) {}
}

function tocarSomNotificacao() {
  try {
    prepararAudioNotificacao();
    if (!audioContextNotificacao) return;

    const ctx = audioContextNotificacao;
    const agora = ctx.currentTime;
    const ganho = ctx.createGain();
    ganho.gain.setValueAtTime(0.0001, agora);
    ganho.gain.exponentialRampToValueAtTime(0.18, agora + 0.015);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.34);
    ganho.connect(ctx.destination);

    const oscilador1 = ctx.createOscillator();
    oscilador1.type = 'sine';
    oscilador1.frequency.setValueAtTime(880, agora);
    oscilador1.connect(ganho);
    oscilador1.start(agora);
    oscilador1.stop(agora + 0.18);

    const oscilador2 = ctx.createOscillator();
    oscilador2.type = 'sine';
    oscilador2.frequency.setValueAtTime(1174, agora + 0.16);
    oscilador2.connect(ganho);
    oscilador2.start(agora + 0.16);
    oscilador2.stop(agora + 0.34);
  } catch (_) {}
}

function solicitarPermissaoNotificacao() {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch (_) {}
}

function mostrarNotificacaoVisual(titulo, texto, icone = '🔔', conversaId = '') {
  const centro = $('notificationCenter');
  if (!centro) return;

  const item = document.createElement('div');
  item.className = 'app-notification';
  item.innerHTML = `
    <div class="notification-icon">${escapeHtml(icone)}</div>
    <div>
      <strong>${escapeHtml(titulo)}</strong>
      <span>${escapeHtml(texto)}</span>
    </div>
    <button type="button" aria-label="Fechar">✕</button>
  `;

  item.querySelector('button').addEventListener('click', (e) => {
    e.stopPropagation();
    item.remove();
  });

  if (conversaId) {
    item.addEventListener('click', () => {
      item.remove();
      selecionarConversa(conversaId);
    });
  }

  centro.prepend(item);
  while (centro.children.length > 4) centro.lastElementChild.remove();
  setTimeout(() => item.remove(), 8500);
}

function notificarEvento(chave, titulo, texto, conversaId = '', icone = '🔔') {
  const agora = Date.now();
  const ultima = notificacoesRecentes.get(chave) || 0;
  if (agora - ultima < 4500) return;
  notificacoesRecentes.set(chave, agora);

  if (conversaId) {
    destaqueConversas.add(conversaId);
    setTimeout(() => {
      destaqueConversas.delete(conversaId);
      renderizarConversas();
    }, 15000);
  }

  document.body.classList.add('has-unread-notification');
  document.title = `● ${tituloOriginalDocumento}`;

  mostrarNotificacaoVisual(titulo, texto, icone, conversaId);
  tocarSomNotificacao();

  try {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(titulo, { body: texto, icon: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiU3J-LLB6bodx_q6Nzvij2FXKRUjl6-Wefi9HGKFSqUpmKyLmXFNnhR_sZ8qIMW5Y7jJQHyvO4GdDXep4RJjBm6GN7jVjv0ylDWj05Jomsivs6JLrNPsMZJAQDNbbCVB3E55SO5wD6-soJJMOk2TaFIEvyopP7aoNssNZpN3LhcLSmNQrsPv7HwDMaI7vi/s320/MD%20Logo%20principal_Vertical.png' });
      if (conversaId) n.onclick = () => { window.focus(); selecionarConversa(conversaId); n.close(); };
    }
  } catch (_) {}

  renderizarConversas();
}

function avaliarNovidadesConversas(mapaAnterior, conversasNovas) {
  if (!baselineConversasPronto) {
    baselineConversasPronto = true;
    return;
  }

  conversasNovas.forEach((c) => {
    const anterior = mapaAnterior.get(c.id);
    const cliente = c.cliente || {};
    const nome = cliente.nome || cliente.telefone || 'Cliente';
    const texto = c.ultima_mensagem || 'Nova interação';

    if (!anterior && c.status !== 'FINALIZADO') {
      notificarEvento(`novo-${c.id}`, 'Novo atendimento', `${nome}: ${texto}`, c.id, '💬');
      return;
    }

    if (anterior && anterior.ultima_mensagem_em !== c.ultima_mensagem_em) {
      const telaAtivaNaConversa = !document.hidden && conversaAtual?.id === c.id;
      if (!telaAtivaNaConversa) {
        notificarEvento(`interacao-${c.id}-${c.ultima_mensagem_em}`, 'Nova interação', `${nome}: ${texto}`, c.id, '🔔');
      }
    }
  });
}

window.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    document.title = tituloOriginalDocumento;
    document.body.classList.remove('has-unread-notification');
  }
});

function salvarSessao(usuario) {
  localStorage.setItem('medplus_supabase_user', JSON.stringify(usuario));
}

function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem('medplus_supabase_user') || 'null');
  } catch {
    return null;
  }
}

function limparSessao() {
  localStorage.removeItem('medplus_supabase_user');
}

async function login(email, senha) {
  $('btnLogin').disabled = true;
  $('btnLogin').textContent = 'Entrando...';
  $('loginMsg').classList.add('hidden');

  try {
    const { data, error } = await db.rpc('app_login', {
      p_email: email,
      p_senha: senha
    });

    if (error) throw error;
    if (!data || !data.length) throw new Error('E-mail ou senha inválidos.');

    usuarioAtual = data[0];
    salvarSessao(usuarioAtual);
    abrirSistema();
  } catch (erro) {
    $('loginMsg').textContent = erro.message || 'Erro ao fazer login.';
    $('loginMsg').classList.remove('hidden');
  } finally {
    $('btnLogin').disabled = false;
    $('btnLogin').textContent = 'Entrar';
  }
}

async function abrirSistema() {
  prepararAudioNotificacao();
  solicitarPermissaoNotificacao();
  $('loginScreen').classList.add('hidden');
  $('appScreen').classList.remove('hidden');
  $('userName').textContent = `${usuarioAtual.nome} • ${usuarioAtual.perfil}`;
  configurarPermissoesAdmin();
  carregarNaoLidasStorage();

  await carregarDadosBase();
  renderizarFiltrosBase();
  await carregarConversas({ silencioso: true });
  iniciarRealtime();
}

function sair() {
  limparSessao();
  usuarioAtual = null;
  conversaAtual = null;
  todasConversas = [];
  baselineConversasPronto = false;
  destaqueConversas.clear();
  notificacoesRecentes.clear();
  naoLidasPorConversa = {};
  document.title = tituloOriginalDocumento;
  document.body.classList.remove('has-unread-notification');
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  if (pollingTimer) clearInterval(pollingTimer);
  $('appScreen').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
}

async function carregarDadosBase() {
  const [depsRes, etiqRes, usersRes, userDepsRes] = await Promise.all([
    db.from('departamentos').select('*').order('nome', { ascending: true }),
    db.from('etiquetas').select('*').order('nome', { ascending: true }),
    db.from('usuarios').select('id,nome,email,perfil,ativo').order('nome', { ascending: true }),
    db.from('usuario_departamentos').select('*')
  ]);

  if (depsRes.error) throw depsRes.error;
  if (etiqRes.error) throw etiqRes.error;
  if (usersRes.error) throw usersRes.error;
  if (userDepsRes.error) console.warn('Erro ao carregar usuário_departamentos:', userDepsRes.error.message);

  departamentos = (depsRes.data || []).filter((d) => d.ativo !== false);
  etiquetas = (etiqRes.data || []).filter((e) => e.ativo !== false);
  usuarios = (usersRes.data || []).filter((u) => u.ativo !== false);
  usuarioDepartamentos = (userDepsRes.data || []).filter((ud) => ud.ativo !== false);

  await carregarMensagensRapidas(false);
}

async function carregarMensagensRapidas(mostrarErro = false) {
  if (!db || carregandoRapidas) return;
  carregandoRapidas = true;

  try {
    // Primeiro tenta carregar por função RPC com SECURITY DEFINER.
    // Isso evita problema quando o Supabase retorna lista vazia por causa de RLS/políticas.
    let data = null;
    let error = null;

    const rpcRes = await db.rpc('app_listar_mensagens_rapidas');

    if (!rpcRes.error) {
      data = rpcRes.data || [];
    } else {
      // Fallback para projetos onde a função ainda não foi executada.
      const tableRes = await db
        .from('mensagens_rapidas')
        .select('id,titulo,atalho,texto,ordem,ativo,criado_em,atualizado_em')
        .order('ordem', { ascending: true })
        .order('atalho', { ascending: true });

      data = tableRes.data || [];
      error = tableRes.error;
    }

    if (error) throw error;

    mensagensRapidasErro = '';
    mensagensRapidasAdmin = (data || []).sort((a, b) => {
      const ordemA = Number(a.ordem || 0);
      const ordemB = Number(b.ordem || 0);
      if (ordemA !== ordemB) return ordemA - ordemB;
      return String(a.atalho || '').localeCompare(String(b.atalho || ''));
    });
    mensagensRapidas = mensagensRapidasAdmin.filter((r) => r.ativo !== false);
  } catch (erro) {
    mensagensRapidasErro = erro.message || 'Erro ao carregar mensagens rápidas.';
    console.warn('Erro ao carregar mensagens rápidas:', mensagensRapidasErro);
    mensagensRapidasAdmin = [];
    mensagensRapidas = [];
    if (mostrarErro) toast('Não consegui carregar as mensagens rápidas. Execute o SQL RPC corrigido e atualize a página.', 'erro');
  } finally {
    carregandoRapidas = false;
  }
}

function renderizarFiltrosBase() {
  const depOptions = '<option value="">Todos</option>' + departamentos.map((d) => optionHtml(d.id, d.nome)).join('');
  const userOptions = '<option value="">Todos</option>' + usuarios.map((u) => optionHtml(u.id, `${u.nome} — ${u.email}`)).join('');
  const etiquetaOptions = '<option value="">Todas</option>' + etiquetas.map((e) => optionHtml(e.id, e.nome)).join('');

  $('departamentoFilter').innerHTML = depOptions;
  $('atendenteFilter').innerHTML = userOptions;
  $('etiquetaFilter').innerHTML = etiquetaOptions;

  $('transferDepartamentoSelect').innerHTML = '<option value="">Selecione...</option>' + departamentos.map((d) => optionHtml(d.id, d.nome)).join('');
  $('chatEtiquetaSelect').innerHTML = '<option value="">Selecione...</option>' + etiquetas.map((e) => optionHtml(e.id, e.nome)).join('');
}

async function carregarConversas(opcoes = {}) {
  if (carregandoConversas) return;
  carregandoConversas = true;
  const silencioso = opcoes.silencioso !== false;
  const conversaIdAnterior = conversaAtual?.id || '';
  const mapaAnteriorConversas = new Map(todasConversas.map((c) => [c.id, {
    ultima_mensagem_em: c.ultima_mensagem_em || '',
    ultima_mensagem: c.ultima_mensagem || '',
    status: c.status || ''
  }]));
  try {
    if (!silencioso && !todasConversas.length) {
      $('conversationList').innerHTML = '<div class="message-box">Carregando atendimentos...</div>';
    }

  const { data: conversas, error } = await db
    .from('conversas')
    .select('*')
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao carregar conversas:', error);
    $('conversationList').innerHTML = `<div class="message-box">Erro ao carregar conversas: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const lista = conversas || [];

  if (!lista.length) {
    todasConversas = [];
    baselineConversasPronto = true;
    renderizarConversas();
    return;
  }

  async function buscarTabelaPorIds(tabela, ids, campos = '*') {
    const unicos = [...new Set((ids || []).filter(Boolean))];
    if (!unicos.length) return new Map();

    const { data, error } = await db.from(tabela).select(campos).in('id', unicos);
    if (error) {
      console.warn(`Erro ao buscar ${tabela}:`, error.message);
      return new Map();
    }
    return new Map((data || []).map((item) => [item.id, item]));
  }

  const clientesMap = await buscarTabelaPorIds('clientes', lista.map((c) => c.cliente_id), 'id,nome,telefone,foto_url,tipo_cliente,ativo');
  const departamentosMap = new Map(departamentos.map((d) => [d.id, d]));
  const usuariosMap = new Map(usuarios.map((u) => [u.id, u]));
  const etiquetasMap = new Map(etiquetas.map((e) => [e.id, e]));

  todasConversas = lista.map((c) => {
    const telefoneFallback = String(c.evolution_remote_jid || '').split('@')[0].replace(/\D/g, '');
    const cliente = clientesMap.get(c.cliente_id) || {
      id: c.cliente_id,
      nome: telefoneFallback || 'Sem nome',
      telefone: telefoneFallback,
      foto_url: '',
      tipo_cliente: '',
      ativo: true,
    };

    return {
      ...c,
      cliente,
      departamento: departamentosMap.get(c.departamento_id) || null,
      atendente: usuariosMap.get(c.atendente_id) || null,
      etiqueta: etiquetasMap.get(c.etiqueta_id) || null,
    };
  });

  avaliarNovidadesConversas(mapaAnteriorConversas, todasConversas);

  if (conversaAtual) {
    conversaAtual = todasConversas.find((c) => c.id === conversaAtual.id) || conversaAtual;
    preencherPainelConversa({ limparCampos: false });
  }

  const assinaturaNova = assinaturaConversas(todasConversas);

  if (assinaturaNova !== ultimaAssinaturaConversas) {
    ultimaAssinaturaConversas = assinaturaNova;
    renderizarConversas();
  } else if (!document.querySelector('.conversation-card')) {
    renderizarConversas();
  }
  } finally {
    carregandoConversas = false;
  }
}

function renderizarConversas() {
  const termo = $('searchInput').value.trim().toLowerCase();
  const status = $('statusFilter').value;
  const dep = $('departamentoFilter').value;
  const atendente = $('atendenteFilter').value;
  const etiqueta = $('etiquetaFilter').value;

  const filtradas = todasConversas.filter((c) => {
    const cliente = c.cliente || {};
    const texto = `${cliente.nome || ''} ${cliente.telefone || ''} ${c.ultima_mensagem || ''} ${c.departamento?.nome || ''} ${c.atendente?.nome || ''}`.toLowerCase();
    return (!termo || texto.includes(termo))
      && (!status || c.status === status)
      && (!dep || c.departamento_id === dep)
      && (!atendente || c.atendente_id === atendente)
      && (!etiqueta || c.etiqueta_id === etiqueta)
      && passaFiltroData(c);
  });

  atualizarContagemAtendimentos(filtradas.length, todasConversas.length);

  if (!filtradas.length) {
    $('conversationList').innerHTML = '<div class="message-box">Nenhum atendimento encontrado.</div>';
    return;
  }

  $('conversationList').innerHTML = filtradas.map((c) => {
    const cliente = c.cliente || {};
    const nome = cliente.nome || cliente.telefone || 'Sem nome';
    const ativo = conversaAtual && conversaAtual.id === c.id ? 'active' : '';
    const destaque = destaqueConversas.has(c.id) ? 'notify-new' : '';
    const unreadCount = obterNaoLidas(c.id);
    const unreadClass = unreadCount ? 'has-unread' : '';
    const foto = avatarClienteHtml(cliente);
    const tipo = c.ultima_mensagem_tipo ? `[${c.ultima_mensagem_tipo}] ` : '';

    return `
      <button class="conversation-card ${ativo} ${destaque} ${unreadClass}" data-id="${escapeHtml(c.id)}" type="button">
        <div class="card-avatar">${foto}</div>
        <div class="card-main">
          <div class="card-top">
            <div class="card-name">${escapeHtml(nome)}</div>
            <div class="card-time-wrap"><div class="card-time">${escapeHtml(formatarData(c.ultima_mensagem_em || c.criado_em))}</div>${badgeNaoLidasHtml(c.id)}</div>
          </div>
          <div class="card-phone">${escapeHtml(cliente.telefone || '')}</div>
          <div class="card-last">${escapeHtml(tipo + (c.ultima_mensagem || ''))}</div>
          <div class="card-badges">
            <span class="mini-badge ${statusClasse(c.status)}">${escapeHtml(statusTexto(c.status))}</span>
            ${c.departamento?.nome ? `<span class="mini-badge">${escapeHtml(c.departamento.nome)}</span>` : ''}
            ${c.atendente?.nome ? `<span class="mini-badge">${escapeHtml(c.atendente.nome)}</span>` : ''}
            ${c.etiqueta?.nome ? `<span class="mini-badge">${escapeHtml(c.etiqueta.nome)}</span>` : ''}
          </div>
        </div>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.conversation-card').forEach((btn) => {
    btn.addEventListener('click', () => selecionarConversa(btn.dataset.id));
  });
}

async function selecionarConversa(id) {
  conversaAtual = todasConversas.find((c) => c.id === id) || null;
  destaqueConversas.delete(id);
  limparNaoLidas(id);
  document.title = tituloOriginalDocumento;
  document.body.classList.remove('has-unread-notification');
  renderizarConversas();
  if (!conversaAtual) return;

  const app = $('appScreen');
  if (app && window.matchMedia('(max-width: 760px)').matches) {
    app.classList.add('mobile-chat-open');
  }

  ultimaAssinaturaMensagens = '';
  preencherPainelConversa({ limparCampos: true });
  await carregarMensagensENotas(id, { force: true });
}

function preencherPainelConversa(opcoes = {}) {
  if (!conversaAtual) return;
  const cliente = conversaAtual.cliente || {};
  const nome = cliente.nome || cliente.telefone || 'Cliente';

  $('chatTitle').textContent = nome;
  $('chatSubtitle').textContent = [
    cliente.telefone || '',
    conversaAtual.departamento?.nome || 'Sem setor',
    conversaAtual.atendente?.nome || 'Sem atendente'
  ].filter(Boolean).join(' • ');

  $('chatAvatar').innerHTML = avatarClienteHtml(cliente);
  $('chatStatusBadge').textContent = statusTexto(conversaAtual.status);
  $('chatStatusBadge').className = `status-badge ${statusClasse(conversaAtual.status)}`;
  $('chatStatusBadge').classList.remove('hidden');

  $('chatControls').classList.remove('hidden');
  configurarAcordeonsResponsivos();
  $('chatStatusSelect').value = conversaAtual.status || 'SEM_SETOR';
  $('chatEtiquetaSelect').value = conversaAtual.etiqueta_id || '';

  if (opcoes.limparCampos) {
    $('transferDepartamentoSelect').value = '';
    $('transferAtendenteSelect').innerHTML = '<option value="">Selecione primeiro o setor</option>';
    $('transferObsInput').value = '';
    $('notaInternaInput').value = '';
  }

  $('messageInput').disabled = false;
  ajustarAlturaCampoResposta();
  $('btnSend').disabled = false;
  $('btnAttach').disabled = false;
  $('btnMic').disabled = false;
  if ($('btnEmoji')) $('btnEmoji').disabled = false;
}

async function carregarMensagensENotas(conversaId, opcoes = {}) {
  if (carregandoMensagens && !opcoes.force) return;
  carregandoMensagens = true;
  try {
  const [msgRes, notasRes] = await Promise.all([
    db.from('mensagens').select('*').eq('conversa_id', conversaId).order('criado_em', { ascending: true }),
    db.from('notas_internas').select('*').eq('conversa_id', conversaId).order('criado_em', { ascending: true })
  ]);

  if (msgRes.error) {
    console.error(msgRes.error);
    $('messagesBox').innerHTML = `<div class="message-box">Erro ao carregar mensagens: ${escapeHtml(msgRes.error.message)}</div>`;
    return;
  }

  if (notasRes.error) {
    console.warn('Erro ao carregar notas internas:', notasRes.error.message);
  }

  const mensagens = (msgRes.data || []).map((m) => ({ ...m, _kind: 'mensagem' }));
  const notas = (notasRes.data || []).map((n) => {
    const usuario = usuarios.find((u) => u.id === n.usuario_id);
    return {
      ...n,
      _kind: 'nota',
      remetente_tipo: 'INTERNO',
      remetente_nome: usuario?.nome || 'Nota interna',
      texto: n.nota,
      tipo: 'NOTA_INTERNA'
    };
  });

  const combinado = [...mensagens, ...notas]
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  const assinaturaNova = assinaturaMensagens(combinado);
  if (opcoes.force || assinaturaNova !== ultimaAssinaturaMensagens) {
    ultimaAssinaturaMensagens = assinaturaNova;
    renderizarMensagens(combinado);
  }
  } finally {
    carregandoMensagens = false;
  }
}

function renderizarMensagens(mensagens) {
  if (!mensagens.length) {
    $('messagesBox').className = 'messages-box empty-state';
    $('messagesBox').innerHTML = '<div><h3>Sem mensagens</h3><p>Aguardando novas mensagens.</p></div>';
    return;
  }

  const box = $('messagesBox');
  const estavaNoFim = Math.abs((box.scrollHeight - box.scrollTop) - box.clientHeight) < 80;

  box.className = 'messages-box';
  mensagensRenderizadas = new Map();
  box.innerHTML = mensagens.map(renderizarMensagem).join('');

  if (estavaNoFim || !box.dataset.renderizado) {
    box.scrollTop = box.scrollHeight;
  }
  box.dataset.renderizado = '1';

  document.querySelectorAll('[data-open-media]').forEach((el) => {
    el.addEventListener('click', () => window.open(el.getAttribute('data-open-media'), '_blank'));
  });

  document.querySelectorAll('[data-scroll-message]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      rolarParaMensagem(el.getAttribute('data-scroll-message'));
    });
  });
}

function parsePayloadMensagem(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor;
  try {
    return JSON.parse(valor);
  } catch (_) {
    return null;
  }
}

function obterReferenciaResposta(m) {
  const payload = parsePayloadMensagem(m.evolution_payload) || {};
  const ref = payload.reply_to || payload.quoted_reply || payload.quotedMessage || null;

  const id =
    payload.reply_to_message_id ||
    payload.quoted_message_id ||
    payload.reply_to_supabase_id ||
    ref?.id ||
    ref?.message_id ||
    ref?.supabase_id ||
    '';

  if (!id) return null;

  const nome =
    payload.reply_to_nome ||
    payload.quoted_message_nome ||
    ref?.nome ||
    ref?.remetente_nome ||
    'Mensagem';

  const texto =
    payload.reply_to_preview ||
    payload.quoted_message_texto ||
    ref?.texto ||
    ref?.preview ||
    'Mensagem respondida';

  return { id: String(id), nome: String(nome), texto: resumoTextoLivre(texto, 120) };
}

function resumoTextoLivre(valor, limite = 120) {
  const txt = String(valor || '').replace(/\s+/g, ' ').trim();
  if (!txt) return 'Mensagem respondida';
  return txt.length > limite ? txt.slice(0, limite - 1) + '…' : txt;
}

function rolarParaMensagem(id) {
  if (!id) return;
  const seletor = `[data-message-id="${CSS.escape(String(id))}"]`;
  const alvo = document.querySelector(seletor);
  if (!alvo) {
    toast('Mensagem original não encontrada nesta conversa.', 'erro');
    return;
  }

  alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  alvo.classList.add('message-highlight');
  setTimeout(() => alvo.classList.remove('message-highlight'), 1800);
}

function renderizarMensagem(m) {
  let classe = 'system';
  let bubbleExtra = '';
  let labelInterno = '';

  const textoOriginal = String(m.texto || '');
  const ehInterna = m._kind === 'nota' || m.remetente_tipo === 'INTERNO' || m.tipo === 'NOTA_INTERNA';
  const ehTransferencia = ehInterna && /atendimento\s+transferido/i.test(textoOriginal);
  const mensagemId = String(m.id || m.evolution_message_id || `tmp-${Math.random().toString(36).slice(2)}`);

  if (m.remetente_tipo === 'CLIENTE') classe = 'in';
  if (m.remetente_tipo === 'ATENDENTE') classe = 'out';
  if (ehInterna) {
    classe = 'internal';
    bubbleExtra = ehTransferencia ? 'bubble-transferencia' : 'bubble-interna';
    labelInterno = ehTransferencia
      ? '<div class="internal-label">🔁 Transferência</div>'
      : '<div class="internal-label">🔒 Nota interna</div>';
  }

  mensagensRenderizadas.set(mensagemId, {
    ...m,
    id: mensagemId,
    texto: textoOriginal,
    _classeMensagem: classe,
    _ehInterna: ehInterna,
    _ehTransferencia: ehTransferencia
  });

  const nome = m.remetente_nome || m.remetente_tipo || '';
  const hora = formatarData(m.criado_em);
  const media = renderizarMedia(m);
  const texto = textoOriginal ? `<div class="bubble-text">${escapeHtml(textoOriginal)}</div>` : '';
  const refResposta = obterReferenciaResposta(m);
  const replyHtml = refResposta
    ? '<button type="button" class="bubble-reply-reference" data-scroll-message="' + escapeHtml(refResposta.id) + '" title="Ir para a mensagem respondida">' +
        '<span class="reply-ref-bar"></span>' +
        '<span class="reply-ref-body">' +
          '<strong>' + escapeHtml(refResposta.nome) + '</strong>' +
          '<small>' + escapeHtml(refResposta.texto) + '</small>' +
        '</span>' +
      '</button>'
    : '';

  return '<div class="message-row ' + classe + '" data-message-id="' + escapeHtml(mensagemId) + '">' +
    '<div class="bubble ' + bubbleExtra + '">' +
      '<button type="button" class="message-menu-trigger" data-message-menu="' + escapeHtml(mensagemId) + '" title="Mais opções" aria-label="Mais opções desta mensagem">⌄</button>' +
      '<div class="message-actions-menu hidden" data-message-menu-panel="' + escapeHtml(mensagemId) + '">' +
        '<button type="button" data-message-action="reply" data-message-id="' + escapeHtml(mensagemId) + '"><span>↩️</span> Responder</button>' +
        '<button type="button" data-message-action="copy" data-message-id="' + escapeHtml(mensagemId) + '"><span>📋</span> Copiar</button>' +
        '<div class="message-menu-separator"></div>' +
        '<button type="button" class="danger" data-message-action="delete" data-message-id="' + escapeHtml(mensagemId) + '"><span>🗑️</span> Apagar</button>' +
      '</div>' +
      labelInterno +
      '<div class="bubble-meta"><span>' + escapeHtml(nome) + '</span><span>' + escapeHtml(hora) + '</span></div>' +
      replyHtml +
      media +
      texto +
    '</div>' +
  '</div>';
}

function resumoMensagemParaMenu(m, limite = 120) {
  const txt = String(m?.texto || m?.media_nome || m?.media_url || '').replace(/\s+/g, ' ').trim();
  if (!txt) return '[mídia/anexo]';
  return txt.length > limite ? txt.slice(0, limite - 1) + '…' : txt;
}

function fecharMenusMensagem(excetoId = '') {
  document.querySelectorAll('.message-actions-menu').forEach((menu) => {
    if (excetoId && menu.dataset.messageMenuPanel === excetoId) return;
    menu.classList.add('hidden');
  });
  document.querySelectorAll('.message-menu-trigger.is-open').forEach((btn) => {
    if (excetoId && btn.dataset.messageMenu === excetoId) return;
    btn.classList.remove('is-open');
  });
}

function alternarMenuMensagem(id) {
  const painel = document.querySelector(`[data-message-menu-panel="${CSS.escape(id)}"]`);
  const botao = document.querySelector(`[data-message-menu="${CSS.escape(id)}"]`);
  if (!painel || !botao) return;
  const vaiAbrir = painel.classList.contains('hidden');
  fecharMenusMensagem(vaiAbrir ? id : '');
  painel.classList.toggle('hidden', !vaiAbrir);
  botao.classList.toggle('is-open', vaiAbrir);
}

function criarReplyPreviewSeNecessario() {
  let box = $('replyPreviewBox');
  if (box) return box;
  const composer = document.querySelector('.composer');
  const row = document.querySelector('.composer-row');
  if (!composer || !row) return null;
  box = document.createElement('div');
  box.id = 'replyPreviewBox';
  box.className = 'reply-preview-box hidden';
  composer.insertBefore(box, row);
  return box;
}

function renderizarPreviewResposta() {
  const box = criarReplyPreviewSeNecessario();
  if (!box) return;
  if (!mensagemRespondendo) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  const nome = mensagemRespondendo.remetente_nome || mensagemRespondendo.remetente_tipo || 'Mensagem';
  const resumo = resumoMensagemParaMenu(mensagemRespondendo, 180);
  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="reply-preview-content">
      <div class="reply-preview-icon">↩️</div>
      <div class="reply-preview-text">
        <strong>Respondendo ${escapeHtml(nome)}</strong>
        <span>${escapeHtml(resumo)}</span>
      </div>
      <button type="button" id="btnCancelReply" class="reply-preview-close" title="Cancelar resposta">✕</button>
    </div>
  `;
  $('btnCancelReply')?.addEventListener('click', limparRespostaMensagem);
}

function iniciarRespostaMensagem(id) {
  const msg = mensagensRenderizadas.get(String(id));
  if (!msg) return;
  mensagemRespondendo = msg;
  renderizarPreviewResposta();
  fecharMenusMensagem();
  const input = $('messageInput');
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function limparRespostaMensagem() {
  mensagemRespondendo = null;
  renderizarPreviewResposta();
}

function formatarDataCompletaHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatarHoraAtual() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function aplicarVariaveisMensagem(texto) {
  const cliente = conversaAtual?.cliente || {};
  const atendenteLogado = usuarioAtual?.nome || '';
  const atendenteConversa = conversaAtual?.atendente?.nome || '';
  const departamento = conversaAtual?.departamento?.nome || '';
  const agoraData = formatarDataCompletaHoje();
  const agoraHora = formatarHoraAtual();

  const valores = {
    atendente: atendenteLogado || atendenteConversa || 'Atendente',
    nome_atendente: atendenteLogado || atendenteConversa || 'Atendente',
    usuario: atendenteLogado || atendenteConversa || 'Atendente',
    cliente: cliente.nome || cliente.telefone || 'cliente',
    nome_cliente: cliente.nome || cliente.telefone || 'cliente',
    telefone: cliente.telefone || '',
    departamento: departamento || 'setor',
    setor: departamento || 'setor',
    data: agoraData,
    hora: agoraHora,
    data_hora: `${agoraData} ${agoraHora}`,
  };

  return String(texto || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, chave) => {
    const key = String(chave || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(valores, key) ? valores[key] : match;
  });
}

function textoParaEnvio(texto) {
  // A resposta citada agora é enviada como resposta nativa do WhatsApp
  // pela Edge Function send-message. Por isso o texto não recebe mais
  // aquele cabeçalho “Respondendo...”, deixando a conversa mais limpa.
  return aplicarVariaveisMensagem(texto);
}


async function copiarTextoMensagem(id) {
  const msg = mensagensRenderizadas.get(String(id));
  if (!msg) return;
  const conteudo = String(msg.texto || msg.media_url || msg.media_nome || '').trim();
  if (!conteudo) return toast('Não há texto ou link para copiar.', 'erro');

  try {
    await navigator.clipboard.writeText(conteudo);
    toast('Mensagem copiada para a área de transferência.', 'sucesso');
  } catch {
    const temp = document.createElement('textarea');
    temp.value = conteudo;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    toast('Mensagem copiada para a área de transferência.', 'sucesso');
  }
  fecharMenusMensagem();
}

async function atualizarResumoConversaDepoisDeApagar(conversaId) {
  if (!conversaId) return;
  const { data, error } = await db
    .from('mensagens')
    .select('texto,tipo,criado_em')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: false })
    .limit(1);

  if (error) return console.warn('Não foi possível atualizar resumo da conversa:', error.message);
  const ultima = data?.[0] || null;
  await db.from('conversas').update({
    ultima_mensagem: ultima?.texto || '',
    ultima_mensagem_tipo: ultima?.tipo || '',
    ultima_mensagem_em: ultima?.criado_em || null
  }).eq('id', conversaId);
}

async function apagarMensagemEspecifica(id) {
  const msg = mensagensRenderizadas.get(String(id));
  if (!msg) return;

  const resumo = resumoMensagemParaMenu(msg, 80);
  const ok = confirm(`Deseja apagar esta mensagem somente do sistema?\n\n${resumo}`);
  if (!ok) return;

  try {
    const tabela = msg._kind === 'nota' ? 'notas_internas' : 'mensagens';
    const { error } = await db.from(tabela).delete().eq('id', msg.id);
    if (error) throw error;

    if (msg._kind !== 'nota') await atualizarResumoConversaDepoisDeApagar(msg.conversa_id || conversaAtual?.id);
    if (mensagemRespondendo?.id === msg.id) limparRespostaMensagem();

    fecharMenusMensagem();
    toast('Mensagem apagada do sistema.', 'sucesso');
    if (conversaAtual?.id) await carregarMensagensENotas(conversaAtual.id, { force: true });
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    alert(erro.message || 'Não foi possível apagar esta mensagem.');
  }
}

function configurarMenuDeMensagens() {
  $('messagesBox')?.addEventListener('click', (e) => {
    const botaoMenu = e.target.closest('[data-message-menu]');
    if (botaoMenu) {
      e.preventDefault();
      e.stopPropagation();
      alternarMenuMensagem(botaoMenu.dataset.messageMenu);
      return;
    }

    const acao = e.target.closest('[data-message-action]');
    if (acao) {
      e.preventDefault();
      e.stopPropagation();
      const id = acao.dataset.messageId;
      const tipo = acao.dataset.messageAction;
      if (tipo === 'reply') iniciarRespostaMensagem(id);
      if (tipo === 'copy') copiarTextoMensagem(id);
      if (tipo === 'delete') apagarMensagemEspecifica(id);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.message-actions-menu') && !e.target.closest('.message-menu-trigger')) {
      fecharMenusMensagem();
    }
  });
}


function renderizarMedia(m) {
  if (!m.media_url) return '';
  const url = escapeHtml(m.media_url);
  const nome = escapeHtml(m.media_nome || 'arquivo');
  const tipo = String(m.tipo || '').toUpperCase();

  if (tipo === 'IMAGEM') return `<img class="media-img" src="${url}" alt="${nome}" loading="lazy" data-open-media="${url}">`;
  if (tipo === 'AUDIO') return `<audio class="media-audio" controls preload="metadata" src="${url}"></audio>`;
  if (tipo === 'VIDEO') return `<video class="media-video" controls preload="metadata" src="${url}"></video>`;
  if (tipo === 'DOCUMENTO') return `<a class="doc-link" href="${url}" target="_blank" rel="noopener">📄 ${nome}</a>`;
  return '';
}

function limparAnexoSelecionado() {
  arquivoSelecionado = null;
  if ($('mediaInput')) $('mediaInput').value = '';
  $('mediaPreviewContent').innerHTML = '';
  $('mediaPreviewBox').classList.add('hidden');
}

async function mostrarPreviewArquivo(file) {
  if (!file) return;

  const limite = 50 * 1024 * 1024;
  if (file.size > limite) {
    alert('Arquivo muito grande. Nesta etapa, use arquivos de até 50 MB.');
    limparAnexoSelecionado();
    return;
  }

  arquivoSelecionado = file;
  const tipo = detectarTipoArquivo(file);
  const nome = escapeHtml(file.name || 'arquivo');
  const tamanho = formatarTamanho(file.size);
  let preview = '';

  try {
    const dataUrl = await arquivoParaDataUrl(file);
    if (tipo === 'IMAGEM') {
      preview = `<img class="preview-thumb" src="${dataUrl}" alt="Prévia da imagem">`;
    } else if (tipo === 'VIDEO') {
      preview = `<video class="preview-video" controls preload="metadata" src="${dataUrl}"></video>`;
    } else if (tipo === 'AUDIO') {
      preview = `<audio class="preview-audio" controls preload="metadata" src="${dataUrl}"></audio>`;
    } else {
      preview = `<div class="preview-thumb file-thumb">📄</div>`;
    }
  } catch (_) {
    preview = tipo === 'DOCUMENTO' ? `<div class="preview-thumb file-thumb">📄</div>` : `<div class="preview-thumb file-thumb">📎</div>`;
  }

  $('mediaPreviewContent').innerHTML = `
    ${preview}
    <div class="preview-file-info">
      <strong>${nome}</strong>
      <span>${tipo} • ${tamanho}</span>
    </div>
  `;
  $('mediaPreviewBox').classList.remove('hidden');
}

async function enviarAnexoSelecionado() {
  if (!arquivoSelecionado || !conversaAtual) return;

  const legenda = aplicarVariaveisMensagem($('messageInput').value.trim());
  const file = arquivoSelecionado;
  const tipo = detectarTipoArquivo(file);
  const base64 = await arquivoParaBase64(file);

  const resposta = await fetch(SEND_MEDIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversa_id: conversaAtual.id,
      usuario_id: usuarioAtual.id,
      tipo,
      legenda,
      file_name: file.name || (tipo === 'AUDIO' ? 'audio-gravado.webm' : 'anexo'),
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size || 0,
      base64
    })
  });

  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !json.ok) throw new Error(json.erro || 'Falha ao enviar anexo.');

  limparAnexoSelecionado();
  $('messageInput').value = '';
  ajustarAlturaCampoResposta();
  await carregarMensagensENotas(conversaAtual.id, { force: true });
  await carregarConversas({ silencioso: true });
}

async function alternarGravacaoAudio() {
  if (!conversaAtual) return;

  if (gravandoAudio && mediaRecorder) {
    mediaRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Seu navegador não liberou gravação de áudio. Tente usar Chrome/Edge e permitir o microfone.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    const mimePreferido = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    mediaRecorder = new MediaRecorder(stream, { mimeType: mimePreferido });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      gravandoAudio = false;
      $('btnMic').classList.remove('recording');
      $('btnMic').textContent = '🎙️';
      $('btnMic').title = 'Gravar áudio';

      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const file = new File([blob], `audio-gravado-${Date.now()}.webm`, { type: blob.type });
      await mostrarPreviewArquivo(file);
      toast('Áudio gravado. Clique em Enviar para mandar ao cliente.');
    };

    gravandoAudio = true;
    $('btnMic').classList.add('recording');
    $('btnMic').textContent = '⏹️';
    $('btnMic').title = 'Parar gravação';
    mediaRecorder.start();
  } catch (erro) {
    alert('Não consegui acessar o microfone. Verifique a permissão do navegador.');
  }
}

async function enviarMensagem() {
  const textoDigitado = $('messageInput').value.trim();
  const texto = aplicarVariaveisMensagem(textoDigitado).trim();
  if (!conversaAtual) return;

  if (!texto && !arquivoSelecionado) return;

  $('btnSend').disabled = true;
  $('btnSend').textContent = arquivoSelecionado ? 'Enviando anexo...' : 'Enviando...';

  try {
    if (arquivoSelecionado) {
      await enviarAnexoSelecionado();
      return;
    }

    const resposta = await fetch(SEND_MESSAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversa_id: conversaAtual.id,
        usuario_id: usuarioAtual.id,
        texto: textoParaEnvio(texto),
        reply_to_message_id: mensagemRespondendo?.id || null,
        reply_to_evolution_message_id: mensagemRespondendo?.evolution_message_id || null,
        reply_to_preview: mensagemRespondendo ? resumoMensagemParaMenu(mensagemRespondendo, 180) : null,
        reply_to_nome: mensagemRespondendo ? (mensagemRespondendo.remetente_nome || mensagemRespondendo.remetente_tipo || 'Mensagem') : null
      })
    });

    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !json.ok) throw new Error(json.erro || 'Falha ao enviar mensagem.');

    $('messageInput').value = '';
    limparRespostaMensagem();
    ajustarAlturaCampoResposta();
    esconderMensagensRapidas();
    await carregarMensagensENotas(conversaAtual.id, { force: true });
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    alert(erro.message || 'Erro ao enviar mensagem/anexo.');
  } finally {
    $('btnSend').disabled = false;
    $('btnSend').textContent = 'Enviar';
    $('messageInput').focus();
  }
}

async function salvarStatusEtiqueta() {
  if (!conversaAtual) return;

  const novoStatus = $('chatStatusSelect').value || 'SEM_SETOR';
  const novaEtiqueta = $('chatEtiquetaSelect').value || null;

  $('btnSalvarStatusEtiqueta').disabled = true;
  $('btnSalvarStatusEtiqueta').textContent = 'Salvando...';

  try {
    const { error } = await db
      .from('conversas')
      .update({ status: novoStatus, etiqueta_id: novaEtiqueta })
      .eq('id', conversaAtual.id);

    if (error) throw error;

    toast('Status/etiqueta atualizados com sucesso.');
    await carregarConversas({ silencioso: true });
    conversaAtual = todasConversas.find((c) => c.id === conversaAtual.id) || conversaAtual;
    preencherPainelConversa({ limparCampos: false });
  } catch (erro) {
    toast(erro.message || 'Erro ao salvar status/etiqueta.', 'erro');
  } finally {
    $('btnSalvarStatusEtiqueta').disabled = false;
    $('btnSalvarStatusEtiqueta').textContent = 'Salvar status/etiqueta';
  }
}

function preencherAtendentesTransferencia() {
  const depId = $('transferDepartamentoSelect').value;
  if (!depId) {
    $('transferAtendenteSelect').innerHTML = '<option value="">Selecione primeiro o setor</option>';
    return;
  }

  const idsUsuariosDoSetor = usuarioDepartamentos
    .filter((ud) => ud.departamento_id === depId && ud.ativo !== false)
    .map((ud) => ud.usuario_id);

  let atendentes = usuarios.filter((u) => idsUsuariosDoSetor.includes(u.id));

  // Plano B: se ainda não existirem vínculos em usuario_departamentos, permite escolher qualquer ativo.
  if (!atendentes.length) atendentes = usuarios;

  $('transferAtendenteSelect').innerHTML = '<option value="">Selecione...</option>' +
    atendentes.map((u) => optionHtml(u.id, `${u.nome} — ${u.email}`)).join('');
}

async function transferirAtendimento() {
  if (!conversaAtual) return;

  const paraDepartamentoId = $('transferDepartamentoSelect').value;
  const paraAtendenteId = $('transferAtendenteSelect').value;
  const observacao = $('transferObsInput').value.trim();

  if (!paraDepartamentoId) {
    alert('Selecione o setor de destino.');
    return;
  }

  if (!paraAtendenteId) {
    alert('Selecione o atendente do setor.');
    return;
  }

  $('btnTransferir').disabled = true;
  $('btnTransferir').textContent = 'Transferindo...';

  try {
    const { error: erroTransfer } = await db.from('transferencias').insert({
      conversa_id: conversaAtual.id,
      de_departamento_id: conversaAtual.departamento_id || null,
      para_departamento_id: paraDepartamentoId,
      de_atendente_id: conversaAtual.atendente_id || null,
      para_atendente_id: paraAtendenteId,
      criado_por_usuario_id: usuarioAtual.id,
      observacao
    });

    if (erroTransfer) throw erroTransfer;

    const { error: erroConversa } = await db
      .from('conversas')
      .update({
        departamento_id: paraDepartamentoId,
        atendente_id: paraAtendenteId,
        status: 'EM_ATENDIMENTO'
      })
      .eq('id', conversaAtual.id);

    if (erroConversa) throw erroConversa;

    const depNome = departamentos.find((d) => d.id === paraDepartamentoId)?.nome || 'setor';
    const userNome = usuarios.find((u) => u.id === paraAtendenteId)?.nome || 'atendente';

    await db.from('notas_internas').insert({
      conversa_id: conversaAtual.id,
      usuario_id: usuarioAtual.id,
      nota: `Atendimento transferido para ${depNome} / ${userNome}.${observacao ? ' Obs.: ' + observacao : ''}`
    });

    toast('Atendimento transferido com sucesso.');
    await carregarConversas({ silencioso: true });
    conversaAtual = todasConversas.find((c) => c.id === conversaAtual.id) || conversaAtual;
    preencherPainelConversa({ limparCampos: false });
    await carregarMensagensENotas(conversaAtual.id, { force: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao transferir atendimento.', 'erro');
  } finally {
    $('btnTransferir').disabled = false;
    $('btnTransferir').textContent = 'Transferir';
  }
}

async function salvarNotaInterna() {
  if (!conversaAtual) return;
  const nota = $('notaInternaInput').value.trim();
  if (!nota) {
    alert('Digite a nota interna antes de salvar.');
    return;
  }

  $('btnSalvarNota').disabled = true;
  $('btnSalvarNota').textContent = 'Salvando...';

  try {
    const { error } = await db.from('notas_internas').insert({
      conversa_id: conversaAtual.id,
      usuario_id: usuarioAtual.id,
      nota
    });

    if (error) throw error;

    $('notaInternaInput').value = '';
    toast('Nota interna salva.');
    await carregarMensagensENotas(conversaAtual.id, { force: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao salvar nota interna.', 'erro');
  } finally {
    $('btnSalvarNota').disabled = false;
    $('btnSalvarNota').textContent = 'Salvar nota interna';
  }
}

function iniciarRealtime() {
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  if (pollingTimer) clearInterval(pollingTimer);

  realtimeChannel = db.channel('medplus-chat-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, async () => {
      await carregarConversas({ silencioso: true });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, async (payload) => {
      if (conversaAtual && (payload.new?.conversa_id === conversaAtual.id || payload.old?.conversa_id === conversaAtual.id)) {
        await carregarMensagensENotas(conversaAtual.id, { force: true });
      }
      await carregarConversas({ silencioso: true });

      if (payload.eventType === 'INSERT' && payload.new?.remetente_tipo === 'CLIENTE') {
        const c = todasConversas.find((item) => item.id === payload.new.conversa_id);
        const nome = c?.cliente?.nome || c?.cliente?.telefone || 'Cliente';
        const texto = payload.new.texto || c?.ultima_mensagem || 'Nova mensagem';
        const telaAtivaNaConversa = !document.hidden && conversaAtual?.id === payload.new.conversa_id;
        if (!telaAtivaNaConversa) {
          incrementarNaoLidas(payload.new.conversa_id);
          notificarEvento(`msg-${payload.new.id}`, 'Mensagem recebida', `${nome}: ${texto}`, payload.new.conversa_id, '📩');
        } else {
          limparNaoLidas(payload.new.conversa_id);
        }
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_internas' }, async (payload) => {
      if (conversaAtual && (payload.new?.conversa_id === conversaAtual.id || payload.old?.conversa_id === conversaAtual.id)) {
        await carregarMensagensENotas(conversaAtual.id, { force: true });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transferencias' }, async () => {
      await carregarConversas({ silencioso: true });
      if (conversaAtual) await carregarMensagensENotas(conversaAtual.id);
    })
    .subscribe((status) => {
      console.log('Realtime:', status);
      if (status === 'CHANNEL_ERROR') {
        console.warn('Realtime falhou. O sistema continuará atualizando por polling.');
      }
    });

  pollingTimer = setInterval(async () => {
    await carregarConversas({ silencioso: true });
    if (conversaAtual) {
      const aindaExiste = todasConversas.find((c) => c.id === conversaAtual.id);
      if (aindaExiste) {
        conversaAtual = aindaExiste;
        await carregarMensagensENotas(conversaAtual.id);
      }
    }
  }, 10000);
}


/* ==========================================================
   ETAPA 6.8.2 — FUNÇÕES ADMINISTRATIVAS SUPABASE
   ========================================================== */
function isAdmin() {
  return String(usuarioAtual?.perfil || '').toUpperCase() === 'ADMIN';
}

function exigirAdmin() {
  if (!isAdmin()) {
    toast('Ação permitida somente para administradores.', 'erro');
    return false;
  }
  return true;
}

function configurarPermissoesAdmin() {
  const admin = isAdmin();
  $('adminMenu')?.classList.toggle('hidden', !admin);
}

function abrirAdminModal(tab = 'usuarios') {
  if (!exigirAdmin()) return;
  const modal = $('adminModal');
  if (!modal) return;
  selecionarAdminTab(tab);
  if (!modal.open) modal.showModal();
  carregarAdminDados(tab);
}

function fecharAdminModal() {
  $('adminModal')?.close();
}

function selecionarAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.adminTab === tab);
  });
  document.querySelectorAll('.admin-section').forEach((sec) => sec.classList.remove('active'));
  const alvo = $('adminTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (alvo) alvo.classList.add('active');

  const titulos = {
    usuarios: 'Usuários / Atendentes',
    departamentos: 'Departamentos',
    etiquetas: 'Etiquetas',
    clientes: 'Clientes',
    rapidas: 'Mensagens rápidas',
    evolution: 'Configurar Evolution API'
  };
  $('adminModalSubtitle').textContent = titulos[tab] || 'Gerencie os dados do sistema';
}

async function carregarAdminDados(tabAtual = '') {
  if (!exigirAdmin()) return;
  await carregarDadosBase();
  renderizarFiltrosBase();
  renderizarChecksDepartamentosUsuario();

  if (!tabAtual || tabAtual === 'usuarios') renderizarTabelaUsuarios();
  if (!tabAtual || tabAtual === 'departamentos') renderizarTabelaDepartamentos();
  if (!tabAtual || tabAtual === 'etiquetas') renderizarTabelaEtiquetas();
  if (!tabAtual || tabAtual === 'clientes') await carregarClientesAdmin();
  if (!tabAtual || tabAtual === 'rapidas') renderizarTabelaMensagensRapidas();
  if (!tabAtual || tabAtual === 'evolution') await carregarConfigEvolution();
}

function renderizarChecksDepartamentosUsuario(selecionados = []) {
  const ids = new Set(selecionados || []);
  $('usuarioDepartamentosChecks').innerHTML = departamentos.map((d) => `
    <label>
      <input type="checkbox" class="usuario-dep-check" value="${escapeHtml(d.id)}" ${ids.has(d.id) ? 'checked' : ''}>
      ${escapeHtml(d.nome)}
    </label>
  `).join('') || '<span class="muted-small">Nenhum departamento ativo cadastrado.</span>';
}

function departamentosDoUsuario(usuarioId) {
  return usuarioDepartamentos
    .filter((ud) => ud.usuario_id === usuarioId && ud.ativo !== false)
    .map((ud) => ud.departamento_id);
}

function nomesDepartamentosDoUsuario(usuarioId) {
  const ids = new Set(departamentosDoUsuario(usuarioId));
  return departamentos.filter((d) => ids.has(d.id)).map((d) => d.nome).join(', ') || '—';
}

function idsSelecionados(prefixo) {
  return [...document.querySelectorAll(`.${prefixo}-check:checked`)].map((c) => c.value);
}

function toggleTodos(prefixo, checked) {
  document.querySelectorAll(`.${prefixo}-check`).forEach((c) => { c.checked = checked; });
}

function ativoBadge(ativo) {
  return ativo !== false
    ? '<span class="status-pill ok">Ativo</span>'
    : '<span class="status-pill off">Inativo</span>';
}

function filtrarPorBusca(lista, inputId, campos) {
  const termo = ($(inputId)?.value || '').trim().toLowerCase();
  if (!termo) return lista;
  return lista.filter((item) => campos(item).toLowerCase().includes(termo));
}

function renderizarTabelaUsuarios() {
  const lista = filtrarPorBusca(usuarios, 'usuarioBusca', (u) => `${u.nome} ${u.email} ${u.perfil} ${nomesDepartamentosDoUsuario(u.id)}`);
  $('usuariosTableBody').innerHTML = lista.map((u) => `
    <tr>
      <td><input type="checkbox" class="usuarios-check" value="${escapeHtml(u.id)}" ${u.email === 'admin@medplus.local' ? 'disabled title="Admin principal protegido"' : ''}></td>
      <td>${escapeHtml(u.nome)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.perfil)}</td>
      <td>${escapeHtml(nomesDepartamentosDoUsuario(u.id))}</td>
      <td>${ativoBadge(u.ativo)}</td>
      <td class="table-actions">
        <button type="button" class="table-icon-btn" data-edit-usuario="${escapeHtml(u.id)}">✏️</button>
        <button type="button" class="table-icon-btn" data-del-usuario="${escapeHtml(u.id)}" ${u.email === 'admin@medplus.local' ? 'disabled' : ''}>🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nenhum usuário encontrado.</td></tr>';

  document.querySelectorAll('[data-edit-usuario]').forEach((btn) => btn.addEventListener('click', () => editarUsuario(btn.dataset.editUsuario)));
  document.querySelectorAll('[data-del-usuario]').forEach((btn) => btn.addEventListener('click', () => excluirUsuarios([btn.dataset.delUsuario])));
}

function limparUsuarioForm() {
  $('usuarioId').value = '';
  $('usuarioNome').value = '';
  $('usuarioEmail').value = '';
  $('usuarioEmail').disabled = false;
  $('usuarioSenha').value = '';
  $('usuarioPerfil').value = 'ATENDENTE';
  $('usuarioAtivo').checked = true;
  renderizarChecksDepartamentosUsuario();
}

function editarUsuario(id) {
  const u = usuarios.find((item) => item.id === id);
  if (!u) return;
  $('usuarioId').value = u.id;
  $('usuarioNome').value = u.nome || '';
  $('usuarioEmail').value = u.email || '';
  $('usuarioEmail').disabled = u.email === 'admin@medplus.local';
  $('usuarioSenha').value = '';
  $('usuarioPerfil').value = u.perfil || 'ATENDENTE';
  $('usuarioAtivo').checked = u.ativo !== false;
  renderizarChecksDepartamentosUsuario(departamentosDoUsuario(id));
  $('usuarioNome').focus();
}

async function salvarUsuario(e) {
  e.preventDefault();
  if (!exigirAdmin()) return;

  const depIds = [...document.querySelectorAll('.usuario-dep-check:checked')].map((c) => c.value);
  const novo = !$('usuarioId').value;
  if (novo && !$('usuarioSenha').value.trim()) {
    const ok = confirm('Nenhuma senha foi digitada. Deseja criar esse usuário com a senha padrão 123456?');
    if (!ok) return;
  }

  $('btnSalvarUsuario').disabled = true;
  $('btnSalvarUsuario').textContent = 'Salvando...';

  try {
    const { data, error } = await db.rpc('app_admin_salvar_usuario', {
      p_admin_id: usuarioAtual.id,
      p_usuario_id: $('usuarioId').value || null,
      p_nome: $('usuarioNome').value.trim(),
      p_email: $('usuarioEmail').value.trim().toLowerCase(),
      p_senha: $('usuarioSenha').value.trim() || null,
      p_perfil: $('usuarioPerfil').value,
      p_ativo: $('usuarioAtivo').checked,
      p_departamento_ids: depIds
    });

    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.erro || 'Erro ao salvar usuário.');

    toast('Usuário salvo com sucesso.');
    limparUsuarioForm();
    await carregarAdminDados('usuarios');
  } catch (erro) {
    toast(erro.message || 'Erro ao salvar usuário.', 'erro');
  } finally {
    $('btnSalvarUsuario').disabled = false;
    $('btnSalvarUsuario').textContent = 'Salvar usuário';
  }
}

async function excluirUsuarios(ids) {
  if (!exigirAdmin()) return;
  const validos = (ids || []).filter(Boolean);
  if (!validos.length) return alert('Selecione pelo menos um usuário.');
  if (!confirm(`Deseja excluir/desativar ${validos.length} usuário(s) selecionado(s)?`)) return;

  try {
    const { data, error } = await db.rpc('app_admin_desativar_usuarios', {
      p_admin_id: usuarioAtual.id,
      p_ids: validos
    });
    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.erro || 'Erro ao excluir usuários.');
    toast('Usuário(s) desativado(s).');
    await carregarAdminDados('usuarios');
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao excluir usuários.', 'erro');
  }
}

function renderizarTabelaDepartamentos() {
  const listaCompleta = [...departamentos];
  const lista = filtrarPorBusca(listaCompleta, 'departamentoBusca', (d) => `${d.nome} ${d.descricao || ''}`);
  $('departamentosTableBody').innerHTML = lista.map((d) => `
    <tr>
      <td><input type="checkbox" class="departamentos-check" value="${escapeHtml(d.id)}"></td>
      <td>${escapeHtml(d.nome)}</td>
      <td>${escapeHtml(d.descricao || '')}</td>
      <td>${ativoBadge(d.ativo)}</td>
      <td class="table-actions">
        <button type="button" class="table-icon-btn" data-edit-dep="${escapeHtml(d.id)}">✏️</button>
        <button type="button" class="table-icon-btn" data-del-dep="${escapeHtml(d.id)}">🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">Nenhum departamento encontrado.</td></tr>';

  document.querySelectorAll('[data-edit-dep]').forEach((btn) => btn.addEventListener('click', () => editarDepartamento(btn.dataset.editDep)));
  document.querySelectorAll('[data-del-dep]').forEach((btn) => btn.addEventListener('click', () => excluirDepartamentos([btn.dataset.delDep])));
}

function limparDepartamentoForm() {
  $('departamentoId').value = '';
  $('departamentoNome').value = '';
  $('departamentoDescricao').value = '';
  $('departamentoAtivo').checked = true;
}

function editarDepartamento(id) {
  const d = departamentos.find((item) => item.id === id);
  if (!d) return;
  $('departamentoId').value = d.id;
  $('departamentoNome').value = d.nome || '';
  $('departamentoDescricao').value = d.descricao || '';
  $('departamentoAtivo').checked = d.ativo !== false;
  $('departamentoNome').focus();
}

async function salvarDepartamento(e) {
  e.preventDefault();
  if (!exigirAdmin()) return;
  const id = $('departamentoId').value;
  const payload = {
    nome: $('departamentoNome').value.trim(),
    descricao: $('departamentoDescricao').value.trim() || null,
    ativo: $('departamentoAtivo').checked
  };

  try {
    const res = id
      ? await db.from('departamentos').update(payload).eq('id', id)
      : await db.from('departamentos').insert(payload);
    if (res.error) throw res.error;
    toast('Departamento salvo.');
    limparDepartamentoForm();
    await carregarAdminDados('departamentos');
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao salvar departamento.', 'erro');
  }
}

async function excluirDepartamentos(ids) {
  if (!exigirAdmin()) return;
  const validos = (ids || []).filter(Boolean);
  if (!validos.length) return alert('Selecione pelo menos um departamento.');
  if (!confirm(`Deseja desativar ${validos.length} departamento(s)? Os atendimentos vinculados ficarão como Sem setor.`)) return;

  try {
    let res = await db.from('departamentos').update({ ativo: false }).in('id', validos);
    if (res.error) throw res.error;
    res = await db.from('conversas').update({ departamento_id: null, atendente_id: null, status: 'SEM_SETOR' }).in('departamento_id', validos);
    if (res.error) throw res.error;
    res = await db.from('usuario_departamentos').update({ ativo: false }).in('departamento_id', validos);
    if (res.error) console.warn(res.error.message);
    toast('Departamento(s) desativado(s).');
    await carregarAdminDados('departamentos');
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao excluir departamentos.', 'erro');
  }
}

function renderizarTabelaEtiquetas() {
  const listaCompleta = [...etiquetas];
  const lista = filtrarPorBusca(listaCompleta, 'etiquetaBusca', (e) => `${e.nome} ${e.cor || ''}`);
  $('etiquetasTableBody').innerHTML = lista.map((e) => `
    <tr>
      <td><input type="checkbox" class="etiquetas-check" value="${escapeHtml(e.id)}"></td>
      <td>${escapeHtml(e.nome)}</td>
      <td><span class="color-swatch"><span class="color-dot" style="background:${escapeHtml(e.cor || '#2086c2')}"></span>${escapeHtml(e.cor || '')}</span></td>
      <td>${ativoBadge(e.ativo)}</td>
      <td class="table-actions">
        <button type="button" class="table-icon-btn" data-edit-etiq="${escapeHtml(e.id)}">✏️</button>
        <button type="button" class="table-icon-btn" data-del-etiq="${escapeHtml(e.id)}">🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">Nenhuma etiqueta encontrada.</td></tr>';

  document.querySelectorAll('[data-edit-etiq]').forEach((btn) => btn.addEventListener('click', () => editarEtiqueta(btn.dataset.editEtiq)));
  document.querySelectorAll('[data-del-etiq]').forEach((btn) => btn.addEventListener('click', () => excluirEtiquetas([btn.dataset.delEtiq])));
}

function limparEtiquetaForm() {
  $('etiquetaId').value = '';
  $('etiquetaNome').value = '';
  $('etiquetaCor').value = '#2086c2';
  $('etiquetaAtivo').checked = true;
}

function editarEtiqueta(id) {
  const e = etiquetas.find((item) => item.id === id);
  if (!e) return;
  $('etiquetaId').value = e.id;
  $('etiquetaNome').value = e.nome || '';
  $('etiquetaCor').value = e.cor || '#2086c2';
  $('etiquetaAtivo').checked = e.ativo !== false;
  $('etiquetaNome').focus();
}

async function salvarEtiqueta(e) {
  e.preventDefault();
  if (!exigirAdmin()) return;
  const id = $('etiquetaId').value;
  const payload = {
    nome: $('etiquetaNome').value.trim(),
    cor: $('etiquetaCor').value || '#2086c2',
    ativo: $('etiquetaAtivo').checked
  };

  try {
    const res = id
      ? await db.from('etiquetas').update(payload).eq('id', id)
      : await db.from('etiquetas').insert(payload);
    if (res.error) throw res.error;
    toast('Etiqueta salva.');
    limparEtiquetaForm();
    await carregarAdminDados('etiquetas');
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao salvar etiqueta.', 'erro');
  }
}

async function excluirEtiquetas(ids) {
  if (!exigirAdmin()) return;
  const validos = (ids || []).filter(Boolean);
  if (!validos.length) return alert('Selecione pelo menos uma etiqueta.');
  if (!confirm(`Deseja desativar ${validos.length} etiqueta(s)? Elas serão removidas dos atendimentos vinculados.`)) return;

  try {
    let res = await db.from('etiquetas').update({ ativo: false }).in('id', validos);
    if (res.error) throw res.error;
    res = await db.from('conversas').update({ etiqueta_id: null }).in('etiqueta_id', validos);
    if (res.error) throw res.error;
    toast('Etiqueta(s) desativada(s).');
    await carregarAdminDados('etiquetas');
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao excluir etiquetas.', 'erro');
  }
}

async function carregarClientesAdmin() {
  if (!exigirAdmin()) return;
  const { data, error } = await db.from('clientes').select('*').order('criado_em', { ascending: false });
  if (error) {
    toast(error.message || 'Erro ao carregar clientes.', 'erro');
    return;
  }
  clientesAdmin = data || [];
  renderizarTabelaClientes();
}

function renderizarTabelaClientes() {
  const lista = filtrarPorBusca(clientesAdmin, 'clienteBusca', (c) => `${c.nome || ''} ${c.telefone || ''} ${c.tipo_cliente || ''}`);
  $('clientesTableBody').innerHTML = lista.map((c) => `
    <tr>
      <td><input type="checkbox" class="clientes-check" value="${escapeHtml(c.id)}"></td>
      <td>${avatarClienteHtml(c, 'mini')}</td>
      <td>${escapeHtml(c.nome || c.telefone || 'Sem nome')}</td>
      <td>${escapeHtml(c.telefone || '')}</td>
      <td>${escapeHtml(c.tipo_cliente || '—')}</td>
      <td>${ativoBadge(c.ativo)}</td>
      <td class="table-actions">
        <button type="button" class="table-icon-btn" title="Atualizar foto" data-foto-cli="${escapeHtml(c.id)}">🖼️</button>
        <button type="button" class="table-icon-btn" data-edit-cli="${escapeHtml(c.id)}">✏️</button>
        <button type="button" class="table-icon-btn" data-del-cli="${escapeHtml(c.id)}">🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nenhum cliente encontrado.</td></tr>';

  document.querySelectorAll('[data-edit-cli]').forEach((btn) => btn.addEventListener('click', () => editarCliente(btn.dataset.editCli)));
  document.querySelectorAll('[data-del-cli]').forEach((btn) => btn.addEventListener('click', () => excluirClientes([btn.dataset.delCli])));
  document.querySelectorAll('[data-foto-cli]').forEach((btn) => btn.addEventListener('click', () => sincronizarFotosClientes({ clienteId: btn.dataset.fotoCli, somenteSemFoto: false })));
}

async function sincronizarFotosClientes(opcoes = {}) {
  if (!exigirAdmin()) return;

  const btn = $('btnAtualizarFotosClientes');
  const textoOriginal = btn?.textContent || '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Atualizando fotos...';
    }

    const body = {
      instance: 'medplus',
      somenteSemFoto: opcoes.somenteSemFoto !== false,
      clienteId: opcoes.clienteId || ''
    };

    const res = await fetch(SYNC_PROFILE_PHOTOS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.erro || json.message || 'Erro ao atualizar fotos dos clientes.');
    }

    toast(`Fotos atualizadas: ${json.atualizados || 0}. Sem foto/erro: ${json.sem_foto || 0}.`);
    await carregarClientesAdmin();
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao atualizar fotos.', 'erro');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal || '🖼️ Atualizar fotos';
    }
  }
}

function limparClienteForm() {
  $('clienteId').value = '';
  $('clienteNome').value = '';
  $('clienteTelefone').value = '';
  $('clienteTelefone').disabled = false;
  $('clienteTipo').value = '';
  $('clienteFotoUrl').value = '';
  $('clienteAtivo').checked = true;
}

function editarCliente(id) {
  const c = clientesAdmin.find((item) => item.id === id);
  if (!c) return;
  $('clienteId').value = c.id;
  $('clienteNome').value = c.nome || '';
  $('clienteTelefone').value = c.telefone || '';
  $('clienteTelefone').disabled = false;
  $('clienteTipo').value = c.tipo_cliente || '';
  $('clienteFotoUrl').value = c.foto_url || '';
  $('clienteAtivo').checked = c.ativo !== false;
  $('clienteNome').focus();
}

async function salvarCliente(e) {
  e.preventDefault();
  if (!exigirAdmin()) return;
  const id = $('clienteId').value;
  const telefone = $('clienteTelefone').value.replace(/\D/g, '');
  if (!telefone) return alert('Informe o telefone do cliente.');

  const payload = {
    nome: $('clienteNome').value.trim() || telefone,
    telefone,
    tipo_cliente: $('clienteTipo').value || '',
    foto_url: $('clienteFotoUrl').value.trim() || null,
    ativo: $('clienteAtivo').checked
  };

  try {
    const res = id
      ? await db.from('clientes').update(payload).eq('id', id)
      : await db.from('clientes').insert(payload);
    if (res.error) throw res.error;
    toast('Cliente salvo.');
    limparClienteForm();
    await carregarClientesAdmin();
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao salvar cliente.', 'erro');
  }
}

async function excluirClientes(ids) {
  if (!exigirAdmin()) return;
  const validos = (ids || []).filter(Boolean);
  if (!validos.length) return alert('Selecione pelo menos um cliente.');
  if (!confirm(`ATENÇÃO: deseja excluir definitivamente ${validos.length} cliente(s) e tudo vinculado a eles?\n\nIsso removerá conversas, mensagens, notas internas e transferências.`)) return;

  try {
    const { error } = await db.from('clientes').delete().in('id', validos);
    if (error) throw error;
    toast('Cliente(s) excluído(s).');
    if (conversaAtual && validos.includes(conversaAtual.cliente_id)) {
      conversaAtual = null;
      $('chatControls').classList.add('hidden');
      $('chatStatusBadge').classList.add('hidden');
      $('chatTitle').textContent = 'Selecione uma conversa';
      $('chatSubtitle').textContent = 'Áudios, imagens e vídeos serão exibidos direto na conversa.';
      $('messagesBox').className = 'messages-box empty-state';
      $('messagesBox').innerHTML = '<div><h3>Nenhuma conversa selecionada</h3><p>Selecione outro atendimento.</p></div>';
      $('messageInput').disabled = true;
      $('btnSend').disabled = true;
      $('btnAttach').disabled = true;
      $('btnMic').disabled = true;
      if ($('btnEmoji')) $('btnEmoji').disabled = true;
      esconderEmojiPicker();
      limparAnexoSelecionado();
    }
    await carregarClientesAdmin();
    await carregarConversas({ silencioso: true });
  } catch (erro) {
    toast(erro.message || 'Erro ao excluir clientes.', 'erro');
  }
}



/* ==========================================================
   MENSAGENS RÁPIDAS — CADASTRO E USO COM /
   ========================================================== */
function normalizarAtalho(valor) {
  return String(valor || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function textoCurto(valor, limite = 90) {
  const txt = String(valor || '').replace(/\s+/g, ' ').trim();
  return txt.length > limite ? txt.slice(0, limite - 1) + '…' : txt;
}

function renderizarTabelaMensagensRapidas() {
  const busca = ($('rapidaBusca')?.value || '').toLowerCase().trim();
  let lista = [...mensagensRapidasAdmin];

  if (busca) {
    lista = lista.filter((r) => [r.titulo, r.atalho, r.texto]
      .join(' ')
      .toLowerCase()
      .includes(busca));
  }

  const body = $('rapidasTableBody');
  if (!body) return;

  if (mensagensRapidasErro) {
    body.innerHTML = `<tr><td colspan="7" class="admin-error-row">Erro ao carregar mensagens rápidas: ${escapeHtml(mensagensRapidasErro)}<br>Execute o SQL corrigido de mensagens rápidas e pressione CTRL + F5.</td></tr>`;
    return;
  }

  body.innerHTML = lista.map((r) => `
    <tr>
      <td><input type="checkbox" class="rapidas-check" value="${escapeHtml(r.id)}"></td>
      <td>${escapeHtml(r.titulo || 'Sem título')}</td>
      <td><strong>/${escapeHtml(r.atalho || '')}</strong></td>
      <td class="quick-text-cell">${escapeHtml(textoCurto(r.texto, 120))}</td>
      <td>${escapeHtml(r.ordem ?? 0)}</td>
      <td>${ativoBadge(r.ativo)}</td>
      <td class="table-actions">
        <button type="button" class="table-icon-btn" data-edit-rapida="${escapeHtml(r.id)}">✏️</button>
        <button type="button" class="table-icon-btn" data-del-rapida="${escapeHtml(r.id)}">🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nenhuma mensagem rápida cadastrada.</td></tr>';

  document.querySelectorAll('[data-edit-rapida]').forEach((btn) => btn.addEventListener('click', () => editarMensagemRapida(btn.dataset.editRapida)));
  document.querySelectorAll('[data-del-rapida]').forEach((btn) => btn.addEventListener('click', () => excluirMensagensRapidas([btn.dataset.delRapida])));
}

function limparMensagemRapidaForm() {
  $('rapidaId').value = '';
  $('rapidaTitulo').value = '';
  $('rapidaAtalho').value = '';
  $('rapidaOrdem').value = '0';
  $('rapidaTexto').value = '';
  $('rapidaAtiva').checked = true;
  $('rapidaAtalho').disabled = false;
}

function editarMensagemRapida(id) {
  const r = mensagensRapidasAdmin.find((item) => item.id === id);
  if (!r) return;
  $('rapidaId').value = r.id;
  $('rapidaTitulo').value = r.titulo || '';
  $('rapidaAtalho').value = r.atalho || '';
  $('rapidaOrdem').value = r.ordem ?? 0;
  $('rapidaTexto').value = r.texto || '';
  $('rapidaAtiva').checked = r.ativo !== false;
  $('rapidaTitulo').focus();
}

async function salvarMensagemRapida(e) {
  e.preventDefault();
  if (!exigirAdmin()) return;

  const id = $('rapidaId').value || null;
  const payload = {
    titulo: $('rapidaTitulo').value.trim(),
    atalho: normalizarAtalho($('rapidaAtalho').value),
    texto: $('rapidaTexto').value.replace(/\r\n/g, '\n').trim(),
    ordem: Number($('rapidaOrdem').value || 0),
    ativo: $('rapidaAtiva').checked
  };

  if (!payload.titulo) return alert('Informe o título da mensagem rápida.');
  if (!payload.atalho) return alert('Informe o atalho da mensagem rápida.');
  if (!payload.texto) return alert('Informe o texto da mensagem rápida.');

  try {
    const rpcRes = await db.rpc('app_salvar_mensagem_rapida', {
      p_id: id,
      p_titulo: payload.titulo,
      p_atalho: payload.atalho,
      p_texto: payload.texto,
      p_ordem: payload.ordem,
      p_ativo: payload.ativo
    });

    if (rpcRes.error) {
      // Fallback caso a função RPC ainda não exista.
      const tableRes = id
        ? await db.from('mensagens_rapidas').update(payload).eq('id', id)
        : await db.from('mensagens_rapidas').insert(payload);
      if (tableRes.error) throw tableRes.error;
    }

    await carregarMensagensRapidas(true);
    toast('Mensagem rápida salva.');
    limparMensagemRapidaForm();
    renderizarTabelaMensagensRapidas();
    esconderMensagensRapidas();
  } catch (erro) {
    const mensagem = erro?.code === '23505'
      ? 'Já existe uma mensagem rápida com esse atalho. Use outro atalho.'
      : (erro.message || 'Erro ao salvar mensagem rápida.');
    toast(mensagem, 'erro');
  }
}

async function excluirMensagensRapidas(ids) {
  if (!exigirAdmin()) return;
  const validos = (ids || []).filter(Boolean);
  if (!validos.length) return alert('Selecione pelo menos uma mensagem rápida.');
  if (!confirm(`Deseja desativar ${validos.length} mensagem(ns) rápida(s)?`)) return;

  try {
    const rpcRes = await db.rpc('app_desativar_mensagens_rapidas', { p_ids: validos });

    if (rpcRes.error) {
      // Fallback caso a função RPC ainda não exista.
      const { error } = await db.from('mensagens_rapidas').update({ ativo: false }).in('id', validos);
      if (error) throw error;
    }

    await carregarMensagensRapidas(true);
    toast('Mensagem(ns) rápida(s) desativada(s).');
    renderizarTabelaMensagensRapidas();
    esconderMensagensRapidas();
  } catch (erro) {
    toast(erro.message || 'Erro ao excluir mensagens rápidas.', 'erro');
  }
}

function contextoMensagemRapida() {
  const input = $('messageInput');
  if (!input) return null;

  const pos = input.selectionStart ?? input.value.length;
  const antes = input.value.slice(0, pos);
  const match = antes.match(/(^|\s)\/([^\s\/]*)$/);

  if (!match) return null;

  return {
    termo: match[2] || '',
    inicio: pos - (match[2] || '').length - 1,
    fim: pos
  };
}

function filtrarMensagensRapidas(termo) {
  const t = String(termo || '').toLowerCase().trim();
  let lista = mensagensRapidas.filter((r) => r.ativo !== false);

  if (t) {
    lista = lista.filter((r) => [r.atalho, r.titulo, r.texto]
      .join(' ')
      .toLowerCase()
      .includes(t));
  }

  return lista.slice(0, 12);
}

function renderizarMensagensRapidasDropdown() {
  const box = $('quickRepliesBox');
  const ctx = contextoMensagemRapida();

  if (!box || !ctx || !conversaAtual) {
    esconderMensagensRapidas();
    return;
  }

  quickReplyContext = ctx;

  if (!mensagensRapidas.length && !mensagensRapidasErro && !tentativaLazyRapidas) {
    tentativaLazyRapidas = true;
    carregarMensagensRapidas(false).then(() => {
      tentativaLazyRapidas = false;
      renderizarMensagensRapidasDropdown();
    });
  }

  const lista = filtrarMensagensRapidas(ctx.termo);
  quickReplyIndex = Math.max(0, Math.min(quickReplyIndex, Math.max(0, lista.length - 1)));

  if (mensagensRapidasErro) {
    box.innerHTML = `
      <div class="quick-replies-title"><span>Mensagens rápidas</span><span>Erro</span></div>
      <div class="quick-replies-empty">Não consegui carregar as mensagens rápidas. Execute o SQL corrigido e atualize com CTRL + F5.</div>
    `;
    box.classList.remove('hidden');
    return;
  }

  if (!lista.length) {
    box.innerHTML = `
      <div class="quick-replies-title"><span>Mensagens rápidas</span><span>Digite /</span></div>
      <div class="quick-replies-empty">Nenhuma mensagem rápida encontrada. Cadastre em Área Administrativa &gt; Mensagens rápidas.</div>
    `;
    box.classList.remove('hidden');
    return;
  }

  box.innerHTML = `
    <div class="quick-replies-title"><span>Mensagens rápidas</span><span>Enter para inserir</span></div>
    ${lista.map((r, index) => `
      <button type="button" class="quick-reply-item ${index === quickReplyIndex ? 'active' : ''}" data-quick-id="${escapeHtml(r.id)}">
        <span class="quick-reply-head">
          <span class="quick-reply-title">${escapeHtml(r.titulo || r.atalho)}</span>
          <span class="quick-reply-shortcut">/${escapeHtml(r.atalho || '')}</span>
        </span>
        <span class="quick-reply-preview">${escapeHtml(textoCurto(r.texto, 160))}</span>
      </button>
    `).join('')}
  `;
  box.classList.remove('hidden');

  box.querySelectorAll('[data-quick-id]').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      const item = mensagensRapidas.find((r) => r.id === btn.dataset.quickId);
      inserirMensagemRapida(item);
    });
  });
}

function esconderMensagensRapidas() {
  const box = $('quickRepliesBox');
  if (box) {
    box.classList.add('hidden');
    box.innerHTML = '';
  }
  quickReplyContext = null;
  quickReplyIndex = 0;
}

function inserirMensagemRapida(item) {
  if (!item) return;
  const input = $('messageInput');
  const ctx = quickReplyContext || contextoMensagemRapida();
  if (!input || !ctx) return;

  const antes = input.value.slice(0, ctx.inicio);
  const depois = input.value.slice(ctx.fim);
  const espacoAntes = antes && !/\s$/.test(antes) ? ' ' : '';
  const espacoDepois = depois && !/^\s/.test(depois) ? ' ' : '';
  const textoRapido = aplicarVariaveisMensagem(item.texto || '');
  const novoTexto = `${antes}${espacoAntes}${textoRapido}${espacoDepois}${depois}`;

  input.value = novoTexto;
  ajustarAlturaCampoResposta();
  esconderMensagensRapidas();
  input.focus();

  const pos = (antes + espacoAntes + textoRapido).length;
  input.setSelectionRange(pos, pos);
}

function moverSelecaoMensagemRapida(delta) {
  const ctx = contextoMensagemRapida();
  if (!ctx) return false;
  const lista = filtrarMensagensRapidas(ctx.termo);
  if (!lista.length) return false;
  quickReplyIndex = (quickReplyIndex + delta + lista.length) % lista.length;
  renderizarMensagensRapidasDropdown();
  return true;
}

function selecionarMensagemRapidaAtual() {
  const ctx = contextoMensagemRapida();
  if (!ctx) return false;
  const lista = filtrarMensagensRapidas(ctx.termo);
  const item = lista[quickReplyIndex] || lista[0];
  if (!item) return false;
  inserirMensagemRapida(item);
  return true;
}



/* ==========================================================
   EMOJIS — implementação segura, sem bloquear campos
   ========================================================== */
function emojisRecentes() {
  try {
    const lista = JSON.parse(localStorage.getItem('medplus_emojis_recentes') || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarEmojiRecente(emoji) {
  try {
    const lista = emojisRecentes().filter((e) => e !== emoji);
    lista.unshift(emoji);
    localStorage.setItem('medplus_emojis_recentes', JSON.stringify(lista.slice(0, 32)));
  } catch {}
}

function todosEmojisComTexto() {
  const mapa = new Map();
  EMOJI_CATEGORIAS.forEach((cat) => {
    if (cat.id === 'recentes') return;
    cat.emojis.forEach((emoji) => {
      const atual = mapa.get(emoji) || '';
      mapa.set(emoji, `${atual} ${cat.nome} ${cat.id}`.trim());
    });
  });
  return Array.from(mapa.entries()).map(([emoji, texto]) => ({ emoji, texto }));
}

function listaEmojisAtual() {
  const busca = String(emojiBuscaAtual || '').trim().toLowerCase();
  if (busca) {
    const termos = {
      ok: '✅', certo: '✅', erro: '❌', atencao: '⚠️', atenção: '⚠️', telefone: '☎️', dinheiro: '💰', documento: '📄', foto: '📷', carro: '🚗', hospital: '🏥', coracao: '❤️', coração: '❤️', obrigado: '🙏', legal: '👍'
    };
    const extra = termos[busca] ? [termos[busca]] : [];
    return [...new Set([
      ...extra,
      ...todosEmojisComTexto().filter((item) => item.texto.toLowerCase().includes(busca) || item.emoji.includes(busca)).map((item) => item.emoji)
    ])].slice(0, 120);
  }
  if (emojiCategoriaAtual === 'recentes') {
    const recentes = emojisRecentes();
    return recentes.length ? recentes : (EMOJI_CATEGORIAS.find((c) => c.id === 'favoritos')?.emojis || []);
  }
  return EMOJI_CATEGORIAS.find((c) => c.id === emojiCategoriaAtual)?.emojis || [];
}

function renderizarEmojiPicker() {
  const box = $('emojiPickerBox');
  if (!box) return;

  const emojis = listaEmojisAtual();
  box.innerHTML = `
    <div class="emoji-picker-header">
      <div class="emoji-picker-title">
        <span>Emojis</span>
        <button id="btnCloseEmojiPicker" type="button" title="Fechar emojis" aria-label="Fechar emojis">×</button>
      </div>
      <input id="emojiSearchInput" class="emoji-search" type="search" placeholder="Pesquisar emoji..." value="${escapeHtml(emojiBuscaAtual)}" />
      <div class="emoji-categories">
        ${EMOJI_CATEGORIAS.map((cat) => `
          <button type="button" class="emoji-category-btn ${cat.id === emojiCategoriaAtual ? 'active' : ''}" data-emoji-cat="${escapeHtml(cat.id)}" title="${escapeHtml(cat.nome)}" aria-label="${escapeHtml(cat.nome)}">${cat.icone}</button>
        `).join('')}
      </div>
    </div>
    <div class="emoji-grid">
      ${emojis.length ? emojis.map((emoji) => `<button type="button" class="emoji-btn" data-emoji="${escapeHtml(emoji)}" title="Inserir ${escapeHtml(emoji)}">${emoji}</button>`).join('') : '<div class="emoji-empty">Nenhum emoji encontrado.</div>'}
    </div>
  `;

  box.querySelector('#btnCloseEmojiPicker')?.addEventListener('click', esconderEmojiPicker);

  const busca = box.querySelector('#emojiSearchInput');
  busca?.addEventListener('input', (e) => {
    emojiBuscaAtual = e.target.value || '';
    const pos = e.target.selectionStart || emojiBuscaAtual.length;
    renderizarEmojiPicker();
    setTimeout(() => {
      const novo = $('emojiPickerBox')?.querySelector('#emojiSearchInput');
      if (novo) {
        novo.focus();
        novo.setSelectionRange(pos, pos);
      }
    }, 0);
  });

  box.querySelectorAll('[data-emoji-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      emojiCategoriaAtual = btn.dataset.emojiCat || 'recentes';
      emojiBuscaAtual = '';
      renderizarEmojiPicker();
    });
  });

  box.querySelectorAll('[data-emoji]').forEach((btn) => {
    btn.addEventListener('click', () => inserirEmojiNoCampoResposta(btn.dataset.emoji || btn.textContent || ''));
  });
}

function abrirEmojiPicker() {
  const box = $('emojiPickerBox');
  if (!box || $('messageInput')?.disabled) return;
  esconderMensagensRapidas();
  renderizarEmojiPicker();
  box.classList.remove('hidden');
}

function esconderEmojiPicker() {
  const box = $('emojiPickerBox');
  if (!box) return;
  box.classList.add('hidden');
}

function alternarEmojiPicker() {
  const box = $('emojiPickerBox');
  if (!box) return;
  if (box.classList.contains('hidden')) abrirEmojiPicker();
  else esconderEmojiPicker();
}

function inserirEmojiNoCampoResposta(emoji) {
  if (!emoji) return;
  const input = $('messageInput');
  if (!input || input.disabled) return;

  const inicio = input.selectionStart ?? input.value.length;
  const fim = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, inicio)}${emoji}${input.value.slice(fim)}`;

  const pos = inicio + emoji.length;
  input.focus();
  input.setSelectionRange(pos, pos);
  ajustarAlturaCampoResposta();
  salvarEmojiRecente(emoji);
  renderizarEmojiPicker();
}

function ajustarAlturaCampoResposta() {
  const input = $('messageInput');
  if (!input) return;
  input.style.height = 'auto';
  const altura = Math.min(input.scrollHeight, 128);
  input.style.height = Math.max(44, altura) + 'px';
}


/* ==========================================================
   CONFIGURAÇÃO EVOLUTION API — SUPABASE
   ========================================================== */
function limparUrlEvolution(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function webhookPadraoSupabase() {
  return `${SUPABASE_URL}/functions/v1/evolution-webhook`;
}

function renderizarEvolutionResultado(dados, tipo = 'info') {
  const el = $('evolutionResultado');
  if (!el) return;
  const texto = typeof dados === 'string' ? dados : JSON.stringify(dados, null, 2);
  el.textContent = texto;
  el.classList.remove('ok', 'erro', 'info');
  el.classList.add(tipo);
}

function normalizarQrSrc(valor) {
  const qr = String(valor || '').trim();
  if (!qr) return '';
  if (qr.startsWith('data:image')) return qr;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(qr) && qr.length > 200) {
    return `data:image/png;base64,${qr.replace(/\s/g, '')}`;
  }
  return '';
}

function renderizarEvolutionQr(resposta) {
  const box = $('evolutionQrBox');
  if (!box) return;
  const qrValor = resposta?.qrCode || resposta?.qrcode || resposta?.base64 || resposta?.data?.base64 || resposta?.data?.qrcode || '';
  const qrSrc = normalizarQrSrc(qrValor);
  const pairingCode = resposta?.pairingCode || resposta?.code || resposta?.data?.pairingCode || resposta?.data?.code || '';

  if (qrSrc) {
    box.innerHTML = `<img src="${escapeHtml(qrSrc)}" alt="QR Code WhatsApp" class="evolution-qr-img"><span>Escaneie com o WhatsApp do celular.</span>`;
    return;
  }

  if (pairingCode) {
    box.innerHTML = `<div class="pairing-code"><strong>Código de pareamento:</strong><code>${escapeHtml(pairingCode)}</code></div><span>Se o QR não aparecer, use o código de pareamento no WhatsApp, quando disponível.</span>`;
    return;
  }

  box.innerHTML = '<span>Não recebi QR Code na resposta. Veja o retorno ao lado.</span>';
}

async function chamarEvolutionManager(action, payload = {}) {
  if (!exigirAdmin()) throw new Error('Ação permitida somente para administradores.');
  const resposta = await fetch(EVOLUTION_MANAGER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLIC_KEY,
      'Authorization': `Bearer ${SUPABASE_PUBLIC_KEY}`
    },
    body: JSON.stringify({
      action,
      user_id: usuarioAtual?.id,
      payload
    })
  });

  const texto = await resposta.text();
  let json;
  try { json = JSON.parse(texto); } catch { json = { ok: false, erro: texto }; }
  if (!resposta.ok || json.ok === false) {
    const erro = json?.erro || json?.message || `Falha ${resposta.status}`;
    throw new Error(erro);
  }
  return json;
}

async function carregarConfigEvolution() {
  if (!exigirAdmin()) return;
  try {
    renderizarEvolutionResultado('Carregando configuração...', 'info');
    const json = await chamarEvolutionManager('getConfig');
    evolutionConfigCache = json.config || {};
    $('evolutionBaseUrl').value = evolutionConfigCache.base_url || '';
    $('evolutionInstanceName').value = evolutionConfigCache.instance_name || 'medplus';
    $('evolutionWebhookUrl').value = evolutionConfigCache.webhook_url || webhookPadraoSupabase();
    $('evolutionApiKey').value = '';
    $('evolutionKeyHelp').textContent = evolutionConfigCache.has_api_key
      ? 'API Key já salva. Deixe em branco para manter a atual.'
      : 'Nenhuma API Key salva. Cole a API Key completa da Evolution API.';
    renderizarEvolutionResultado({ ok: true, mensagem: 'Configuração carregada.', config: evolutionConfigCache }, 'ok');
  } catch (erro) {
    renderizarEvolutionResultado({ ok: false, erro: erro.message }, 'erro');
  }
}

function dadosEvolutionDoFormulario() {
  return {
    base_url: limparUrlEvolution($('evolutionBaseUrl')?.value),
    api_key: $('evolutionApiKey')?.value || '',
    instance_name: ($('evolutionInstanceName')?.value || 'medplus').trim(),
    webhook_url: ($('evolutionWebhookUrl')?.value || webhookPadraoSupabase()).trim()
  };
}

async function salvarEvolutionConfig(e) {
  e?.preventDefault?.();
  if (!exigirAdmin()) return;
  const payload = dadosEvolutionDoFormulario();
  if (!payload.base_url || !payload.instance_name || !payload.webhook_url) {
    toast('Preencha URL Base, Instância e Webhook.', 'erro');
    return;
  }
  try {
    renderizarEvolutionResultado('Salvando configuração...', 'info');
    const json = await chamarEvolutionManager('saveConfig', payload);
    $('evolutionApiKey').value = '';
    await carregarConfigEvolution();
    toast('Configuração da Evolution API salva.', 'sucesso');
    renderizarEvolutionResultado(json, 'ok');
  } catch (erro) {
    renderizarEvolutionResultado({ ok: false, erro: erro.message }, 'erro');
    toast(erro.message, 'erro');
  }
}

async function executarAcaoEvolution(action, textoCarregando, tipoSucesso = 'ok') {
  if (!exigirAdmin()) return;
  try {
    renderizarEvolutionResultado(textoCarregando, 'info');
    const json = await chamarEvolutionManager(action, dadosEvolutionDoFormulario());
    renderizarEvolutionResultado(json, tipoSucesso);
    if (action === 'generateQr') renderizarEvolutionQr(json);
    toast(json.mensagem || 'Ação executada.', 'sucesso');
  } catch (erro) {
    renderizarEvolutionResultado({ ok: false, erro: erro.message }, 'erro');
    toast(erro.message, 'erro');
  }
}

function configurarBotoesEvolution() {
  $('btnAdminEvolution')?.addEventListener('click', () => abrirAdminModal('evolution'));
  $('evolutionForm')?.addEventListener('submit', salvarEvolutionConfig);
  $('btnToggleEvolutionKey')?.addEventListener('click', () => {
    const input = $('evolutionApiKey');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  $('btnTestarEvolution')?.addEventListener('click', () => executarAcaoEvolution('testApi', 'Testando API...', 'ok'));
  $('btnCriarInstancia')?.addEventListener('click', () => executarAcaoEvolution('createInstance', 'Criando instância...', 'ok'));
  $('btnConfigurarWebhook')?.addEventListener('click', () => executarAcaoEvolution('setWebhook', 'Configurando webhook...', 'ok'));
  $('btnGerarQrCode')?.addEventListener('click', () => executarAcaoEvolution('generateQr', 'Gerando QR Code...', 'ok'));
  $('btnVerificarConexao')?.addEventListener('click', () => executarAcaoEvolution('connectionState', 'Verificando conexão...', 'ok'));
  $('btnDesconectarEvolution')?.addEventListener('click', () => {
    if (!confirm('Deseja desconectar a instância do WhatsApp?')) return;
    executarAcaoEvolution('logout', 'Desconectando instância...', 'ok');
  });
}

function configurarEventosAdmin() {
  $('btnAdminUsuarios')?.addEventListener('click', () => abrirAdminModal('usuarios'));
  $('btnAdminDepartamentos')?.addEventListener('click', () => abrirAdminModal('departamentos'));
  $('btnAdminEtiquetas')?.addEventListener('click', () => abrirAdminModal('etiquetas'));
  $('btnAdminClientes')?.addEventListener('click', () => abrirAdminModal('clientes'));
  $('btnAdminRapidas')?.addEventListener('click', async () => { await carregarMensagensRapidas(true); abrirAdminModal('rapidas'); });
  configurarBotoesEvolution();
  $('btnCloseAdminModal')?.addEventListener('click', fecharAdminModal);

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.adminTab;
      selecionarAdminTab(tab);
      await carregarAdminDados(tab);
    });
  });

  $('usuarioForm')?.addEventListener('submit', salvarUsuario);
  $('btnLimparUsuarioForm')?.addEventListener('click', limparUsuarioForm);
  $('usuarioBusca')?.addEventListener('input', renderizarTabelaUsuarios);
  $('chkUsuariosTodos')?.addEventListener('change', (e) => toggleTodos('usuarios', e.target.checked));
  $('btnExcluirUsuariosSelecionados')?.addEventListener('click', () => excluirUsuarios(idsSelecionados('usuarios')));

  $('departamentoForm')?.addEventListener('submit', salvarDepartamento);
  $('btnLimparDepartamentoForm')?.addEventListener('click', limparDepartamentoForm);
  $('departamentoBusca')?.addEventListener('input', renderizarTabelaDepartamentos);
  $('chkDepartamentosTodos')?.addEventListener('change', (e) => toggleTodos('departamentos', e.target.checked));
  $('btnExcluirDepartamentosSelecionados')?.addEventListener('click', () => excluirDepartamentos(idsSelecionados('departamentos')));

  $('etiquetaForm')?.addEventListener('submit', salvarEtiqueta);
  $('btnLimparEtiquetaForm')?.addEventListener('click', limparEtiquetaForm);
  $('etiquetaBusca')?.addEventListener('input', renderizarTabelaEtiquetas);
  $('chkEtiquetasTodas')?.addEventListener('change', (e) => toggleTodos('etiquetas', e.target.checked));
  $('btnExcluirEtiquetasSelecionadas')?.addEventListener('click', () => excluirEtiquetas(idsSelecionados('etiquetas')));

  $('clienteForm')?.addEventListener('submit', salvarCliente);
  $('btnLimparClienteForm')?.addEventListener('click', limparClienteForm);
  $('clienteBusca')?.addEventListener('input', renderizarTabelaClientes);
  $('chkClientesTodos')?.addEventListener('change', (e) => toggleTodos('clientes', e.target.checked));
  $('btnExcluirClientesSelecionados')?.addEventListener('click', () => excluirClientes(idsSelecionados('clientes')));
  $('btnAtualizarFotosClientes')?.addEventListener('click', () => sincronizarFotosClientes({ somenteSemFoto: true }));

  $('rapidaForm')?.addEventListener('submit', salvarMensagemRapida);
  $('rapidaTexto')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.stopPropagation();
  });
  $('rapidaTexto')?.addEventListener('paste', (e) => e.stopPropagation());
  $('btnLimparRapidaForm')?.addEventListener('click', limparMensagemRapidaForm);
  $('rapidaBusca')?.addEventListener('input', renderizarTabelaMensagensRapidas);
  $('chkRapidasTodas')?.addEventListener('change', (e) => toggleTodos('rapidas', e.target.checked));
  $('btnExcluirRapidasSelecionadas')?.addEventListener('click', () => excluirMensagensRapidas(idsSelecionados('rapidas')));
}

function configurarEventos() {
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    login($('loginEmail').value.trim(), $('loginSenha').value.trim());
  });

  $('btnLogout').addEventListener('click', sair);
  $('btnMobileBack')?.addEventListener('click', () => {
    $('appScreen')?.classList.remove('mobile-chat-open');
  });
  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 760px)').matches) {
      $('appScreen')?.classList.remove('mobile-chat-open');
    }
  });
  $('btnReload').addEventListener('click', async () => { await carregarDadosBase(); renderizarFiltrosBase(); await carregarConversas({ silencioso: false }); });

  $('btnToggleFilters').addEventListener('click', alternarFiltros);
  configurarAcordeonsResponsivos();
  configurarMenuDeMensagens();

  ['searchInput', 'statusFilter', 'departamentoFilter', 'atendenteFilter', 'etiquetaFilter', 'dateFilter', 'dateFrom', 'dateTo'].forEach((id) => {
    $(id).addEventListener(id === 'searchInput' ? 'input' : 'change', () => {
      if (id === 'dateFilter') atualizarCamposPeriodo();
      renderizarConversas();
    });
  });

  $('btnAttach').addEventListener('click', () => $('mediaInput').click());
  $('mediaInput').addEventListener('change', (e) => mostrarPreviewArquivo(e.target.files?.[0]));
  $('btnClearMedia').addEventListener('click', limparAnexoSelecionado);
  $('btnMic').addEventListener('click', alternarGravacaoAudio);
  $('btnEmoji')?.addEventListener('click', (e) => { e.stopPropagation(); alternarEmojiPicker(); });

  $('btnSend').addEventListener('click', enviarMensagem);
  $('messageInput').addEventListener('input', () => {
    ajustarAlturaCampoResposta();
    quickReplyIndex = 0;
    renderizarMensagensRapidasDropdown();
    if (contextoMensagemRapida()) esconderEmojiPicker();
  });

  $('messageInput').addEventListener('blur', () => {
    setTimeout(esconderMensagensRapidas, 160);
  });

  $('messageInput').addEventListener('keydown', (e) => {
    const quickAberto = !$('quickRepliesBox')?.classList.contains('hidden');
    const emojiAberto = !$('emojiPickerBox')?.classList.contains('hidden');

    if (emojiAberto && e.key === 'Escape') {
      e.preventDefault();
      esconderEmojiPicker();
      return;
    }

    if (quickAberto && e.key === 'ArrowDown') {
      e.preventDefault();
      moverSelecaoMensagemRapida(1);
      return;
    }

    if (quickAberto && e.key === 'ArrowUp') {
      e.preventDefault();
      moverSelecaoMensagemRapida(-1);
      return;
    }

    if (quickAberto && ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab')) {
      e.preventDefault();
      if (selecionarMensagemRapidaAtual()) return;
    }

    if (quickAberto && e.key === 'Escape') {
      e.preventDefault();
      esconderMensagensRapidas();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  });

  $('btnSalvarStatusEtiqueta').addEventListener('click', salvarStatusEtiqueta);
  $('transferDepartamentoSelect').addEventListener('change', preencherAtendentesTransferencia);
  $('btnTransferir').addEventListener('click', transferirAtendimento);
  $('btnSalvarNota').addEventListener('click', salvarNotaInterna);
  configurarEventosAdmin();
}


window.addEventListener('DOMContentLoaded', () => {
  configurarEventos();
  if (!iniciarSupabase()) return;

  const salvo = lerSessao();
  if (salvo) {
    usuarioAtual = salvo;
    abrirSistema();
  }
});

//PRELOADER
// Remove o Preloader após o carregamento completo da página
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');

    // Pequeno delay para garantir que a renderização foi concluída
    setTimeout(() => {
        preloader.classList.add('loaded');
    }, 1000);
});