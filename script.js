
const STORAGE_KEY = 'PDV_V10_FINAL_OK';
const DEFAULT_DB = {
  "config": {
    "nomeSistema": "PDV ToolDock",
    "empresa": "ToolDock Demo",
    "nomeFantasia": "ToolDock",
    "cnpj": "",
    "telefone": "(11) 4000-9000",
    "cidade": "São Paulo",
    "endereco": "Rua Exemplo, 100",
    "corSistema": "#123f7a",
    "mensagemCupom": "Obrigado pela preferência!"
  },
  "produtos": [
    {
      "id": 1,
      "codigo": "1001",
      "nome": "Coca-Cola 2L",
      "preco": 9.99,
      "custo": 6.2,
      "estoque": 24,
      "estoque_minimo": 6
    },
    {
      "id": 2,
      "codigo": "1002",
      "nome": "Arroz Tipo 1 5kg",
      "preco": 24.9,
      "custo": 19.3,
      "estoque": 12,
      "estoque_minimo": 4
    },
    {
      "id": 3,
      "codigo": "1003",
      "nome": "Feijão Carioca 1kg",
      "preco": 8.5,
      "custo": 6.1,
      "estoque": 18,
      "estoque_minimo": 5
    },
    {
      "id": 4,
      "codigo": "1004",
      "nome": "Pizza Calabresa Grande",
      "preco": 49.9,
      "custo": 26.5,
      "estoque": 8,
      "estoque_minimo": 2
    },
    {
      "id": 5,
      "codigo": "1005",
      "nome": "Leite Integral 1L",
      "preco": 5.89,
      "custo": 4.1,
      "estoque": 30,
      "estoque_minimo": 8
    },
    {
      "id": 6,
      "codigo": "1006",
      "nome": "Chocolate Premium 90g",
      "preco": 12.5,
      "custo": 8.0,
      "estoque": 4,
      "estoque_minimo": 5
    }
  ],
  "clientes": [
    {
      "id": 1,
      "nome": "Mariana Silva",
      "telefone": "(11) 99800-1111",
      "endereco": "Rua das Flores, 120",
      "observacao": ""
    },
    {
      "id": 2,
      "nome": "Carlos Andrade",
      "telefone": "(11) 99700-2020",
      "endereco": "Av. Central, 455",
      "observacao": "Cliente frequente"
    }
  ],
  "pedidos": [],
  "caixa": {
    "aberto": false,
    "valorInicial": 0,
    "totalVendas": 0,
    "totalDinheiro": 0,
    "totalPix": 0,
    "totalCartao": 0,
    "movimentos": [],
    "ultimoNumeroPedido": 0
  },
  "usuarios": [
    {
      "id": 1,
      "usuario": "admin",
      "senha": "123",
      "tipo": "admin"
    },
    {
      "id": 2,
      "usuario": "operador",
      "senha": "123",
      "tipo": "operador"
    }
  ],
  "logs": []
};

let db = null;
let user = null;
let sale = {
  items: [],
  payment: 'Dinheiro',
  customer: null,
  suggestions: [],
  sel: -1,
  recent: null
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(v || 0));
const clone = o => JSON.parse(JSON.stringify(o));
const nextId = arr => Math.max(0, ...arr.map(x => Number(x.id || 0))) + 1;
const nowBR = () => new Date().toLocaleString('pt-BR');
const todayBR = () => new Date().toLocaleDateString('pt-BR');

const SESSION_USER_KEY = 'PDV_V10_CURRENT_USER';

function persistSessionUser(){
  if(user){ sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify({usuario:user.usuario, tipo:user.tipo})); }
}
function clearSessionUser(){
  sessionStorage.removeItem(SESSION_USER_KEY);
}
function tryRestoreSessionUser(){
  try{
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if(!raw) return false;
    const sess = JSON.parse(raw);
    const found = db.usuarios.find(u => u.usuario === sess.usuario && u.tipo === sess.tipo);
    if(found){ user = found; return true; }
  }catch(e){}
  return false;
}

function repairCashState(){
  if(!db.caixa) return;
  db.caixa.aberto = Boolean(db.caixa.aberto);
  db.caixa.valorInicial = Number(db.caixa.valorInicial || 0);
  db.caixa.totalVendas = Number(db.caixa.totalVendas || 0);
  db.caixa.totalDinheiro = Number(db.caixa.totalDinheiro || 0);
  db.caixa.totalPix = Number(db.caixa.totalPix || 0);
  db.caixa.totalCartao = Number(db.caixa.totalCartao || 0);
  if(!Array.isArray(db.caixa.movimentos)) db.caixa.movimentos = [];
  db.caixa.ultimoNumeroPedido = Number(db.caixa.ultimoNumeroPedido || 0);
  db.caixa.usuarioAbertura = db.caixa.usuarioAbertura || '';
  db.caixa.dataAbertura = db.caixa.dataAbertura || '';
}


function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

async function loadDb() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    db = JSON.parse(cached);
    return;
  }
  try {
    const r = await fetch('banco.json');
    if (!r.ok) throw new Error('fetch failed');
    db = await r.json();
  } catch (e) {
    db = clone(DEFAULT_DB);
  }
  repairCashState();
  saveDb();
}

function addLog(tipo, dados = {}) {
  db.logs.push({
    id: nextId(db.logs),
    tipo,
    data: nowBR(),
    usuario: user?.usuario || 'sistema',
    ...dados
  });
  saveDb();
}

function applyConfig() {
  document.documentElement.style.setProperty('--primary', db.config.corSistema || '#123f7a');
  document.documentElement.style.setProperty('--primary2', db.config.corSistema || '#1d64bf');
  document.title = db.config.nomeSistema || 'PDV';
  $('#brandName').textContent = db.config.nomeSistema || 'PDV';
  $('#brandCompany').textContent = db.config.empresa || 'Empresa';
}

function applyRole() {
  $('#whoUser').textContent = 'Usuário: ' + (user?.usuario || '-');
  $('#whoRole').textContent = 'Perfil: ' + (user?.tipo || '-');
  $$('.admin-only').forEach(el => el.classList.toggle('hidden', user?.tipo !== 'admin'));
}

