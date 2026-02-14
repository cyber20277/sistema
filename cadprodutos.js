// ===== SISTEMA DE CADASTRO DE PRODUTOS =====
// VERSÃO SUPABASE COM CATEGORIAS E PESOS DINÂMICOS (SIMPLIFICADO SEM UNIDADE)
// CORREÇÃO: Produtos adicionais agora registram quantidade_estoque corretamente

// Elementos DOM
const produtoForm = document.getElementById('produtoForm');
const nomeProduto = document.getElementById('nomeProduto');
const descricaoProduto = document.getElementById('descricaoProduto');
const imagemURL = document.getElementById('imagemURL');
const quantidadeEstoque = document.getElementById('quantidadeEstoque');
const statusProduto = document.getElementById('statusProduto');
const statusText = document.getElementById('statusText');
const categoriaProduto = document.getElementById('categoriaProduto');
const precoProduto = document.getElementById('precoProduto');
const pesoProduto = document.getElementById('pesoProduto');
const saboresProduto = document.getElementById('saboresProduto');
const limparFormBtn = document.getElementById('limparForm');
const submitBtn = document.getElementById('submitBtn');
const produtosLista = document.getElementById('produtosLista');
const loadingProdutos = document.getElementById('loadingProdutos');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const totalExibidos = document.getElementById('totalExibidos');
const panelSubtitle = document.getElementById('panelSubtitle');
const infoText = document.getElementById('infoText');
const imagePreview = document.getElementById('imagePreview');
const stockBar = document.getElementById('stockBar');
const stockLevel = document.getElementById('stockLevel');

// Elementos da sidebar
const produtosAtivosElement = document.getElementById('produtosAtivos');
const produtosEstoqueElement = document.getElementById('produtosEstoque');
const btnVoltarDashboard = document.getElementById('btnVoltarDashboard');

// Elementos de tipo de produto
const tipoProdutoInput = document.getElementById('tipoProduto');
const categoriasAdicionaisContainer = document.getElementById('categoriasAdicionaisContainer');
const categoryChipsContainer = document.querySelector('.category-chips');

// Elementos de botões
const btnAtualizar = document.getElementById('btnAtualizar');
const btnPreviewImagem = document.getElementById('btnPreviewImagem');
const btnVerTodos = document.getElementById('btnVerTodos');

// Elementos de filtro
const filterTags = document.querySelectorAll('.filter-tag');

// Estado global
let produtos = [];
let produtosFiltrados = [];
let isSubmitting = false;
let currentFilter = 'todos';
let produtoEditando = null;
let categoriasDisponiveis = [];
let pesosDisponiveis = [];

// Timer para atualização periódica
let atualizacaoTimer = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Produtos inicializado (Supabase)');
    
    // Carregar categorias dinamicamente
    carregarCategoriasDinamicas();
    
    // Carregar pesos dinamicamente
    carregarPesosDinamicos();
    
    // Inicializar outros sistemas
    inicializarSupabase();
    setupEventListeners();
    inicializarIndicadores();
    carregarProdutos();
    carregarEstatisticasSidebar();
    
    // Iniciar atualização periódica
    iniciarAtualizacaoPeriodica();
    
    // Ouvir eventos de atualização de categorias
    window.addEventListener('categoriasAtualizadas', function(event) {
        console.log('🔄 Evento de categorias atualizadas recebido');
        carregarCategoriasDinamicas(event.detail?.categorias);
    });
    
    // Ouvir eventos de atualização de pesos
    window.addEventListener('pesosAtualizados', function(event) {
        console.log('⚖️ Evento de pesos atualizados recebido');
        carregarPesosDinamicos(event.detail?.pesos);
    });
});

// ===== SISTEMA DE CATEGORIAS DINÂMICAS =====
function carregarCategoriasDinamicas(categoriasFornecidas = null) {
    try {
        let categoriasParaUsar = categoriasFornecidas;
        
        if (!categoriasParaUsar) {
            const categoriasSalvas = localStorage.getItem('categoriasProdutos');
            if (categoriasSalvas) {
                categoriasParaUsar = JSON.parse(categoriasSalvas);
            }
        }
        
        if (!categoriasParaUsar || !Array.isArray(categoriasParaUsar) || categoriasParaUsar.length === 0) {
            categoriasParaUsar = [
                { id: 'comida', nome: '🍕 Comida', icon: '🍕' },
                { id: 'bebida', nome: '🥤 Bebida', icon: '🥤' },
                { id: 'sobremesa', nome: '🍰 Sobremesa', icon: '🍰' },
                { id: 'outro', nome: '📦 Outro', icon: '📦' }
            ];
        }
        
        categoriasDisponiveis = categoriasParaUsar;
        
        atualizarSelectCategorias(categoriasParaUsar);
        atualizarChipsCategoriasAdicionais(categoriasParaUsar);
        
        console.log(`✅ ${categoriasParaUsar.length} categorias carregadas`);
        
        window.dispatchEvent(new CustomEvent('categoriasAtualizadas', {
            detail: { categorias: categoriasParaUsar }
        }));
        
        return categoriasParaUsar;
        
    } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
        return [];
    }
}