function showTab(tab) {
  $$('.nav[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
  const titles = {
    vendas: ['Vendas', 'Operação rápida com teclado e scanner'],
    produtos: ['Produtos', 'Cadastro e estoque'],
    clientes: ['Clientes', 'Cadastro'],
    historico: ['Histórico', 'Consulta, cancelamento e relatórios'],
    caixa: ['Caixa', 'Abertura, movimentos e fechamento'],
    config: ['Configurações', 'Empresa e aparência'],
    usuarios: ['Usuários', 'Controle básico de acesso']
  };
  $('#title').textContent = titles[tab][0];
  $('#subtitle').textContent = titles[tab][1];
  if (tab === 'produtos') renderProducts();
  if (tab === 'clientes') renderCustomers();
  if (window.innerWidth <= 1020) closeSidebar();
}

function authLogin(usuario, senha) {
  const found = db.usuarios.find(u => u.usuario === usuario && u.senha === senha);
  if (!found) return false;
  user = found;
  persistSessionUser();
  return true;
}

function openSidebar() {
  const sidebar = $('#sidebar');
  if (!sidebar) return;
  sidebar.classList.add('open');
}
function closeSidebar() {
  const sidebar = $('#sidebar');
  if (!sidebar) return;
  sidebar.classList.remove('open');
}
function toggleSidebar() {
  const sidebar = $('#sidebar');
  if (!sidebar) return;
  if (window.innerWidth <= 1020) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

function subtotal() {
  return sale.items.reduce((acc, item) => acc + Number(item.total || 0), 0);
}
function total() {
  return subtotal() - Number($('#discount').value || 0) + Number($('#extra').value || 0);
}
function changeValue() {
  return Number($('#received').value || 0) - total();
}

function expectedCash() {
  const suprimento = db.caixa.movimentos
    .filter(m => m.tipo === 'suprimento')
    .reduce((a, m) => a + Number(m.valor || 0), 0);

  const sangria = db.caixa.movimentos
    .filter(m => m.tipo === 'sangria')
    .reduce((a, m) => a + Number(m.valor || 0), 0);

  return Number(db.caixa.valorInicial || 0) + Number(db.caixa.totalDinheiro || 0) + suprimento - sangria;
}

function isCashOpenForCurrentUser() {
  return Boolean(db.caixa.aberto && db.caixa.usuarioAbertura && user && db.caixa.usuarioAbertura === user.usuario);
}

function guardCashForSale() {
  if (!db.caixa.aberto) {
    alert('Abra o caixa antes de lançar vendas.');
    showTab('caixa');
    return false;
  }
  if (db.caixa.usuarioAbertura && user && db.caixa.usuarioAbertura !== user.usuario) {
    alert('O caixa aberto pertence ao usuário ' + db.caixa.usuarioAbertura + '. Entre com este usuário ou feche o caixa atual.');
    showTab('caixa');
    return false;
  }
  return true;
}

function nextOrder() {
  db.caixa.ultimoNumeroPedido = Number(db.caixa.ultimoNumeroPedido || 0) + 1;
  saveDb();
  return String(db.caixa.ultimoNumeroPedido).padStart(6, '0');
}

function searchProducts(term) {
  const v = term.trim().toLowerCase();
  if (!v) return [];
  return db.produtos
    .map(p => {
      const n = p.nome.toLowerCase();
      const c = String(p.codigo).toLowerCase();
      let s = 0;
      if (c === v) s += 200;
      if (n === v) s += 150;
      if (c.startsWith(v)) s += 120;
      if (n.startsWith(v)) s += 90;
      if (c.includes(v)) s += 60;
      if (n.includes(v)) s += 45;
      return { p, s };
    })
    .filter(x => x.s > 0)
    .sort((a,b) => b.s - a.s || a.p.nome.localeCompare(b.p.nome))
    .slice(0, 8)
    .map(x => x.p);
}

function renderSuggestions() {
  const wrap = $('#suggestions');
  wrap.innerHTML = '';
  if (!sale.suggestions.length) {
    wrap.classList.add('hidden');
    return;
  }
  sale.suggestions.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = i === sale.sel ? 'active' : '';
    div.innerHTML = '<div><strong>' + p.nome + '</strong><div class="muted">Código: ' + p.codigo + ' • Estoque: ' + Number(p.estoque).toLocaleString('pt-BR') + '</div></div><div><strong>' + money(p.preco) + '</strong></div>';
    div.addEventListener('mousedown', e => {
      e.preventDefault();
      addSaleProduct(p);
    });
    wrap.appendChild(div);
  });
  wrap.classList.remove('hidden');
}

function renderSaleCustomer() {
  const nome = sale.customer ? sale.customer.nome : 'Consumidor Final';
  $('#saleClient').textContent = nome;
}

function resetSale() {
  sale = { items: [], payment: 'Dinheiro', customer: null, suggestions: [], sel: -1, recent: null };
  $('#search').value = '';
  $('#qty').value = '1';
  $('#price').value = '';
  $('#discount').value = '0';
  $('#extra').value = '0';
  $('#received').value = '0';
  $('#notes').value = '';
  $('#suggestions').classList.add('hidden');
  renderSale();
  setTimeout(() => $('#search').focus(), 0);
}

function addSaleProduct(prod) {
  if (!guardCashForSale()) return;
  const qty = Number($('#qty').value || 1);
  const unit = $('#price').value !== '' ? Number($('#price').value) : Number(prod.preco || 0);
  if (qty <= 0 || unit < 0) {
    alert('Quantidade ou valor inválido.');
    return;
  }
  if (Number(prod.estoque || 0) <= 0) {
    alert('Produto sem estoque.');
    return;
  }
  const existing = sale.items.find(i => i.produtoId === prod.id && Number(i.unitario) === unit);
  const q = existing ? Number(existing.quantidade) + qty : qty;
  if (q > Number(prod.estoque || 0)) {
    alert('Quantidade maior que o estoque disponível.');
    return;
  }
  if (existing) {
    existing.quantidade = Number(q.toFixed(3));
    existing.total = Number((existing.quantidade * existing.unitario).toFixed(2));
  } else {
    const rk = Date.now() + '_' + prod.id;
    sale.items.push({
      rowKey: rk,
      produtoId: prod.id,
      codigo: prod.codigo,
      produto: prod.nome,
      quantidade: qty,
      unitario: unit,
      total: Number((qty * unit).toFixed(2))
    });
    sale.recent = rk;
  }
  $('#search').value = '';
  $('#qty').value = '1';
  $('#price').value = '';
  sale.suggestions = [];
  sale.sel = -1;
  $('#suggestions').classList.add('hidden');
  renderSale();
  setTimeout(() => $('#search').focus(), 0);
}