function atualizarSelectCategorias(categorias) {
    if (!categoriaProduto) return;
    
    const categoriaSelecionada = categoriaProduto.value;
    categoriaProduto.innerHTML = '';
    
    const optionPadrao = document.createElement('option');
    optionPadrao.value = '';
    optionPadrao.textContent = 'Selecione uma categoria';
    optionPadrao.disabled = true;
    categoriaProduto.appendChild(optionPadrao);
    
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nome;
        categoriaProduto.appendChild(option);
    });
    
    if (categoriaSelecionada) {
        const optionExistente = Array.from(categoriaProduto.options).find(
            opt => opt.value === categoriaSelecionada
        );
        if (optionExistente) {
            categoriaProduto.value = categoriaSelecionada;
        }
    }
    
    if (!categoriaProduto.value && categorias.length > 0) {
        categoriaProduto.value = categorias[0].id;
    }
}

function atualizarChipsCategoriasAdicionais(categorias) {
    if (!categoryChipsContainer) return;
    
    categoryChipsContainer.innerHTML = '';
    
    categorias
        .filter(categoria => categoria.id !== 'outro')
        .forEach(categoria => {
            const icon = categoria.icon || '📦';
            const nomeSemIcone = categoria.nome.replace(categoria.icon + ' ', '');
            
            const chip = document.createElement('label');
            chip.className = 'category-chip';
            chip.innerHTML = `
                <input type="checkbox" id="cat-${categoria.id}" value="${categoria.id}">
                <div class="chip-content">
                    <span class="chip-icon">${icon}</span>
                    <span>${nomeSemIcone}</span>
                </div>
            `;
            categoryChipsContainer.appendChild(chip);
        });
}

// ===== SISTEMA DE PESOS DINÂMICOS =====
function carregarPesosDinamicos(pesosFornecidos = null) {
    try {
        let pesosParaUsar = pesosFornecidos;
        
        if (!pesosParaUsar) {
            const pesosSalvos = localStorage.getItem('pesosProdutos');
            if (pesosSalvos) {
                pesosParaUsar = JSON.parse(pesosSalvos);
            }
        }
        
        if (!pesosParaUsar || !Array.isArray(pesosParaUsar) || pesosParaUsar.length === 0) {
            pesosParaUsar = [
                { id: 'pequeno', nome: 'Pequeno' },
                { id: 'medio', nome: 'Médio' },
                { id: 'grande', nome: 'Grande' },
            ];
        }
        
        pesosDisponiveis = pesosParaUsar;
        atualizarSelectPesos(pesosParaUsar);
        
        console.log(`✅ ${pesosParaUsar.length} pesos/tamanhos carregados`);
        
        window.dispatchEvent(new CustomEvent('pesosAtualizados', {
            detail: { pesos: pesosParaUsar }
        }));
        
        return pesosParaUsar;
        
    } catch (error) {
        console.error('❌ Erro ao carregar pesos:', error);
        return [];
    }
}

function atualizarSelectPesos(pesos) {
    const selectPeso = document.getElementById('pesoProduto');
    if (!selectPeso) return;
    
    const pesoSelecionado = selectPeso.value;
    selectPeso.innerHTML = '<option value="">Não especificado</option>';
    
    pesos.sort((a, b) => a.nome.localeCompare(b.nome));
    
    pesos.forEach(peso => {
        const option = document.createElement('option');
        option.value = peso.id;
        option.textContent = peso.nome;
        selectPeso.appendChild(option);
    });
    
    if (pesoSelecionado) {
        const optionExistente = Array.from(selectPeso.options).find(
            opt => opt.value === pesoSelecionado
        );
        if (optionExistente) {
            selectPeso.value = pesoSelecionado;
        }
    }
}

// ===== INICIALIZAÇÃO SUPABASE =====
function inicializarSupabase() {
    try {
        console.log('✅ Supabase configurado');
        testarConexaoSupabase();
    } catch (error) {
        console.error('❌ Erro no Supabase:', error);
        mostrarToast('Erro na conexão com o banco de dados', 'error');
    }
}

async function testarConexaoSupabase() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não encontrado');
        }
        
        const { data, error } = await supabase
            .from('produtos')
            .select('id')
            .limit(1);
            
        if (error) throw error;
        console.log('✅ Conexão Supabase estabelecida');
    } catch (error) {
        console.error('❌ Falha na conexão Supabase:', error);
        mostrarToast('Erro ao conectar com o banco de dados', 'error');
    }
}

// ===== ATUALIZAÇÃO PERIÓDICA =====
function iniciarAtualizacaoPeriodica() {
    if (atualizacaoTimer) {
        clearInterval(atualizacaoTimer);
    }
    
    atualizacaoTimer = setInterval(() => {
        console.log('🔄 Atualização periódica de produtos...');
        carregarEstatisticasSidebar();
    }, 10000);
    
    console.log('✅ Atualização periódica iniciada (10 segundos)');
}

function pararAtualizacaoPeriodica() {
    if (atualizacaoTimer) {
        clearInterval(atualizacaoTimer);
        atualizacaoTimer = null;
        console.log('⏹️ Atualização periódica parada');
    }
}