function addSelectedOrFirst() {
  const term = $('#search').value.trim();
  if (!term) return;
  const list = sale.suggestions.length ? sale.suggestions : searchProducts(term);
  const p = sale.sel >= 0 ? list[sale.sel] : list[0];
  if (p) addSaleProduct(p);
}

function renderSale() {
  const tb = $('#saleRows');
  tb.innerHTML = '';
  if (!sale.items.length) {
    tb.innerHTML = '<tr><td colspan="5">Nenhum item lançado.</td></tr>';
  } else {
    sale.items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      if (it.rowKey === sale.recent) tr.classList.add('recent');
      tr.innerHTML =
        '<td><strong>' + it.produto + '</strong><div class="muted">Código: ' + it.codigo + '</div></td>' +
        '<td><input class="line" type="number" min="0.001" step="0.001" value="' + it.quantidade + '" data-q="' + idx + '"></td>' +
        '<td><input class="line" type="number" min="0" step="0.01" value="' + it.unitario + '" data-p="' + idx + '"></td>' +
        '<td><strong>' + money(it.total) + '</strong></td>' +
        '<td><button class="danger" data-r="' + idx + '">Remover</button></td>';
      tr.addEventListener('dblclick', () => removeSaleItem(idx));
      tb.appendChild(tr);
    });
    tb.querySelectorAll('[data-q]').forEach(i => i.addEventListener('change', () => updateSaleItem(Number(i.dataset.q), 'quantidade', Number(i.value))));
    tb.querySelectorAll('[data-p]').forEach(i => i.addEventListener('change', () => updateSaleItem(Number(i.dataset.p), 'unitario', Number(i.value))));
    tb.querySelectorAll('[data-r]').forEach(i => i.addEventListener('click', () => removeSaleItem(Number(i.dataset.r))));
  }
  $('#salePay').textContent = sale.payment;
  $('#saleCash').textContent = db?.caixa?.aberto ? ('Aberto - ' + (db.caixa.usuarioAbertura || '-')) : 'Fechado';
  $('#saleClient').textContent = sale.customer ? sale.customer.nome : 'Consumidor Final';
  $('#subtotal').textContent = money(subtotal());
  $('#total').textContent = money(total());
  $('#change').textContent = money(Math.max(0, changeValue()));
  $$('.pay').forEach(b => b.classList.toggle('active', b.dataset.pay === sale.payment));
  const canSell = isCashOpenForCurrentUser();
  ['#search','#qty','#price','#addBtn','#finishSale'].forEach(sel => { const el = $(sel); if (el) el.disabled = !canSell; });
  const notes = $('#notes'); if (notes) notes.disabled = !canSell;
}

function updateSaleItem(idx, field, val) {
  const item = sale.items[idx];
  if (!item) return;
  const p = db.produtos.find(x => x.id === item.produtoId);
  if (!p) return;
  if (field === 'quantidade' && val > Number(p.estoque || 0)) {
    alert('Quantidade maior que o estoque disponível.');
    renderSale();
    return;
  }
  item[field] = val;
  item.total = Number((Number(item.quantidade) * Number(item.unitario)).toFixed(2));
  renderSale();
}

function removeSaleItem(idx) {
  const item = sale.items[idx];
  if (!item) return;
  if (!confirm('Remover "' + item.produto + '" da venda?')) return;
  sale.items.splice(idx, 1);
  renderSale();
}

function cancelCurrentSale() {
  if (!sale.items.length && !sale.customer && Number($('#discount').value || 0) === 0 && Number($('#extra').value || 0) === 0 && !($('#notes').value || '').trim()) {
    resetSale();
    return;
  }
  if (!confirm('Cancelar a venda atual e limpar os itens lançados?')) return;
  resetSale();
}

function finalizeSale() {
  if (!guardCashForSale()) return;
  if (!sale.items.length) {
    alert('Adicione itens antes de finalizar.');
    return;
  }
  const order = {
    id: nextId(db.pedidos),
    numero: nextOrder(),
    status: 'finalizado',
    cliente: sale.customer ? clone(sale.customer) : null,
    itens: clone(sale.items),
    subtotal: subtotal(),
    desconto: Number($('#discount').value || 0),
    acrescimo: Number($('#extra').value || 0),
    total: total(),
    pagamento: sale.payment,
    recebido: Number($('#received').value || 0),
    troco: changeValue(),
    observacoes: $('#notes').value.trim(),
    operador: user.usuario,
    data: nowBR()
  };

  order.itens.forEach(it => {
    const p = db.produtos.find(x => x.id === it.produtoId);
    if (p) p.estoque = Number((Number(p.estoque) - Number(it.quantidade)).toFixed(3));
  });

  db.pedidos.push(order);
  db.caixa.totalVendas += Number(order.total || 0);
  if (order.pagamento === 'Dinheiro') db.caixa.totalDinheiro += Number(order.total || 0);
  if (order.pagamento === 'PIX') db.caixa.totalPix += Number(order.total || 0);
  if (order.pagamento === 'Cartão') db.caixa.totalCartao += Number(order.total || 0);
  db.caixa.movimentos.push({
    data: nowBR(),
    tipo: 'venda',
    valor: Number(order.total || 0),
    descricao: 'Pedido ' + order.numero + ' - ' + order.pagamento
  });
  saveDb();
  addLog('venda_finalizada', { pedido: order.numero, total: order.total });
  renderPrint(order, 'a4');
  alert('Venda finalizada com sucesso.\nPedido ' + order.numero);
  resetSale();
  renderAll();
}

function renderProducts() {
  const tb = $('#productRows');
  if (!tb) return;
  const s = ($('#productSearch').value || '').trim().toLowerCase();
  tb.innerHTML = '';
  const items = db.produtos
    .filter(p => !s || p.nome.toLowerCase().includes(s) || String(p.codigo).toLowerCase().includes(s))
    .sort((a,b) => a.nome.localeCompare(b.nome));

  if (!items.length) {
    tb.innerHTML = '<tr><td colspan="8">Nenhum produto cadastrado.</td></tr>';
    return;
  }

  items.forEach(p => {
    const low = Number(p.estoque) <= Number(p.estoque_minimo);
    const tr = document.createElement('tr');
    if (low) tr.classList.add('low-stock');
    tr.innerHTML =
      '<td>' + p.codigo + '</td>' +
      '<td><strong>' + p.nome + '</strong></td>' +
      '<td>' + money(p.preco) + '</td>' +
      '<td>' + money(p.custo || 0) + '</td>' +
      '<td>' + Number(p.estoque).toLocaleString('pt-BR') + '</td>' +
      '<td>' + Number(p.estoque_minimo).toLocaleString('pt-BR') + '</td>' +
      '<td>' + (low ? 'Estoque baixo' : 'OK') + '</td>' +
      '<td><div class="inline"><button class="ghost" data-e="' + p.id + '">Editar</button><button class="danger" data-d="' + p.id + '">Excluir</button></div></td>';
    tb.appendChild(tr);
  });

  tb.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => loadProduct(Number(b.dataset.e))));
  tb.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => deleteProduct(Number(b.dataset.d))));
}

function nextProductCode() {
  const nums = db.produtos
    .map(p => parseInt(String(p.codigo || '').replace(/\D/g,''), 10))
    .filter(n => !isNaN(n));
  return String((nums.length ? Math.max(...nums) : 1000) + 1);
}

function refreshProductCode() {
  const f = $('#productForm');
  if (!f || f.elements.id.value) return;
  if (f.elements.codigo) f.elements.codigo.value = nextProductCode();
  applyProductDefaults();
}

function loadProduct(id) {
  const p = db.produtos.find(x => x.id === id);
  if (!p) return;
  const f = $('#productForm');
  f.elements.id.value = p.id;
  f.elements.codigo.value = p.codigo;
  f.elements.nome.value = p.nome;
  f.elements.preco.value = p.preco;
  f.elements.custo.value = p.custo || 0;
  f.elements.estoque.value = p.estoque;
  f.elements.estoque_minimo.value = p.estoque_minimo;
}

function applyProductDefaults() {
  const f = $('#productForm');
  if (!f) return;
  if (f.elements.id.value) return;
  if (!f.elements.estoque.value) f.elements.estoque.value = '0';
  if (!f.elements.estoque_minimo.value) f.elements.estoque_minimo.value = '1';
}

function clearProduct() {
  const f = $('#productForm');
  f.reset();
  f.elements.id.value = '';
  refreshProductCode();
  applyProductDefaults();
}

function saveProduct(data) {
  const payload = {
    id: data.id ? Number(data.id) : nextId(db.produtos),
    codigo: (data.codigo || '').trim() || nextProductCode(),
    nome: data.nome.trim(),
    preco: Number(data.preco || 0),
    custo: Number(data.custo || 0),
    estoque: Number(data.estoque || 0),
    estoque_minimo: Number(data.estoque_minimo || 0)
  };
  const idx = db.produtos.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.produtos[idx] = payload;
  else db.produtos.push(payload);
  saveDb();
  addLog(idx >= 0 ? 'produto_edicao' : 'produto_cadastro', { produto: payload.nome });
  clearProduct();
  renderProducts();
  alert(idx >= 0 ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
}

function deleteProduct(id) {
  const p = db.produtos.find(x => x.id === id);
  if (!p) return;
  if (!confirm('Excluir produto "' + p.nome + '"?')) return;
  db.produtos = db.produtos.filter(x => x.id !== id);
  saveDb();
  addLog('produto_exclusao', { produto: p.nome });
  renderProducts();
}

function renderCustomers() {
  const tb = $('#customerRows');
  const s = ($('#customerSearch').value || '').trim().toLowerCase();
  tb.innerHTML = '';

  const items = db.clientes.filter(c => !s || c.nome.toLowerCase().includes(s) || c.telefone.toLowerCase().includes(s));
  if (!items.length) {
    tb.innerHTML = '<tr><td colspan="4">Nenhum cliente cadastrado.</td></tr>';
  } else {
    items.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + c.nome + '</strong></td>' +
        '<td>' + c.telefone + '</td>' +
        '<td>' + (c.endereco || '-') + '</td>' +
        '<td><div class="inline"><button class="ghost" data-e="' + c.id + '">Editar</button><button class="danger" data-d="' + c.id + '">Excluir</button></div></td>';
      tb.appendChild(tr);
    });
    tb.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => loadCustomer(Number(b.dataset.e))));
    tb.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => deleteCustomer(Number(b.dataset.d))));
  }

  const t2 = $('#saleCustomerRows');
  const s2 = ($('#saleCustomerSearch').value || '').trim().toLowerCase();
  t2.innerHTML = '';
  const saleItems = db.clientes.filter(c => !s2 || c.nome.toLowerCase().includes(s2) || c.telefone.toLowerCase().includes(s2));
  if (!saleItems.length) {
    t2.innerHTML = '<tr><td colspan="4">Nenhum cliente encontrado.</td></tr>';
  } else {
    saleItems.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + c.nome + '</strong></td>' +
        '<td>' + c.telefone + '</td>' +
        '<td>' + (c.endereco || '-') + '</td>' +
        '<td><button class="primary" data-s="' + c.id + '">Selecionar</button></td>';
      t2.appendChild(tr);
    });
    t2.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
      sale.customer = db.clientes.find(x => x.id === Number(b.dataset.s)) || null;
      closeModal('customerModal');
      renderSale();
    }));
  }
}

function loadCustomer(id) {
  const c = db.clientes.find(x => x.id === id);
  if (!c) return;
  const f = $('#customerForm');
  f.elements.id.value = c.id;
  f.elements.nome.value = c.nome;
  f.elements.telefone.value = c.telefone;
  f.elements.endereco.value = c.endereco || '';
  f.elements.observacao.value = c.observacao || '';
}

function clearCustomer() {
  const f = $('#customerForm');
  f.reset();
  f.elements.id.value = '';
}