// ===== SIDEBAR E NAVEGAÇÃO =====
async function carregarEstatisticasSidebar() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: produtosData, error } = await supabase
            .from('produtos')
            .select('*');
            
        if (error) throw error;
        
        let totalAtivos = 0;
        let totalBaixoEstoque = 0;
        
        produtosData.forEach((produto) => {
            if (produto.status === true || produto.status === 'on' || produto.status === 'ativo') {
                totalAtivos++;
            }
            
            const estoque = parseInt(produto.quantidade || produto.quantidade_estoque) || 0;
            if (estoque > 0 && estoque < 10) {
                totalBaixoEstoque++;
            }
        });
        
        if (produtosAtivosElement) {
            produtosAtivosElement.textContent = totalAtivos;
        }
        if (produtosEstoqueElement) {
            produtosEstoqueElement.textContent = totalBaixoEstoque;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

function voltarParaDashboard() {
    pararAtualizacaoPeriodica();
    window.location.href = 'dashboard.html';
}

// ===== CONFIGURAÇÃO INICIAL =====
function setupEventListeners() {
    if (produtoForm) {
        produtoForm.addEventListener('submit', cadastrarProduto);
    }
    
    if (limparFormBtn) {
        limparFormBtn.addEventListener('click', limparFormulario);
    }
    
    if (statusProduto) {
        statusProduto.addEventListener('change', atualizarStatusTexto);
    }
    
    if (btnPreviewImagem) {
        btnPreviewImagem.addEventListener('click', atualizarPreviewImagem);
    }
    
    if (imagemURL) {
        imagemURL.addEventListener('input', debounce(atualizarPreviewImagem, 300));
    }
    
    if (quantidadeEstoque) {
        quantidadeEstoque.addEventListener('input', atualizarIndicadorEstoque);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filtrarProdutos, 300));
    }
    
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selecionarTipo(this.dataset.type);
        });
    });
    
    if (filterTags.length > 0) {
        filterTags.forEach(tag => {
            tag.addEventListener('click', function() {
                filtrarPorStatus(this.dataset.filter);
            });
        });
    }
    
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', recarregarProdutos);
    }
    
    if (btnVerTodos) {
        btnVerTodos.addEventListener('click', mostrarTodosProdutos);
    }
    
    if (btnVoltarDashboard) {
        btnVoltarDashboard.addEventListener('click', voltarParaDashboard);
    }
}

function inicializarIndicadores() {
    atualizarStatusTexto();
    atualizarIndicadorEstoque();
}

// ===== FUNÇÕES DE FORMULÁRIO =====
function selecionarTipo(tipo) {
    const buttons = document.querySelectorAll('.type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === tipo) {
            btn.classList.add('active');
        }
    });
    
    tipoProdutoInput.value = tipo;
    
    alternarCamposPorTipo(tipo);
    
    if (tipo === 'adicional') {
        if (categoriasAdicionaisContainer) {
            categoriasAdicionaisContainer.style.display = 'block';
            setTimeout(() => {
                categoriasAdicionaisContainer.classList.add('fade-in');
            }, 10);
        }
        
        if (categoriaProduto) {
            categoriaProduto.value = '';
            categoriaProduto.disabled = true;
            categoriaProduto.style.opacity = '0.5';
            categoriaProduto.style.cursor = 'not-allowed';
        }
        
        if (saboresProduto) {
            saboresProduto.value = '1';
            saboresProduto.disabled = true;
            saboresProduto.style.opacity = '0.5';
            saboresProduto.style.cursor = 'not-allowed';
        }
    } else {
        if (categoriasAdicionaisContainer) {
            categoriasAdicionaisContainer.style.display = 'none';
        }
        
        if (categoriaProduto) {
            categoriaProduto.disabled = false;
            categoriaProduto.style.opacity = '1';
            categoriaProduto.style.cursor = 'pointer';
            
            if (!categoriaProduto.value && categoriasDisponiveis.length > 0) {
                categoriaProduto.value = categoriasDisponiveis[0].id;
            }
        }
        
        if (saboresProduto) {
            saboresProduto.disabled = false;
            saboresProduto.style.opacity = '1';
            saboresProduto.style.cursor = 'pointer';
        }
    }
}

function alternarCamposPorTipo(tipo) {
    const descricaoContainer = document.getElementById('descricaoContainer');
    const estoqueContainer = document.getElementById('estoqueContainer');
    const imagemContainer = document.getElementById('imagemContainer');
    const categoriaContainer = document.getElementById('categoriaContainer');
    const previewContainer = document.getElementById('previewContainer');
    const pesoContainer = document.getElementById('pesoContainer');
    
    if (tipo === 'adicional') {
        // NÃO ESCONDER O ESTOQUE - APENAS A DESCRIÇÃO, IMAGEM E PESO
        if (descricaoContainer) descricaoContainer.style.display = 'none';
        if (imagemContainer) imagemContainer.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'none';
        if (pesoContainer) pesoContainer.style.display = 'none';
        
        // MANTER VISÍVEL: ESTOQUE, CATEGORIA
        if (categoriaContainer) categoriaContainer.style.display = 'block';
        if (estoqueContainer) estoqueContainer.style.display = 'block'; // ← MANTENDO VISÍVEL
        
        if (descricaoProduto) descricaoProduto.value = '';
        // NÃO LIMPAR O ESTOQUE AQUI
        if (imagemURL) imagemURL.value = '';
        if (pesoProduto) pesoProduto.value = '';
        if (saboresProduto) saboresProduto.value = '1';
        
    } else {
        if (descricaoContainer) descricaoContainer.style.display = 'block';
        if (estoqueContainer) estoqueContainer.style.display = 'block';
        if (imagemContainer) imagemContainer.style.display = 'block';
        if (categoriaContainer) categoriaContainer.style.display = 'block';
        if (previewContainer) previewContainer.style.display = 'block';
        if (pesoContainer) pesoContainer.style.display = 'flex';
    }
}