function saveCustomer(data) {
  const payload = {
    id: data.id ? Number(data.id) : nextId(db.clientes),
    nome: data.nome.trim(),
    telefone: data.telefone.trim(),
    endereco: data.endereco.trim(),
    observacao: data.observacao.trim()
  };
  const idx = db.clientes.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.clientes[idx] = payload;
  else db.clientes.push(payload);
  saveDb();
  addLog(idx >= 0 ? 'cliente_edicao' : 'cliente_cadastro', { cliente: payload.nome });
  clearCustomer();
  renderCustomers();
  alert(idx >= 0 ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
}

function deleteCustomer(id) {
  const c = db.clientes.find(x => x.id === id);
  if (!c) return;
  if (!confirm('Excluir cliente "' + c.nome + '"?')) return;
  db.clientes = db.clientes.filter(x => x.id !== id);
  if (sale.customer?.id === id) sale.customer = null;
  saveDb();
  addLog('cliente_exclusao', { cliente: c.nome });
  renderCustomers();
  renderSale();
}

function renderHistory() {
  const tb = $('#historyRows');
  const s = ($('#historySearch').value || '').trim().toLowerCase();
  const pay = $('#historyPayment').value;
  const st = $('#historyStatus').value;
  tb.innerHTML = '';

  const items = db.pedidos.filter(o => {
    const text = [o.numero, o.data, o.operador, o.pagamento, o.status, o.cliente?.nome || 'Consumidor Final', ...(o.itens || []).map(i => i.produto)].join(' ').toLowerCase();
    return (!s || text.includes(s)) && (!pay || o.pagamento === pay) && (!st || o.status === st);
  }).slice().reverse();

  if (!items.length) {
    tb.innerHTML = '<tr><td colspan="7">Nenhuma venda encontrada.</td></tr>';
  } else {
    items.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + o.numero + '</td>' +
        '<td>' + o.data + '</td>' +
        '<td>' + (o.cliente?.nome || 'Consumidor Final') + '</td>' +
        '<td>' + o.pagamento + '</td>' +
        '<td>' + o.status + '</td>' +
        '<td>' + money(o.total) + '</td>' +
        '<td><div class="inline"><button class="ghost" data-p="' + o.id + '">Imprimir</button>' +
        (o.status !== 'cancelado' ? '<button class="danger" data-c="' + o.id + '">Cancelar</button>' : '') +
        '</div></td>';
      tb.appendChild(tr);
    });
    tb.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      const o = db.pedidos.find(x => x.id === Number(b.dataset.p));
      if (o) {
        renderPrint(o, 'a4');
        window.print();
      }
    }));
    tb.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
      $('#cancelForm').elements.pedidoId.value = Number(b.dataset.c);
      $('#cancelForm').elements.motivo.value = '';
      openModal('cancelModal');
    }));
  }

  const day = db.pedidos.filter(o => o.data.startsWith(todayBR()) && o.status === 'finalizado');
  const totalD = day.reduce((a,o)=>a+Number(o.total||0),0);
  const m = day.filter(o => o.pagamento === 'Dinheiro').reduce((a,o)=>a+Number(o.total||0),0);
  const p = day.filter(o => o.pagamento === 'PIX').reduce((a,o)=>a+Number(o.total||0),0);
  const c = day.filter(o => o.pagamento === 'Cartão').reduce((a,o)=>a+Number(o.total||0),0);
  const top = {};
  day.forEach(o => o.itens.forEach(i => top[i.produto] = (top[i.produto] || 0) + Number(i.quantidade || 0)));
  $('#dayCount').textContent = day.length;
  $('#dayTotal').textContent = money(totalD);
  $('#dayMoney').textContent = money(m);
  $('#dayPix').textContent = money(p);
  $('#dayCard').textContent = money(c);
  $('#dayTop').textContent = (Object.entries(top).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-');
}

function cancelOrder(data) {
  const o = db.pedidos.find(x => x.id === Number(data.pedidoId));
  if (!o || o.status === 'cancelado') return;
  o.status = 'cancelado';
  o.itens.forEach(it => {
    const p = db.produtos.find(x => x.id === it.produtoId);
    if (p) p.estoque = Number((Number(p.estoque) + Number(it.quantidade)).toFixed(3));
  });
  db.logs.push({
    id: nextId(db.logs),
    tipo: 'cancelamento',
    pedido: o.numero,
    motivo: data.motivo,
    data: nowBR(),
    usuario: user.usuario
  });
  saveDb();
  closeModal('cancelModal');
  renderAll();
}

function renderCash() {
  $('#saleCash').textContent = db.caixa.aberto ? ('Aberto - ' + (db.caixa.usuarioAbertura || '-')) : 'Fechado';
  $('#cashStatus').textContent = db.caixa.aberto ? 'Aberto' : 'Fechado';
  $('#cashUser').textContent = db.caixa.usuarioAbertura || '-';
  $('#cashInitial').textContent = money(db.caixa.valorInicial);
  $('#cashSales').textContent = money(db.caixa.totalVendas);
  $('#cashMoney').textContent = money(db.caixa.totalDinheiro);
  $('#cashPix').textContent = money(db.caixa.totalPix);
  $('#cashCard').textContent = money(db.caixa.totalCartao);
  $('#expectedCash').value = money(expectedCash());

  const openForm = $('#openCashForm');
  const moveForm = $('#moveCashForm');
  const closeForm = $('#closeCashForm');
  if (openForm) openForm.querySelector('button').disabled = db.caixa.aberto;
  if (moveForm) Array.from(moveForm.elements).forEach(el => el.disabled = !isCashOpenForCurrentUser());
  if (closeForm) Array.from(closeForm.elements).forEach(el => { if (el.name !== '') el.disabled = !isCashOpenForCurrentUser() && el.id !== 'expectedCash'; });
  const printBtn = $('#printCashMovements');
  if (printBtn) printBtn.disabled = !db.caixa.movimentos.length;

  const tb = $('#cashRows');
  tb.innerHTML = '';
  if (!db.caixa.movimentos.length) {
    tb.innerHTML = '<tr><td colspan="4">Sem movimentos no caixa.</td></tr>';
  } else {
    db.caixa.movimentos.slice().reverse().forEach(m => {
      tb.innerHTML += '<tr><td>' + m.data + '</td><td>' + m.tipo + '</td><td>' + money(m.valor) + '</td><td>' + (m.descricao || '-') + '</td></tr>';
    });
  }
}

function openCash(data) {
  if (db.caixa.aberto) {
    alert('O caixa já está aberto.');
    renderAll();
    return;
  }
  const valor = Number(data.valorInicial || 0);
  db.caixa.aberto = true;
  db.caixa.usuarioAbertura = user?.usuario || '';
  db.caixa.dataAbertura = nowBR();
  db.caixa.valorInicial = valor;
  db.caixa.totalVendas = 0;
  db.caixa.totalDinheiro = 0;
  db.caixa.totalPix = 0;
  db.caixa.totalCartao = 0;
  db.caixa.movimentos = [{
    data: nowBR(),
    tipo: 'abertura',
    valor: valor,
    descricao: 'Abertura de caixa por ' + (user?.usuario || 'sistema')
  }];
  saveDb();
  addLog('caixa_abertura', { valor, usuario: user?.usuario || 'sistema' });
  renderAll();
  alert('Caixa aberto com sucesso para o usuário ' + (user?.usuario || '-'));
}

function moveCash(data) {
  if (!db.caixa.aberto) {
    alert('Abra o caixa antes de lançar movimentos.');
    renderAll();
    return;
  }
  if (!isCashOpenForCurrentUser()) {
    alert('Somente o usuário ' + (db.caixa.usuarioAbertura || '-') + ' pode movimentar este caixa.');
    renderAll();
    return;
  }
  db.caixa.movimentos.push({
    data: nowBR(),
    tipo: data.tipo,
    valor: Number(data.valor || 0),
    descricao: (data.descricao || '') + (data.descricao ? ' • ' : '') + 'Usuário: ' + (user?.usuario || '-')
  });
  saveDb();
  addLog('caixa_movimento', { tipo: data.tipo, valor: Number(data.valor || 0) });
  renderAll();
}

function closeCash(data) {
  if (!db.caixa.aberto) {
    alert('O caixa já está fechado.');
    renderAll();
    return;
  }
  const counted = Number(data.valorContado || 0);
  const exp = expectedCash();
  const diff = counted - exp;
  if (!confirm('Fechar caixa?\\nEsperado: ' + money(exp) + '\\nContado: ' + money(counted) + '\\nDiferença: ' + money(diff))) return;
  db.caixa.aberto = false;
  db.caixa.movimentos.push({
    data: nowBR(),
    tipo: 'fechamento',
    valor: counted,
    descricao: 'Fechamento de caixa. Diferença: ' + money(diff)
  });
  saveDb();
  addLog('caixa_fechamento', { esperado: exp, contado: counted, diferenca: diff });
  renderAll();
}

function updateCashDiff(v) {
  const diff = Number(v || 0) - expectedCash();
  const box = $('#cashDifference');
  box.textContent = 'Diferença: ' + money(diff);
  box.className = 'diff' + (diff === 0 ? ' ok' : ' bad');
}

function loadSettings() {
  const f = $('#settingsForm');
  if (!f) return;
  for (const [k,v] of Object.entries(db.config)) {
    if (f.elements[k]) f.elements[k].value = v ?? '';
  }
}

function saveSettings(data) {
  db.config = { ...db.config, ...data };
  saveDb();
  addLog('configuracoes_edicao', { empresa: data.empresa });
  applyConfig();
  alert('Configurações salvas.');
}

function renderUsers() {
  const tb = $('#userRows');
  tb.innerHTML = '';
  db.usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + u.usuario + '</td>' +
      '<td>' + u.tipo + '</td>' +
      '<td><div class="inline"><button class="ghost" data-e="' + u.id + '">Editar</button>' +
      (u.usuario !== 'admin' ? '<button class="danger" data-d="' + u.id + '">Excluir</button>' : '') +
      '</div></td>';
    tb.appendChild(tr);
  });
  tb.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => loadUser(Number(b.dataset.e))));
  tb.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => deleteUser(Number(b.dataset.d))));
}

function loadUser(id) {
  const u = db.usuarios.find(x => x.id === id);
  if (!u) return;
  const f = $('#userForm');
  f.elements.id.value = u.id;
  f.elements.usuario.value = u.usuario;
  f.elements.senha.value = u.senha;
  f.elements.tipo.value = u.tipo;
}

function clearUser() {
  const f = $('#userForm');
  f.reset();
  f.elements.id.value = '';
}

function saveUser(data) {
  const payload = {
    id: data.id ? Number(data.id) : nextId(db.usuarios),
    usuario: data.usuario.trim(),
    senha: data.senha,
    tipo: data.tipo
  };
  const idx = db.usuarios.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.usuarios[idx] = payload;
  else db.usuarios.push(payload);
  saveDb();
  addLog(idx >= 0 ? 'usuario_edicao' : 'usuario_cadastro', { usuario: payload.usuario, tipo: payload.tipo });
  clearUser();
  renderUsers();
}

function deleteUser(id) {
  const u = db.usuarios.find(x => x.id === id);
  if (!u) return;
  if (!confirm('Excluir usuário "' + u.usuario + '"?')) return;
  db.usuarios = db.usuarios.filter(x => x.id !== id);
  saveDb();
  addLog('usuario_exclusao', { usuario: u.usuario });
  renderUsers();
}