function atualizarStatusTexto() {
    if (!statusProduto || !statusText) return;
    
    const isAtivo = statusProduto.checked;
    statusText.textContent = isAtivo ? 'Ativo' : 'Inativo';
    statusText.className = isAtivo ? 'status-text active' : 'status-text inactive';
}

function atualizarIndicadorEstoque() {
    if (!quantidadeEstoque || !stockBar || !stockLevel) return;
    
    const quantidade = parseInt(quantidadeEstoque.value) || 0;
    let nivel = 'Bom';
    let cor = '#00bb9c';
    let porcentagem = 100;
    
    if (quantidade === 0) {
        nivel = 'Esgotado';
        cor = '#ff5a5a';
        porcentagem = 0;
    } else if (quantidade <= 5) {
        nivel = 'Baixo';
        cor = '#ff9e00';
        porcentagem = 30;
    } else if (quantidade <= 10) {
        nivel = 'Moderado';
        cor = '#ffd166';
        porcentagem = 60;
    }
    
    stockBar.style.width = `${porcentagem}%`;
    stockBar.style.background = cor;
    stockLevel.textContent = nivel;
    stockLevel.style.color = cor;
}

function atualizarPreviewImagem() {
    if (!imagemURL || !imagePreview) return;
    
    const url = imagemURL.value.trim();
    
    if (url && isValidURL(url)) {
        imagePreview.innerHTML = `
            <img src="${url}" alt="Preview" onerror="handleImageError()">
        `;
    } else {
        imagePreview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-image"></i>
                <p>Nenhuma imagem selecionada</p>
                <small>URL válida mostrará a imagem aqui</small>
            </div>
        `;
    }
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function handleImageError() {
    if (!imagePreview) return;
    
    imagePreview.innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao carregar imagem</p>
            <small>Verifique a URL ou tente outra imagem</small>
        </div>
    `;
}

// ===== VALIDAÇÃO DE FORMULÁRIO =====
function validarFormulario() {
    if (!nomeProduto.value.trim()) {
        mostrarToast('Digite o nome do produto', 'error');
        nomeProduto.focus();
        return false;
    }
    
    if (tipoProdutoInput.value !== 'adicional') {
        if (!categoriaProduto.value) {
            mostrarToast('Selecione uma categoria', 'error');
            categoriaProduto.focus();
            return false;
        }
    }
    
    const preco = parseFloat(precoProduto.value);
    if (isNaN(preco) || preco < 0) {
        mostrarToast('Preço inválido', 'error');
        precoProduto.focus();
        return false;
    }
    
    const estoque = parseInt(quantidadeEstoque.value) || 0;
    if (estoque < 0) {
        mostrarToast('Estoque não pode ser negativo', 'error');
        quantidadeEstoque.focus();
        return false;
    }
    
    if (tipoProdutoInput.value !== 'adicional') {
        const urlImagem = imagemURL.value.trim();
        if (urlImagem && !isValidURL(urlImagem)) {
            mostrarToast('URL da imagem inválida', 'error');
            imagemURL.focus();
            return false;
        }
    }
    
    if (tipoProdutoInput.value === 'adicional') {
        const categoriasSelecionadas = document.querySelectorAll('.category-chip input:checked').length;
        if (categoriasSelecionadas === 0) {
            mostrarToast('Selecione pelo menos uma categoria para o adicional', 'error');
            return false;
        }
    }
    
    return true;
}

// ===== CADASTRO DE PRODUTOS =====
async function cadastrarProduto(event) {
    event.preventDefault();
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    if (!validarFormulario()) {
        isSubmitting = false;
        return;
    }
    
    // PEGAR O VALOR DO ESTOQUE ANTES DE QUALQUER CONDIÇÃO
    const quantidadeEstoqueValue = parseInt(quantidadeEstoque.value) || 0;
    
    const produtoData = {
        nome: nomeProduto.value.trim(),
        preco: parseFloat(precoProduto.value),
        status: statusProduto.checked ? 'on' : 'off',
        tipo: tipoProdutoInput.value,
        quantidade: quantidadeEstoqueValue,  // ← SALVAR SEMPRE
        quantidade_estoque: quantidadeEstoqueValue  // ← SALVAR SEMPRE NO CAMPO CORRETO DO SUPABASE
    };
    
    if (tipoProdutoInput.value === 'adicional') {
        const categorias = [];
        document.querySelectorAll('.category-chip input:checked').forEach(cb => {
            categorias.push(cb.value);
        });
        produtoData.categorias_adicionais = categorias;
        
        produtoData.descricao = '';
        produtoData.imagem_url = '';
        produtoData.peso = '';
        produtoData.max_sabores = 1;
        
        // Não definir categoria para adicional
        produtoData.categoria = 'adicional';
        
    } else {
        produtoData.categoria = categoriaProduto.value || 'outro';
        produtoData.descricao = descricaoProduto.value.trim();
        
        const urlImagem = imagemURL.value.trim();
        if (urlImagem && isValidURL(urlImagem)) {
            produtoData.imagem_url = urlImagem;
        }
        
        const pesoSelecionado = pesoProduto.value;
        let pesoFinal = null;
        
        if (pesoSelecionado) {
            const pesoEncontrado = pesosDisponiveis.find(p => p.id === pesoSelecionado);
            if (pesoEncontrado) {
                pesoFinal = pesoEncontrado.nome;
            }
        }
        
        if (pesoFinal) {
            produtoData.peso = pesoFinal;
        }
        
        if (saboresProduto && saboresProduto.value !== '1') {
            produtoData.max_sabores = parseInt(saboresProduto.value);
        }
        
        const categoriaSelecionada = categoriasDisponiveis.find(
            cat => cat.id === categoriaProduto.value
        );
        if (categoriaSelecionada) {
            produtoData.categoria_nome = categoriaSelecionada.nome;
        }
    }
    
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        if (produtoEditando) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        } else {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        }
        submitBtn.disabled = true;
        
        if (produtoEditando) {
            console.log('📝 Atualizando produto:', produtoData);
            const { error } = await supabase
                .from('produtos')
                .update(produtoData)
                .eq('id', produtoEditando);
            
            if (error) throw error;
            
            mostrarToast('Produto atualizado com sucesso!', 'success');
            produtoEditando = null;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Cadastrar Produto';
        } else {
            console.log('➕ Criando novo produto:', produtoData);
            const { error } = await supabase
                .from('produtos')
                .insert([produtoData]);
            
            if (error) throw error;
            
            mostrarToast('Produto cadastrado com sucesso!', 'success');
        }
        
        setTimeout(limparFormulario, 500);
        setTimeout(carregarProdutos, 1000);
        carregarEstatisticasSidebar();
        
    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        mostrarToast('Erro ao salvar produto: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Cadastrar Produto';
            submitBtn.disabled = false;
            isSubmitting = false;
        }, 1000);
    }
}

function limparFormulario() {
    if (!produtoForm) return;
    
    produtoForm.reset();
    tipoProdutoInput.value = 'normal';
    
    if (categoriasAdicionaisContainer) {
        categoriasAdicionaisContainer.style.display = 'none';
    }
    
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === 'normal') {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.category-chip input').forEach(cb => {
        cb.checked = false;
    });
    
    if (saboresProduto) {
        saboresProduto.value = '1';
        saboresProduto.disabled = false;
        saboresProduto.style.opacity = '1';
        saboresProduto.style.cursor = 'pointer';
    }
    
    if (categoriaProduto) {
        categoriaProduto.disabled = false;
        categoriaProduto.style.opacity = '1';
        categoriaProduto.style.cursor = 'pointer';
        if (categoriasDisponiveis.length > 0) {
            categoriaProduto.value = categoriasDisponiveis[0].id;
        }
    }
    
    alternarCamposPorTipo('normal');
    atualizarPreviewImagem();
    atualizarStatusTexto();
    atualizarIndicadorEstoque();
    
    produtoEditando = null;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Cadastrar Produto';
    submitBtn.disabled = false;
    
    const formSectionTitle = document.querySelector('.form-section h2');
    if (formSectionTitle) {
        formSectionTitle.innerHTML = '<i class="fas fa-edit"></i> Informações do Produto';
    }
    
    if (nomeProduto) {
        nomeProduto.focus();
    }
}

// ===== CARREGAMENTO DE PRODUTOS =====
async function carregarProdutos() {
    if (!produtosLista) return;
    
    mostrarLoading(true);
    
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .order('data_cadastro', { ascending: false });
        
        if (error) throw error;
        
        produtos = data.map(produto => ({
            ...produto,
            quantidade: produto.quantidade || 0,
            quantidadeEstoque: produto.quantidade_estoque || 0,
            imagemURL: produto.imagem_url,
            categoriasAdicionais: produto.categorias_adicionais || [],
            maxSabores: produto.max_sabores || 1,
            dataCadastro: produto.data_cadastro || new Date()
        }));
        
        console.log(`📦 ${produtos.length} produtos carregados do Supabase`);
        
        filtrarProdutos();
        mostrarLoading(false);
        
        if (produtos.length === 0) {
            mostrarEmptyState(true);
        } else {
            mostrarEmptyState(false);
        }
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        mostrarToast('Erro ao carregar produtos: ' + error.message, 'error');
        mostrarLoading(false);
        mostrarEmptyState(true);
    }
}

function mostrarLoading(show) {
    if (loadingProdutos) {
        loadingProdutos.style.display = show ? 'flex' : 'none';
    }
    if (produtosLista) {
        produtosLista.style.display = show ? 'none' : 'grid';
    }
}

function mostrarEmptyState(show) {
    if (emptyState) {
        emptyState.style.display = show ? 'block' : 'none';
    }
}

// ===== FILTRAGEM E EXIBIÇÃO =====
function filtrarPorStatus(status) {
    currentFilter = status;
    
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
        if (tag.dataset.filter === status) {
            tag.classList.add('active');
        }
    });
    
    filtrarProdutos();
}