function renderPrint(order, mode) {
  const cfg = db.config;
  const items = order.itens.map(i => mode === '80'
    ? '<tr><td>' + (i.produto.length > 22 ? i.produto.slice(0,22)+'…' : i.produto) + '<br><small>' + i.quantidade + ' x ' + money(i.unitario) + '</small></td><td style="text-align:right">' + money(i.total) + '</td></tr>'
    : '<tr><td>' + i.produto + '</td><td>' + i.quantidade + '</td><td>' + money(i.unitario) + '</td><td>' + money(i.total) + '</td></tr>'
  ).join('');
  $('#printArea').innerHTML =
    '<div style="padding:' + (mode === '80' ? '4mm;width:80mm;font-family:Courier New,monospace' : '18mm 14mm;width:100%;font-family:Arial,sans-serif') + '">' +
    '<div style="text-align:center;margin-bottom:12px">' +
    '<div style="font-size:' + (mode === '80' ? '16px' : '22px') + ';font-weight:800">' + cfg.empresa + '</div>' +
    '<div style="font-size:12px;color:#444">' + (cfg.nomeFantasia || cfg.empresa) + '</div>' +
    '<div style="font-size:12px;color:#444">' + cfg.cidade + ' • ' + cfg.telefone + '</div>' +
    (cfg.cnpj ? '<div style="font-size:12px;color:#444">CNPJ: ' + cfg.cnpj + '</div>' : '') +
    '<div style="font-size:12px;color:#444">Pedido: ' + order.numero + ' • Operador: ' + order.operador + '</div>' +
    '<div style="font-size:12px;color:#444">Data/Hora: ' + order.data + '</div>' +
    (mode === 'a4' ? '<div style="font-size:12px;color:#444">Cliente: ' + (order.cliente ? order.cliente.nome + ' - ' + (order.cliente.telefone || '') : 'Consumidor Final') + '</div>' : '') +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse"><thead><tr>' +
    (mode === '80'
      ? '<th style="text-align:left;border-bottom:1px solid #ccc">Item</th><th style="text-align:right;border-bottom:1px solid #ccc">Total</th>'
      : '<th style="text-align:left;border-bottom:1px solid #ccc">Produto</th><th style="text-align:left;border-bottom:1px solid #ccc">Qtd</th><th style="text-align:left;border-bottom:1px solid #ccc">Unitário</th><th style="text-align:left;border-bottom:1px solid #ccc">Total</th>') +
    '</tr></thead><tbody>' + items + '</tbody></table>' +
    '<div style="margin-top:12px">' +
    '<div style="display:flex;justify-content:space-between"><span>Subtotal</span><strong>' + money(order.subtotal) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Desconto</span><strong>' + money(order.desconto) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Acréscimo</span><strong>' + money(order.acrescimo) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Total</span><strong>' + money(order.total) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Pagamento</span><strong>' + order.pagamento + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Troco</span><strong>' + money(Math.max(0, order.troco || 0)) + '</strong></div>' +
    '</div>' +
    (mode === 'a4' ? '<div style="margin-top:14px;font-size:12px;color:#444">Observações: ' + (order.observacoes || '-') + '</div>' : '') +
    '<div style="text-align:center;margin-top:16px;font-size:12px">' + cfg.mensagemCupom + '</div></div>';
}

function printCashMovements() {
  const cfg = db.config;
  const rows = db.caixa.movimentos.length
    ? db.caixa.movimentos.map(m => '<tr><td style="padding:8px;border-bottom:1px solid #ddd">' + m.data + '</td><td style="padding:8px;border-bottom:1px solid #ddd">' + m.tipo + '</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">' + money(m.valor) + '</td><td style="padding:8px;border-bottom:1px solid #ddd">' + (m.descricao || '-') + '</td></tr>').join('')
    : '<tr><td colspan="4" style="padding:8px">Sem movimentos no caixa.</td></tr>';
  $('#printArea').innerHTML =
    '<div style="padding:18mm 14mm;width:100%;font-family:Arial,sans-serif">' +
    '<div style="text-align:center;margin-bottom:18px">' +
    '<div style="font-size:22px;font-weight:800">' + cfg.empresa + '</div>' +
    '<div style="font-size:12px;color:#444">Movimentação do Caixa</div>' +
    '<div style="font-size:12px;color:#444">Usuário do caixa: ' + (db.caixa.usuarioAbertura || '-') + '</div>' +
    '<div style="font-size:12px;color:#444">Status: ' + (db.caixa.aberto ? 'Aberto' : 'Fechado') + '</div>' +
    '<div style="font-size:12px;color:#444">Data abertura: ' + (db.caixa.dataAbertura || '-') + '</div>' +
    '</div>' +
    '<div style="margin-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between"><span>Saldo inicial</span><strong>' + money(db.caixa.valorInicial) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Total vendas</span><strong>' + money(db.caixa.totalVendas) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Dinheiro</span><strong>' + money(db.caixa.totalDinheiro) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>PIX</span><strong>' + money(db.caixa.totalPix) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Cartão</span><strong>' + money(db.caixa.totalCartao) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Saldo esperado</span><strong>' + money(expectedCash()) + '</strong></div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse"><thead><tr>' +
    '<th style="text-align:left;border-bottom:1px solid #aaa;padding:8px">Data</th>' +
    '<th style="text-align:left;border-bottom:1px solid #aaa;padding:8px">Tipo</th>' +
    '<th style="text-align:right;border-bottom:1px solid #aaa;padding:8px">Valor</th>' +
    '<th style="text-align:left;border-bottom:1px solid #aaa;padding:8px">Descrição</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</div>';
  window.print();
}

function openModal(id) { $('#'+id).classList.remove('hidden'); }
function closeModal(id) { $('#'+id).classList.add('hidden'); }

function renderAll() {
  applyConfig();
  applyRole();
  renderSale();
  renderProducts();
  renderCustomers();
  renderHistory();
  renderCash();
  renderUsers();
  loadSettings();
  refreshProductCode();
}