function filtrarProdutos() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    produtosFiltrados = produtos.filter(produto => {
        const matchesSearch = searchTerm === '' ||
            produto.nome.toLowerCase().includes(searchTerm) ||
            (produto.descricao && produto.descricao.toLowerCase().includes(searchTerm)) ||
            (produto.peso && produto.peso.toLowerCase().includes(searchTerm));
        
        const matchesStatus = currentFilter === 'todos' ||
            (currentFilter === 'on' && (produto.status === 'on' || produto.status === 'ativo' || produto.status === true)) ||
            (currentFilter === 'off' && (produto.status === 'off' || produto.status === 'inativo' || produto.status === false));
        
        return matchesSearch && matchesStatus;
    });
    
    renderizarProdutos();
    atualizarEstatisticasExibidas();
}

function renderizarProdutos() {
    if (!produtosLista) return;
    
    produtosLista.innerHTML = '';
    
    if (produtosFiltrados.length === 0) {
        produtosLista.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente ajustar os filtros ou a busca</p>
            </div>
        `;
        return;
    }
    
    produtosFiltrados.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));
    const produtosParaExibir = produtosFiltrados.slice(0, 6);
    
    produtosParaExibir.forEach((produto, index) => {
        criarCardProduto(produto, index);
    });
}

function criarCardProduto(produto, index) {
    const card = document.createElement('div');
    
    const estaAtivo = produto.status === 'on' || produto.status === 'ativo' || produto.status === true;
    card.className = `product-card ${estaAtivo ? '' : 'inactive'}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    let estoqueClass = '';
    let estoqueIcon = 'fa-box';
    const estoqueProduto = produto.quantidade || produto.quantidadeEstoque || 0;
    let estoqueText = estoqueProduto;
    
    if (estoqueProduto === 0) {
        estoqueClass = 'empty';
        estoqueIcon = 'fa-times-circle';
        estoqueText = '0';
    } else if (estoqueProduto <= 5) {
        estoqueClass = 'low';
        estoqueIcon = 'fa-exclamation-triangle';
        estoqueText = estoqueProduto;
    }
    
    const precoFormatado = produto.preco ? 
        produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00';
    
    let categoriaTexto = '';
    if (produto.tipo === 'adicional') {
        categoriaTexto = 'Adicional';
    } else if (produto.categoria_nome) {
        categoriaTexto = produto.categoria_nome;
    } else if (produto.categoria) {
        const categoriaEncontrada = categoriasDisponiveis.find(
            cat => cat.id === produto.categoria
        );
        if (categoriaEncontrada) {
            categoriaTexto = categoriaEncontrada.nome;
        } else {
            categoriaTexto = produto.categoria.charAt(0).toUpperCase() + produto.categoria.slice(1);
        }
    } else {
        categoriaTexto = 'Sem categoria';
    }
    
    let pesoHtml = '';
    if (produto.peso && produto.tipo !== 'adicional') {
        pesoHtml = `
            <div class="product-stat">
                <span class="stat-label">Peso/Tamanho</span>
                <span class="stat-value">
                    <i class="fas fa-weight-hanging"></i>
                    ${produto.peso}
                </span>
            </div>
        `;
    }
    
    const maxSaboresProduto = produto.max_sabores || 1;
    const badgeSabores = (maxSaboresProduto > 1 && produto.tipo !== 'adicional') ? 
        `<div class="badge-sabores" title="Permite até ${maxSaboresProduto} sabores">
            <i class="fas fa-pizza-slice"></i> Até ${maxSaboresProduto} sabores
        </div>` : '';
    
    const dataFormatada = formatarData(produto.dataCadastro);
    
    const badgeAdicional = produto.tipo === 'adicional' ? 
        '<div class="badge-adicional" title="Produto Adicional"><i class="fas fa-plus"></i></div>' : '';
    
    let badgeCategoriasAdicionais = '';
    if (produto.tipo === 'adicional' && produto.categorias_adicionais && produto.categorias_adicionais.length > 0) {
        const categoriasTexto = produto.categorias_adicionais.map(catId => {
            const cat = categoriasDisponiveis.find(c => c.id === catId);
            return cat ? cat.nome.replace(cat.icon + ' ', '') : catId;
        }).join(', ');
        
        badgeCategoriasAdicionais = `
            <div class="badge-categorias" title="Disponível para: ${categoriasTexto}" style="background: var(--accent-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-left: 8px;">
                <i class="fas fa-tags"></i> ${produto.categorias_adicionais.length} cat(s)
            </div>
        `;
    }
    
    const textoBotaoToggle = estaAtivo ? 'Desativar' : 'Ativar';
    const iconeBotaoToggle = estaAtivo ? 'fa-toggle-off' : 'fa-toggle-on';
    
    card.innerHTML = `
        ${badgeAdicional}
        
        <div class="product-card-header">
            <div class="product-image">
                ${produto.imagemURL || produto.imagem_url ? 
                    `<img src="${produto.imagemURL || produto.imagem_url}" alt="${produto.nome}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-box\\'></i>';">` :
                    `<i class="fas fa-box"></i>`
                }
            </div>
            <div class="product-info">
                <h3 class="product-title" title="${produto.nome}">${produto.nome}</h3>
                <div class="product-meta">
                    <span class="product-category">
                        <i class="fas fa-tag"></i>
                        ${categoriaTexto}
                    </span>
                    ${badgeSabores}
                    ${badgeCategoriasAdicionais}
                    <span class="product-status ${estaAtivo ? 'status-active' : 'status-inactive'}">
                        ${estaAtivo ? 'ATIVO' : 'INATIVO'}
                    </span>
                </div>
            </div>
        </div>
        
        <div class="product-card-body">
            ${produto.descricao && produto.tipo !== 'adicional' ? 
                `<p class="product-description" title="${produto.descricao}">${produto.descricao}</p>` :
                produto.tipo === 'adicional' && produto.categorias_adicionais && produto.categorias_adicionais.length > 0 ?
                `<p class="product-description" style="color: var(--text-muted); font-style: italic;">Disponível para ${produto.categorias_adicionais.length} categoria(s)</p>` :
                '<p class="product-description" style="color: var(--text-muted); font-style: italic;">Sem descrição</p>'
            }
            
            <div class="product-stats">
                <div class="product-stat">
                    <span class="stat-label">Preço</span>
                    <span class="stat-value price">R$ ${precoFormatado}</span>
                </div>
                ${pesoHtml}
                <div class="product-stat">
                    <span class="stat-label">${produto.tipo === 'adicional' ? 'Tipo' : 'Estoque'}</span>
                    <span class="stat-value ${produto.tipo === 'adicional' ? '' : 'stock ' + estoqueClass}">
                        ${produto.tipo === 'adicional' ? 
                            'Adicional' : 
                            `<i class="fas ${estoqueIcon}"></i> ${estoqueText}`
                        }
                    </span>
                </div>
            </div>
        </div>
        
        <div class="product-card-footer">
            <button class="product-action toggle" onclick="alternarStatusProduto('${produto.id}', ${estaAtivo})">
                <i class="fas ${iconeBotaoToggle}"></i>
                ${textoBotaoToggle}
            </button>
            <button class="product-action edit" onclick="editarProduto('${produto.id}')">
                <i class="fas fa-edit"></i>
                Editar
            </button>
            <button class="product-action delete" onclick="excluirProduto('${produto.id}', '${produto.nome}')">
                <i class="fas fa-trash-alt"></i>
                Excluir
            </button>
        </div>
    `;
    
    produtosLista.appendChild(card);
}

// ===== ESTATÍSTICAS =====
function atualizarEstatisticasExibidas() {
    if (totalExibidos) {
        totalExibidos.textContent = produtosFiltrados.length;
    }
    
    if (panelSubtitle) {
        panelSubtitle.innerHTML = `Total: <span id="totalExibidos">${produtosFiltrados.length}</span> produtos`;
    }
    
    if (infoText) {
        const texto = produtosFiltrados.length === produtos.length ? 
            'Mostrando todos os produtos' :
            `Mostrando ${produtosFiltrados.length} de ${produtos.length} produtos`;
        infoText.textContent = texto;
    }
}

// ===== OPERAÇÕES CRUD =====
async function alternarStatusProduto(id, estaAtivo) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        const novoStatus = estaAtivo ? 'off' : 'on';
        console.log(`🔄 Alternando status do produto ${id} para: ${novoStatus}`);
        
        const { error } = await supabase
            .from('produtos')
            .update({ 
                status: novoStatus,
                data_atualizacao: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        console.log(`✅ Status do produto ${id} alterado para ${novoStatus}`);
        
        atualizarInterfaceAposMudancaStatus(id, novoStatus);
        carregarEstatisticasSidebar();
        mostrarToast(`Produto ${novoStatus === 'on' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
        
    } catch (error) {
        console.error('Erro ao alternar status:', error);
        mostrarToast('Erro ao alterar status do produto: ' + error.message, 'error');
    }
}

function atualizarInterfaceAposMudancaStatus(produtoId, novoStatus) {
    console.log(`🔄 Atualizando interface para produto ${produtoId}, novo status: ${novoStatus}`);
    
    const produtoIndex = produtos.findIndex(p => p.id === produtoId);
    if (produtoIndex !== -1) {
        produtos[produtoIndex].status = novoStatus;
        console.log(`✅ Status atualizado no array local`);
    }
    
    const produtoFiltradoIndex = produtosFiltrados.findIndex(p => p.id === produtoId);
    if (produtoFiltradoIndex !== -1) {
        produtosFiltrados[produtoFiltradoIndex].status = novoStatus;
        console.log(`✅ Status atualizado no array filtrado`);
    }
    
    renderizarProdutos();
    atualizarEstatisticasExibidas();
    
    console.log(`✅ Interface atualizada com sucesso`);
}

async function editarProduto(id) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            mostrarToast('Produto não encontrado', 'error');
            return;
        }
        
        const produto = data;
        console.log('📝 Editando produto:', produto);
        
        nomeProduto.value = produto.nome || '';
        
        const tipoProduto = produto.tipo || 'normal';
        tipoProdutoInput.value = tipoProduto;
        
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === tipoProduto) {
                btn.classList.add('active');
            }
        });
        
        alternarCamposPorTipo(tipoProduto);
        
        if (tipoProduto === 'adicional') {
            categoriasAdicionaisContainer.style.display = 'block';
            
            if (categoriaProduto) {
                categoriaProduto.disabled = true;
                categoriaProduto.style.opacity = '0.5';
                categoriaProduto.style.cursor = 'not-allowed';
                categoriaProduto.value = '';
            }
            
            if (saboresProduto) {
                saboresProduto.disabled = true;
                saboresProduto.style.opacity = '0.5';
                saboresProduto.style.cursor = 'not-allowed';
                saboresProduto.value = '1';
            }
            
            if (produto.categorias_adicionais && Array.isArray(produto.categorias_adicionais)) {
                document.querySelectorAll('.category-chip input').forEach(cb => {
                    cb.checked = produto.categorias_adicionais.includes(cb.value);
                });
            }
            
            // Carregar estoque para adicionais também
            if (quantidadeEstoque) {
                quantidadeEstoque.value = produto.quantidade_estoque || produto.quantidade || 0;
            }
            
        } else {
            descricaoProduto.value = produto.descricao || '';
            
            if (produto.categoria) {
                categoriaProduto.value = produto.categoria;
            }
            
            if (quantidadeEstoque) {
                quantidadeEstoque.value = produto.quantidade_estoque || produto.quantidade || 0;
            }
            
            imagemURL.value = produto.imagem_url || produto.imagemURL || '';
            
            if (produto.peso) {
                const pesoEncontrado = pesosDisponiveis.find(p => 
                    p.id === produto.peso || p.nome === produto.peso
                );
                
                if (pesoEncontrado) {
                    pesoProduto.value = pesoEncontrado.id;
                } else {
                    pesoProduto.value = '';
                }
            } else {
                pesoProduto.value = '';
            }
            
            if (saboresProduto) {
                const saboresValue = produto.max_sabores || 1;
                saboresProduto.value = saboresValue.toString();
            }
        }
        
        precoProduto.value = produto.preco || 0;
        
        const isAtivo = produto.status === 'on' || produto.status === 'ativo' || produto.status === true;
        statusProduto.checked = isAtivo;
        atualizarStatusTexto();
        
        atualizarPreviewImagem();
        atualizarIndicadorEstoque();
        
        produtoEditando = id;
        
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
        const formSectionTitle = document.querySelector('.form-section h2');
        if (formSectionTitle) {
            formSectionTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Produto';
        }
        
        const formSection = document.querySelector('.form-section');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        nomeProduto.focus();
        
    } catch (error) {
        console.error('Erro ao carregar produto para edição:', error);
        mostrarToast('Erro ao carregar produto: ' + error.message, 'error');
    }
}

async function excluirProduto(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir o produto "${nome}"?\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        if (produtoEditando === id) {
            limparFormulario();
        }
        
        const produtoIndex = produtos.findIndex(p => p.id === id);
        if (produtoIndex !== -1) {
            produtos.splice(produtoIndex, 1);
        }
        
        const produtoFiltradoIndex = produtosFiltrados.findIndex(p => p.id === id);
        if (produtoFiltradoIndex !== -1) {
            produtosFiltrados.splice(produtoFiltradoIndex, 1);
        }
        
        renderizarProdutos();
        atualizarEstatisticasExibidas();
        
        carregarEstatisticasSidebar();
        
        mostrarToast(`Produto "${nome}" excluído com sucesso!`, 'success');
        
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        mostrarToast('Erro ao excluir produto: ' + error.message, 'error');
    }
}

function mostrarTodosProdutos() {
    if (!produtosLista) return;
    
    produtosLista.innerHTML = '';
    produtosFiltrados.forEach((produto, index) => {
        criarCardProduto(produto, index);
    });
    
    if (infoText) {
        infoText.textContent = `Mostrando todos os ${produtosFiltrados.length} produtos`;
    }
}

function recarregarProdutos() {
    carregarProdutos();
    carregarEstatisticasSidebar();
}

// ===== UTILITÁRIOS =====
function formatarData(data) {
    if (!data) return 'Data desconhecida';
    
    const agora = new Date();
    const dataProduto = new Date(data);
    
    if (isNaN(dataProduto.getTime())) {
        return 'Data inválida';
    }
    
    const diffMs = agora - dataProduto;
    const diffMinutos = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);
    
    if (diffMinutos < 1) return 'Agora';
    if (diffMinutos < 60) return `${diffMinutos}m`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    
    return dataProduto.toLocaleDateString('pt-BR');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== NOTIFICAÇÕES TOAST =====
function mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[tipo] || 'fa-info-circle'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${tipo === 'success' ? 'Sucesso' : tipo === 'error' ? 'Erro' : 'Aviso'}</div>
            <div class="toast-message">${mensagem}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ===== FUNÇÕES GLOBAIS =====
window.selecionarTipo = selecionarTipo;
window.atualizarPreviewImagem = atualizarPreviewImagem;
window.handleImageError = handleImageError;
window.filtrarPorStatus = filtrarPorStatus;
window.mostrarTodosProdutos = mostrarTodosProdutos;
window.recarregarProdutos = recarregarProdutos;
window.alternarStatusProduto = alternarStatusProduto;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.voltarParaDashboard = voltarParaDashboard;