function initEvents() {
  $$('.nav[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('#logoutBtn').addEventListener('click', () => { clearSessionUser(); location.reload(); });
  $('#menuToggle')?.addEventListener('click', toggleSidebar);
  $('#sidebarCloseBtn')?.addEventListener('click', closeSidebar);

  $('#search').addEventListener('input', () => {
    sale.suggestions = searchProducts($('#search').value);
    sale.sel = sale.suggestions.length ? 0 : -1;
    renderSuggestions();
  });
  $('#search').addEventListener('keydown', e => {
    const max = sale.suggestions.length - 1;
    if (e.key === 'ArrowDown' && max >= 0) {
      e.preventDefault(); sale.sel = Math.min(max, sale.sel + 1); renderSuggestions();
    } else if (e.key === 'ArrowUp' && max >= 0) {
      e.preventDefault(); sale.sel = Math.max(0, sale.sel - 1); renderSuggestions();
    } else if (e.key === 'Enter') {
      e.preventDefault(); addSelectedOrFirst();
    } else if (e.key === 'Escape') {
      e.preventDefault(); $('#search').value=''; $('#price').value=''; sale.suggestions=[]; $('#suggestions').classList.add('hidden');
    }
  });
  $('#qty').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSelectedOrFirst(); } });
  $('#price').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSelectedOrFirst(); } });
  $('#addBtn').addEventListener('click', addSelectedOrFirst);
  $('#discount').addEventListener('input', renderSale);
  $('#extra').addEventListener('input', renderSale);
  $('#received').addEventListener('input', renderSale);
  $('#notes').addEventListener('input', renderSale);
  $$('.pay').forEach(b => b.addEventListener('click', () => { sale.payment = b.dataset.pay; renderSale(); }));

  $('#openCustomerModal').addEventListener('click', () => { renderCustomers(); openModal('customerModal'); });
  $('#closeCustomerModal').addEventListener('click', () => closeModal('customerModal'));
  $('#saleCustomerSearch').addEventListener('input', renderCustomers);
  $('#newSaleBtn').addEventListener('click', resetSale);
  $('#finishSale').addEventListener('click', finalizeSale);
  $('#cancelSale').addEventListener('click', cancelCurrentSale);
  $('#printA4').addEventListener('click', () => {
    renderPrint({
      numero:'PRÉVIA',
      cliente:sale.customer?clone(sale.customer):null,
      itens:clone(sale.items),
      subtotal:subtotal(),
      desconto:Number($('#discount').value||0),
      acrescimo:Number($('#extra').value||0),
      total:total(),
      pagamento:sale.payment,
      troco:changeValue(),
      observacoes:$('#notes').value.trim(),
      operador:user.usuario,
      data:nowBR()
    }, 'a4');
    window.print();
  });
  $('#print80').addEventListener('click', () => {
    renderPrint({
      numero:'PRÉVIA',
      cliente:sale.customer?clone(sale.customer):null,
      itens:clone(sale.items),
      subtotal:subtotal(),
      desconto:Number($('#discount').value||0),
      acrescimo:Number($('#extra').value||0),
      total:total(),
      pagamento:sale.payment,
      troco:changeValue(),
      observacoes:$('#notes').value.trim(),
      operador:user.usuario,
      data:nowBR()
    }, '80');
    window.print();
  });

  $('#productForm').addEventListener('submit', e => { e.preventDefault(); saveProduct(Object.fromEntries(new FormData(e.target).entries())); });
  $('#clearProduct').addEventListener('click', clearProduct);
  $('#productSearch').addEventListener('input', renderProducts);
  $('#btnListarProdutos')?.addEventListener('click', renderProducts);

  $('#customerForm').addEventListener('submit', e => { e.preventDefault(); saveCustomer(Object.fromEntries(new FormData(e.target).entries())); });
  $('#clearCustomer').addEventListener('click', clearCustomer);
  $('#customerSearch').addEventListener('input', renderCustomers);
  $('#btnListarClientes')?.addEventListener('click', renderCustomers);

  $('#historySearch').addEventListener('input', renderHistory);
  $('#historyPayment').addEventListener('change', renderHistory);
  $('#historyStatus').addEventListener('change', renderHistory);
  $('#cancelForm').addEventListener('submit', e => { e.preventDefault(); cancelOrder(Object.fromEntries(new FormData(e.target).entries())); });
  $('#closeCancelModal').addEventListener('click', () => closeModal('cancelModal'));

  $('#openCashForm').addEventListener('submit', e => {
    e.preventDefault();
    openCash(Object.fromEntries(new FormData(e.target).entries()));
    e.target.reset();
  });
  $('#moveCashForm').addEventListener('submit', e => {
    e.preventDefault();
    moveCash(Object.fromEntries(new FormData(e.target).entries()));
    e.target.reset();
  });
  $('#closeCashForm').elements.valorContado.addEventListener('input', e => updateCashDiff(e.target.value));
  $('#closeCashForm').addEventListener('submit', e => {
    e.preventDefault();
    closeCash(Object.fromEntries(new FormData(e.target).entries()));
    e.target.reset();
    $('#cashDifference').textContent='Diferença: R$ 0,00';
    $('#cashDifference').className='diff';
  });
  $('#printCashMovements').addEventListener('click', printCashMovements);

  $('#settingsForm').addEventListener('submit', e => { e.preventDefault(); saveSettings(Object.fromEntries(new FormData(e.target).entries())); });
  $('#userForm').addEventListener('submit', e => { e.preventDefault(); saveUser(Object.fromEntries(new FormData(e.target).entries())); });
  $('#clearUser').addEventListener('click', clearUser);

  $('#backupBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdv_v10_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  $('#restoreInput').addEventListener('change', async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      db = JSON.parse(await f.text());
      saveDb();
      location.reload();
    } catch {
      alert('Arquivo inválido para restore.');
    }
    e.target.value='';
  });

  document.addEventListener('keydown', e => {
    if (!$('#login').classList.contains('hidden')) return;
    if (e.key === 'F2') { e.preventDefault(); renderCustomers(); openModal('customerModal'); }
    else if (e.key === 'F4') { e.preventDefault(); showTab('caixa'); }
    else if (e.key === 'F6') { e.preventDefault(); showTab('historico'); }
    else if (e.key === 'F8') { e.preventDefault(); finalizeSale(); }
    else if (e.key === 'F9') { e.preventDefault(); resetSale(); }
  });
}

async function init() {
  await loadDb();
  repairCashState();
  const params = new URLSearchParams(location.search);
  if (params.get('usuario')) $('#loginForm').elements.usuario.value = params.get('usuario');
  if (params.get('senha')) $('#loginForm').elements.senha.value = params.get('senha');

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    if (!authLogin((d.usuario||'').trim(), d.senha || '')) {
      alert('Usuário ou senha inválidos.');
      return;
    }
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    initEvents();
    showTab('vendas');
    renderAll();
    resetSale();
    persistSessionUser();
  });

  if (params.get('usuario') && params.get('senha')) {
    $('#loginForm').requestSubmit();
    return;
  }

  if (tryRestoreSessionUser()) {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    initEvents();
    showTab('vendas');
    renderAll();
    resetSale();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
  } catch (err) {
    console.error('Erro ao iniciar o PDV:', err);
    alert('O sistema encontrou um erro ao iniciar. Esta versão foi corrigida para o login.');
  }
});
