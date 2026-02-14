// ===== SISTEMA DE GERENCIAMENTO DE CATEGORIAS =====

// Categorias padrão
let categorias = [
    { id: 'comida', nome: '🍕 Comida', icon: '🍕' },
    { id: 'bebida', nome: '🥤 Bebida', icon: '🥤' },
    { id: 'sobremesa', nome: '🍰 Sobremesa', icon: '🍰' },
    { id: 'outro', nome: '📦 Outro', icon: '📦' }
];

// Elementos DOM para categorias
const novaCategoriaInput = document.getElementById('novaCategoria');
const btnAdicionarCategoria = document.getElementById('btnAdicionarCategoria');
const categoriasList = document.getElementById('categoriasList');
const totalCategoriasSpan = document.getElementById('totalCategorias');
const btnAtualizarCategorias = document.getElementById('btnAtualizarCategorias');
const btnRestaurarPadroesCategorias = document.getElementById('btnRestaurarPadroesCategorias');

// Elementos do modal de edição de categoria
const modalEdicaoCategoria = document.getElementById('modalEdicaoCategoria');
const categoriaEditNome = document.getElementById('categoriaEditNome');
const categoriaEditIcone = document.getElementById('categoriaEditIcone');
const categoriaEditId = document.getElementById('categoriaEditId');
const btnFecharModalCategoria = document.getElementById('btnFecharModalCategoria');
const btnCancelarEdicaoCategoria = document.getElementById('btnCancelarEdicaoCategoria');
const btnSalvarEdicaoCategoria = document.getElementById('btnSalvarEdicaoCategoria');

// Estado de edição de categoria
let categoriaEditando = null;

// ===== SISTEMA DE GERENCIAMENTO DE PESOS/TAMANHOS (SIMPLIFICADO SEM UNIDADE) =====

// Pesos padrão (SIMPLIFICADO - SEM UNIDADE)
let pesos = [
    { id: 'pequeno', nome: 'Pequeno' },
    { id: 'medio', nome: 'Médio' },
    { id: 'grande', nome: 'Grande' },
    { id: '300g', nome: '300g' },
    { id: '500ml', nome: '500ml' }
];

// Elementos DOM para pesos
const novoPesoNome = document.getElementById('novoPesoNome');
const btnAdicionarPeso = document.getElementById('btnAdicionarPeso');
const pesosList = document.getElementById('pesosList');
const totalPesosSpan = document.getElementById('totalPesos');
const btnAtualizarPesos = document.getElementById('btnAtualizarPesos');
const btnRestaurarPadroesPesos = document.getElementById('btnRestaurarPadroesPesos');

// Elementos do modal de edição de peso (SIMPLIFICADO)
const modalEdicaoPeso = document.getElementById('modalEdicaoPeso');
const pesoEditNome = document.getElementById('pesoEditNome');
const pesoEditId = document.getElementById('pesoEditId');
const btnFecharModalPeso = document.getElementById('btnFecharModalPeso');
const btnCancelarEdicaoPeso = document.getElementById('btnCancelarEdicaoPeso');
const btnSalvarEdicaoPeso = document.getElementById('btnSalvarEdicaoPeso');

// Estado de edição de peso
let pesoEditando = null;

// ===== SISTEMA DE CONFIGURAÇÃO DE SABORES SIMPLIFICADA =====

let configSabores = {
    maxSabores: 2,
    ultimaAtualizacao: null
};

// Elementos DOM para configuração de sabores
const maxSaboresInput = document.getElementById('maxSabores');
const btnSalvarSabores = document.getElementById('btnSalvarSabores');
const configAtualSabores = document.getElementById('configAtualSabores');
const configAtualData = document.getElementById('configAtualData');
const btnAtualizarSabores = document.getElementById('btnAtualizarSabores');
const btnRestaurarSabores = document.getElementById('btnRestaurarSabores');

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Configurações inicializado');
    
    // Inicializar sistema de categorias
    inicializarSistemaCategorias();
    
    // Inicializar sistema de pesos
    inicializarSistemaPesos();
    
    // Inicializar sistema de configuração de sabores
    inicializarSistemaSabores();
    
    // Inicializar outros sistemas
    inicializarSistemaConfiguracoes();
    inicializarDataHora();
    setupMobileMenu();
});

// ===== SISTEMA DE CATEGORIAS =====

function inicializarSistemaCategorias() {
    carregarCategoriasDoStorage();
    renderizarCategorias();
    setupEventListenersCategorias();
}

// Carregar categorias do localStorage
function carregarCategoriasDoStorage() {
    try {
        const categoriasSalvas = localStorage.getItem('categoriasProdutos');
        if (categoriasSalvas) {
            const categoriasParsed = JSON.parse(categoriasSalvas);
            if (Array.isArray(categoriasParsed) && categoriasParsed.length > 0) {
                categorias = categoriasParsed;
                console.log('✅ Categorias carregadas do localStorage:', categorias.length);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
    }
}

// Salvar categorias no localStorage
function salvarCategoriasNoStorage() {
    try {
        localStorage.setItem('categoriasProdutos', JSON.stringify(categorias));
        console.log('💾 Categorias salvas no localStorage');
        
        // Disparar evento personalizado para notificar outras páginas
        window.dispatchEvent(new CustomEvent('categoriasAtualizadas', { 
            detail: { categorias: categorias } 
        }));
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar categorias:', error);
        return false;
    }
}

// Renderizar lista de categorias
function renderizarCategorias() {
    if (!categoriasList) return;
    
    categoriasList.innerHTML = '';
    
    if (categorias.length === 0) {
        categoriasList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-layer-group"></i>
                <p>Nenhuma categoria cadastrada</p>
                <small>Adicione categorias usando o formulário acima</small>
            </div>
        `;
        if (totalCategoriasSpan) {
            totalCategoriasSpan.textContent = '0';
        }
        return;
    }
    
    categorias.forEach(categoria => {
        const categoriaItem = document.createElement('div');
        categoriaItem.className = 'categoria-item';
        categoriaItem.setAttribute('data-id', categoria.id);
        
        // Extrair apenas o nome sem o ícone para exibição
        const nomeSemIcone = categoria.nome.replace(categoria.icon + ' ', '');
        
        categoriaItem.innerHTML = `
            <span class="categoria-nome">
                ${categoria.icon || '📦'} ${nomeSemIcone}
            </span>
            <div class="categoria-actions">
                <button class="btn-icon edit" data-id="${categoria.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" data-id="${categoria.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        categoriasList.appendChild(categoriaItem);
    });
    
    if (totalCategoriasSpan) {
        totalCategoriasSpan.textContent = categorias.length.toString();
    }
}

// Configurar event listeners para categorias
function setupEventListenersCategorias() {
    // Adicionar categoria
    if (btnAdicionarCategoria && novaCategoriaInput) {
        btnAdicionarCategoria.addEventListener('click', adicionarCategoria);
        novaCategoriaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adicionarCategoria();
            }
        });
    }
    
    // Atualizar lista
    if (btnAtualizarCategorias) {
        btnAtualizarCategorias.addEventListener('click', function() {
            renderizarCategorias();
            mostrarNotificacao('Lista de categorias atualizada!', 'success');
        });
    }
    
    // Restaurar padrões
    if (btnRestaurarPadroesCategorias) {
        btnRestaurarPadroesCategorias.addEventListener('click', restaurarCategoriasPadrao);
    }
    
    // Delegar eventos para botões de edição/exclusão
    if (categoriasList) {
        categoriasList.addEventListener('click', function(e) {
            const target = e.target.closest('.btn-icon');
            if (!target) return;
            
            const categoriaId = target.getAttribute('data-id');
            if (!categoriaId) return;
            
            if (target.classList.contains('edit')) {
                abrirModalEdicaoCategoria(categoriaId);
            } else if (target.classList.contains('delete')) {
                excluirCategoria(categoriaId);
            }
        });
    }
    
    // Modal de edição de categoria
    if (btnFecharModalCategoria) {
        btnFecharModalCategoria.addEventListener('click', fecharModalEdicaoCategoria);
    }
    
    if (btnCancelarEdicaoCategoria) {
        btnCancelarEdicaoCategoria.addEventListener('click', fecharModalEdicaoCategoria);
    }
    
    if (btnSalvarEdicaoCategoria) {
        btnSalvarEdicaoCategoria.addEventListener('click', salvarEdicaoCategoria);
    }
    
    // Fechar modal ao clicar fora
    if (modalEdicaoCategoria) {
        modalEdicaoCategoria.addEventListener('click', function(e) {
            if (e.target === modalEdicaoCategoria) {
                fecharModalEdicaoCategoria();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalEdicaoCategoria.style.display === 'flex') {
            fecharModalEdicaoCategoria();
        }
    });
}

// Adicionar nova categoria
function adicionarCategoria() {
    const nome = novaCategoriaInput.value.trim();
    
    if (!nome) {
        mostrarNotificacao('Digite o nome da categoria', 'error');
        novaCategoriaInput.focus();
        return;
    }
    
    // Verificar se já existe categoria com mesmo nome (case insensitive)
    const nomeNormalizado = nome.toLowerCase();
    const existeCategoria = categorias.some(cat => {
        const nomeCategoriaSemIcone = cat.nome.replace(cat.icon + ' ', '').toLowerCase();
        return nomeCategoriaSemIcone === nomeNormalizado;
    });
    
    if (existeCategoria) {
        mostrarNotificacao('Já existe uma categoria com este nome', 'error');
        novaCategoriaInput.focus();
        return;
    }
    
    // Gerar ID único
    const id = gerarIdCategoria(nome);
    
    // Determinar ícone com base no nome
    const icon = determinarIconeCategoria(nome);
    
    // Adicionar categoria
    categorias.push({
        id: id,
        nome: `${icon} ${nome}`,
        icon: icon
    });
    
    // Salvar no localStorage
    if (salvarCategoriasNoStorage()) {
        // Renderizar lista atualizada
        renderizarCategorias();
        
        // Limpar campo e mostrar notificação
        novaCategoriaInput.value = '';
        mostrarNotificacao(`Categoria "${nome}" adicionada com sucesso!`, 'success');
        
        // Focar no campo novamente
        novaCategoriaInput.focus();
    }
}

// Gerar ID para categoria
function gerarIdCategoria(nome) {
    // Converter para slug: "Nome da Categoria" -> "nome-da-categoria"
    return nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Determinar ícone baseado no nome da categoria
function determinarIconeCategoria(nome) {
    const nomeLower = nome.toLowerCase();
    
    const iconMap = {
        'pizza': '🍕',
        'hamburguer': '🍔',
        'lanche': '🍔',
        'sanduíche': '🥪',
        'sanduiche': '🥪',
        'bebida': '🥤',
        'refrigerante': '🥤',
        'suco': '🧃',
        'cerveja': '🍺',
        'vinho': '🍷',
        'sobremesa': '🍰',
        'doce': '🍬',
        'sorvete': '🍦',
        'bolo': '🎂',
        'café': '☕',
        'cafe': '☕',
        'chá': '🫖',
        'cha': '🫖',
        'salada': '🥗',
        'fruta': '🍎',
        'vegetariano': '🥬',
        'massas': '🍝',
        'massa': '🍝',
        'carne': '🥩',
        'peixe': '🐟',
        'frango': '🍗',
        'vegetais': '🥦',
        'arroz': '🍚',
        'feijão': '🥘',
        'feijao': '🥘',
        'sopa': '🍲',
        'queijo': '🧀',
        'ovo': '🥚',
        'pão': '🥖',
        'pao': '🥖'
    };
    
    // Procurar por palavras-chave no nome
    for (const [keyword, icon] of Object.entries(iconMap)) {
        if (nomeLower.includes(keyword)) {
            return icon;
        }
    }
    
    // Se não encontrar, usar ícone padrão
    return '📦';
}

// Abrir modal para edição de categoria
function abrirModalEdicaoCategoria(categoriaId) {
    const categoria = categorias.find(cat => cat.id === categoriaId);
    if (!categoria) return;
    
    categoriaEditando = categoriaId;
    
    // Extrair nome sem ícone para edição
    const nomeSemIcone = categoria.nome.replace(categoria.icon + ' ', '');
    categoriaEditNome.value = nomeSemIcone;
    categoriaEditId.value = categoriaId;
    
    // Selecionar ícone correspondente
    if (categoria.icon) {
        for (let i = 0; i < categoriaEditIcone.options.length; i++) {
            if (categoriaEditIcone.options[i].value === categoria.icon) {
                categoriaEditIcone.selectedIndex = i;
                break;
            }
        }
    }
    
    // Mostrar modal
    modalEdicaoCategoria.style.display = 'flex';
    setTimeout(() => {
        modalEdicaoCategoria.classList.add('active');
        categoriaEditNome.focus();
    }, 10);
}

// Fechar modal de edição de categoria
function fecharModalEdicaoCategoria() {
    modalEdicaoCategoria.classList.remove('active');
    setTimeout(() => {
        modalEdicaoCategoria.style.display = 'none';
        categoriaEditando = null;
        categoriaEditNome.value = '';
        categoriaEditId.value = '';
        categoriaEditIcone.selectedIndex = 0;
    }, 300);
}

// Salvar edição da categoria
function salvarEdicaoCategoria() {
    const novoNome = categoriaEditNome.value.trim();
    const novoIcone = categoriaEditIcone.value;
    const categoriaId = categoriaEditId.value;
    
    if (!novoNome) {
        mostrarNotificacao('Digite o nome da categoria', 'error');
        categoriaEditNome.focus();
        return;
    }
    
    // Verificar se o novo nome já existe (excluindo a própria categoria)
    const nomeNormalizado = novoNome.toLowerCase();
    const existeOutraCategoria = categorias.some(cat => {
        if (cat.id === categoriaId) return false;
        const nomeCategoriaSemIcone = cat.nome.replace(cat.icon + ' ', '').toLowerCase();
        return nomeCategoriaSemIcone === nomeNormalizado;
    });
    
    if (existeOutraCategoria) {
        mostrarNotificacao('Já existe outra categoria com este nome', 'error');
        categoriaEditNome.focus();
        return;
    }
    
    // Encontrar e atualizar categoria
    const index = categorias.findIndex(cat => cat.id === categoriaId);
    if (index !== -1) {
        categorias[index].nome = `${novoIcone} ${novoNome}`;
        categorias[index].icon = novoIcone;
        
        // Salvar no localStorage
        if (salvarCategoriasNoStorage()) {
            // Renderizar lista atualizada
            renderizarCategorias();
            
            // Fechar modal e mostrar notificação
            fecharModalEdicaoCategoria();
            mostrarNotificacao('Categoria atualizada com sucesso!', 'success');
        }
    }
}

// Excluir categoria
function excluirCategoria(categoriaId) {
    // Encontrar categoria
    const categoria = categorias.find(cat => cat.id === categoriaId);
    if (!categoria) return;
    
    // Extrair nome sem ícone para mensagem
    const nomeSemIcone = categoria.nome.replace(categoria.icon + ' ', '');
    
    // Verificar se é uma categoria padrão
    const categoriasPadraoIds = ['comida', 'bebida', 'sobremesa', 'outro'];
    if (categoriasPadraoIds.includes(categoriaId)) {
        if (!confirm(`A categoria "${nomeSemIcone}" é uma categoria padrão. Tem certeza que deseja excluí-la?`)) {
            return;
        }
    } else {
        if (!confirm(`Tem certeza que deseja excluir a categoria "${nomeSemIcone}"?\nEsta ação não pode ser desfeita.`)) {
            return;
        }
    }
    
    // Remover categoria
    categorias = categorias.filter(cat => cat.id !== categoriaId);
    
    // Salvar no localStorage
    if (salvarCategoriasNoStorage()) {
        // Renderizar lista atualizada
        renderizarCategorias();
        
        mostrarNotificacao(`Categoria "${nomeSemIcone}" excluída com sucesso!`, 'success');
    }
}

// Restaurar categorias padrão
function restaurarCategoriasPadrao() {
    if (!confirm('Isso irá restaurar as categorias padrão e remover todas as categorias personalizadas. Deseja continuar?')) {
        return;
    }
    
    categorias = [
        { id: 'comida', nome: '🍕 Comida', icon: '🍕' },
        { id: 'bebida', nome: '🥤 Bebida', icon: '🥤' },
        { id: 'sobremesa', nome: '🍰 Sobremesa', icon: '🍰' },
        { id: 'outro', nome: '📦 Outro', icon: '📦' }
    ];
    
    // Salvar no localStorage
    if (salvarCategoriasNoStorage()) {
        // Renderizar lista atualizada
        renderizarCategorias();
        
        mostrarNotificacao('Categorias padrão restauradas com sucesso!', 'success');
    }
}

// ===== SISTEMA DE PESOS/TAMANHOS (SIMPLIFICADO SEM UNIDADE) =====

function inicializarSistemaPesos() {
    carregarPesosDoStorage();
    renderizarPesos();
    setupEventListenersPesos();
}

// Carregar pesos do localStorage
function carregarPesosDoStorage() {
    try {
        const pesosSalvos = localStorage.getItem('pesosProdutos');
        if (pesosSalvos) {
            const pesosParsed = JSON.parse(pesosSalvos);
            if (Array.isArray(pesosParsed) && pesosParsed.length > 0) {
                pesos = pesosParsed;
                console.log('✅ Pesos carregados do localStorage:', pesos.length);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar pesos:', error);
    }
}

// Salvar pesos no localStorage
function salvarPesosNoStorage() {
    try {
        localStorage.setItem('pesosProdutos', JSON.stringify(pesos));
        console.log('💾 Pesos salvas no localStorage');
        
        // Disparar evento personalizado para notificar outras páginas
        window.dispatchEvent(new CustomEvent('pesosAtualizados', { 
            detail: { pesos: pesos } 
        }));
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar pesos:', error);
        return false;
    }
}

// Renderizar lista de pesos (SIMPLIFICADO SEM UNIDADE)
function renderizarPesos() {
    if (!pesosList) return;
    
    pesosList.innerHTML = '';
    
    if (pesos.length === 0) {
        pesosList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-weight"></i>
                <p>Nenhum peso/tamanho cadastrado</p>
                <small>Adicione pesos/tamanhos usando o formulário acima</small>
            </div>
        `;
        if (totalPesosSpan) {
            totalPesosSpan.textContent = '0';
        }
        return;
    }
    
    // Ordenar pesos por nome
    pesos.sort((a, b) => {
        return a.nome.localeCompare(b.nome);
    });
    
    pesos.forEach(peso => {
        const pesoItem = document.createElement('div');
        pesoItem.className = 'peso-item';
        pesoItem.setAttribute('data-id', peso.id);
        
        pesoItem.innerHTML = `
            <div class="peso-info">
                <span class="peso-nome">
                    <i class="fas fa-weight-hanging"></i>
                    ${peso.nome}
                </span>
            </div>
            <div class="peso-actions">
                <button class="btn-icon edit" data-id="${peso.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" data-id="${peso.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        pesosList.appendChild(pesoItem);
    });
    
    if (totalPesosSpan) {
        totalPesosSpan.textContent = pesos.length.toString();
    }
}

// Configurar event listeners para pesos
function setupEventListenersPesos() {
    // Adicionar peso
    if (btnAdicionarPeso && novoPesoNome) {
        btnAdicionarPeso.addEventListener('click', adicionarPeso);
        novoPesoNome.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adicionarPeso();
            }
        });
    }
    
    // Atualizar lista
    if (btnAtualizarPesos) {
        btnAtualizarPesos.addEventListener('click', function() {
            renderizarPesos();
            mostrarNotificacao('Lista de pesos atualizada!', 'success');
        });
    }
    
    // Restaurar padrões
    if (btnRestaurarPadroesPesos) {
        btnRestaurarPadroesPesos.addEventListener('click', restaurarPesosPadrao);
    }
    
    // Delegar eventos para botões de edição/exclusão
    if (pesosList) {
        pesosList.addEventListener('click', function(e) {
            const target = e.target.closest('.btn-icon');
            if (!target) return;
            
            const pesoId = target.getAttribute('data-id');
            if (!pesoId) return;
            
            if (target.classList.contains('edit')) {
                abrirModalEdicaoPeso(pesoId);
            } else if (target.classList.contains('delete')) {
                excluirPeso(pesoId);
            }
        });
    }
    
    // Modal de edição de peso
    if (btnFecharModalPeso) {
        btnFecharModalPeso.addEventListener('click', fecharModalEdicaoPeso);
    }
    
    if (btnCancelarEdicaoPeso) {
        btnCancelarEdicaoPeso.addEventListener('click', fecharModalEdicaoPeso);
    }
    
    if (btnSalvarEdicaoPeso) {
        btnSalvarEdicaoPeso.addEventListener('click', salvarEdicaoPeso);
    }
    
    // Fechar modal ao clicar fora
    if (modalEdicaoPeso) {
        modalEdicaoPeso.addEventListener('click', function(e) {
            if (e.target === modalEdicaoPeso) {
                fecharModalEdicaoPeso();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalEdicaoPeso.style.display === 'flex') {
            fecharModalEdicaoPeso();
        }
    });
}

// Adicionar novo peso/tamanho (SIMPLIFICADO SEM UNIDADE)
function adicionarPeso() {
    const nome = novoPesoNome.value.trim();
    
    if (!nome) {
        mostrarNotificacao('Digite o nome do peso/tamanho', 'error');
        novoPesoNome.focus();
        return;
    }
    
    // Verificar se já existe peso com mesmo nome (case insensitive)
    const nomeNormalizado = nome.toLowerCase();
    const existePeso = pesos.some(peso => 
        peso.nome.toLowerCase() === nomeNormalizado
    );
    
    if (existePeso) {
        mostrarNotificacao('Já existe um peso/tamanho com este nome', 'error');
        novoPesoNome.focus();
        return;
    }
    
    // Gerar ID único
    const id = gerarIdPeso(nome);
    
    // Adicionar peso (SEM unidade)
    pesos.push({
        id: id,
        nome: nome
    });
    
    // Salvar no localStorage
    if (salvarPesosNoStorage()) {
        // Renderizar lista atualizada
        renderizarPesos();
        
        // Limpar campo e mostrar notificação
        novoPesoNome.value = '';
        mostrarNotificacao(`Peso/tamanho "${nome}" adicionado com sucesso!`, 'success');
        
        // Focar no campo novamente
        novoPesoNome.focus();
    }
}

// Gerar ID para peso
function gerarIdPeso(nome) {
    // Converter para slug: "Nome do Peso" -> "nome-do-peso"
    return nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Abrir modal para edição de peso (SIMPLIFICADO)
function abrirModalEdicaoPeso(pesoId) {
    const peso = pesos.find(p => p.id === pesoId);
    if (!peso) return;
    
    pesoEditando = pesoId;
    pesoEditNome.value = peso.nome;
    pesoEditId.value = pesoId;
    
    // Mostrar modal
    modalEdicaoPeso.style.display = 'flex';
    setTimeout(() => {
        modalEdicaoPeso.classList.add('active');
        pesoEditNome.focus();
    }, 10);
}

// Fechar modal de edição de peso
function fecharModalEdicaoPeso() {
    modalEdicaoPeso.classList.remove('active');
    setTimeout(() => {
        modalEdicaoPeso.style.display = 'none';
        pesoEditando = null;
        pesoEditNome.value = '';
        pesoEditId.value = '';
    }, 300);
}

// Salvar edição do peso (SIMPLIFICADO SEM UNIDADE)
function salvarEdicaoPeso() {
    const novoNome = pesoEditNome.value.trim();
    const pesoId = pesoEditId.value;
    
    if (!novoNome) {
        mostrarNotificacao('Digite o nome do peso/tamanho', 'error');
        pesoEditNome.focus();
        return;
    }
    
    // Verificar se o novo nome já existe (excluindo o próprio peso)
    const nomeNormalizado = novoNome.toLowerCase();
    const existeOutroPeso = pesos.some(p => 
        p.id !== pesoId && p.nome.toLowerCase() === nomeNormalizado
    );
    
    if (existeOutroPeso) {
        mostrarNotificacao('Já existe outro peso/tamanho com este nome', 'error');
        pesoEditNome.focus();
        return;
    }
    
    // Encontrar e atualizar peso
    const index = pesos.findIndex(p => p.id === pesoId);
    if (index !== -1) {
        pesos[index].nome = novoNome;
        
        // Salvar no localStorage
        if (salvarPesosNoStorage()) {
            // Renderizar lista atualizada
            renderizarPesos();
            
            // Fechar modal e mostrar notificação
            fecharModalEdicaoPeso();
            mostrarNotificacao('Peso/tamanho atualizado com sucesso!', 'success');
        }
    }
}

// Excluir peso
function excluirPeso(pesoId) {
    // Encontrar peso
    const peso = pesos.find(p => p.id === pesoId);
    if (!peso) return;
    
    // Verificar se é um peso padrão
    const pesosPadraoIds = ['pequeno', 'medio', 'grande', '300g', '500ml'];
    if (pesosPadraoIds.includes(pesoId)) {
        if (!confirm(`O peso/tamanho "${peso.nome}" é um padrão do sistema. Tem certeza que deseja excluí-lo?`)) {
            return;
        }
    } else {
        if (!confirm(`Tem certeza que deseja excluir o peso/tamanho "${peso.nome}"?\nEsta ação não pode ser desfeita.`)) {
            return;
        }
    }
    
    // Remover peso
    pesos = pesos.filter(p => p.id !== pesoId);
    
    // Salvar no localStorage
    if (salvarPesosNoStorage()) {
        // Renderizar lista atualizada
        renderizarPesos();
        
        mostrarNotificacao(`Peso/tamanho "${peso.nome}" excluído com sucesso!`, 'success');
    }
}

// Restaurar pesos padrão (SIMPLIFICADO SEM UNIDADE)
function restaurarPesosPadrao() {
    if (!confirm('Isso irá restaurar os pesos/tamanhos padrão e remover todos os pesos personalizados. Deseja continuar?')) {
        return;
    }
    
    pesos = [
        { id: 'pequeno', nome: 'Pequeno' },
        { id: 'medio', nome: 'Médio' },
        { id: 'grande', nome: 'Grande' },
        { id: '300g', nome: '300g' },
        { id: '500ml', nome: '500ml' }
    ];
    
    // Salvar no localStorage
    if (salvarPesosNoStorage()) {
        // Renderizar lista atualizada
        renderizarPesos();
        
        mostrarNotificacao('Pesos/tamanhos padrão restaurados com sucesso!', 'success');
    }
}

// ===== SISTEMA DE CONFIGURAÇÃO DE SABORES SIMPLIFICADA =====

function inicializarSistemaSabores() {
    carregarConfigSaboresDoStorage();
    renderizarConfigSabores();
    setupEventListenersSabores();
}

// Carregar configuração de sabores do localStorage
function carregarConfigSaboresDoStorage() {
    try {
        const configSalva = localStorage.getItem('configSabores');
        if (configSalva) {
            const configParsed = JSON.parse(configSalva);
            if (configParsed && typeof configParsed === 'object') {
                configSabores = { ...configSabores, ...configParsed };
                console.log('✅ Configuração de sabores carregada:', configSabores);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configuração de sabores:', error);
    }
}

// Salvar configuração de sabores no localStorage
function salvarConfigSaboresNoStorage() {
    try {
        // Atualizar data
        configSabores.ultimaAtualizacao = new Date().toISOString();
        
        localStorage.setItem('configSabores', JSON.stringify(configSabores));
        console.log('💾 Configuração de sabores salva');
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('configSaboresAtualizada', { 
            detail: { config: configSabores } 
        }));
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar configuração de sabores:', error);
        return false;
    }
}

// Renderizar configuração de sabores
function renderizarConfigSabores() {
    // Atualizar inputs
    if (maxSaboresInput) {
        maxSaboresInput.value = configSabores.maxSabores;
    }
    
    // Atualizar configuração atual
    if (configAtualSabores) {
        configAtualSabores.textContent = configSabores.maxSabores;
    }
    
    if (configAtualData) {
        if (configSabores.ultimaAtualizacao) {
            const data = new Date(configSabores.ultimaAtualizacao);
            configAtualData.textContent = data.toLocaleDateString('pt-BR') + ' ' + 
                                         data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else {
            configAtualData.textContent = '--';
        }
    }
}

// Configurar event listeners para sabores
function setupEventListenersSabores() {
    // Salvar configuração
    if (btnSalvarSabores && maxSaboresInput) {
        btnSalvarSabores.addEventListener('click', salvarConfigSabores);
        
        // Também salvar ao pressionar Enter
        maxSaboresInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                salvarConfigSabores();
            }
        });
    }
    
    // Atualizar
    if (btnAtualizarSabores) {
        btnAtualizarSabores.addEventListener('click', function() {
            renderizarConfigSabores();
            mostrarNotificacao('Configuração de sabores atualizada!', 'success');
        });
    }
    
    // Restaurar padrão
    if (btnRestaurarSabores) {
        btnRestaurarSabores.addEventListener('click', restaurarConfigSaboresPadrao);
    }
}

// Salvar configuração de sabores
function salvarConfigSabores() {
    const valor = parseInt(maxSaboresInput.value);
    
    // Validar valor
    if (isNaN(valor) || valor < 1 || valor > 10) {
        mostrarNotificacao('Digite um valor entre 1 e 10', 'error');
        maxSaboresInput.focus();
        return;
    }
    
    // Atualizar configuração
    configSabores.maxSabores = valor;
    
    if (salvarConfigSaboresNoStorage()) {
        renderizarConfigSabores();
        mostrarNotificacao(`Configuração salva: máximo de ${valor} sabores`, 'success');
    }
}

// Restaurar configuração padrão de sabores
function restaurarConfigSaboresPadrao() {
    if (!confirm('Isso irá restaurar a configuração padrão (2 sabores). Deseja continuar?')) {
        return;
    }
    
    configSabores = {
        maxSabores: 2,
        ultimaAtualizacao: new Date().toISOString()
    };
    
    if (salvarConfigSaboresNoStorage()) {
        renderizarConfigSabores();
        mostrarNotificacao('Configuração padrão restaurada!', 'success');
    }
}

// ===== SISTEMA DE CONFIGURAÇÕES ORIGINAL =====

function inicializarSistemaConfiguracoes() {
    // Elementos da interface
    const currentDate = document.getElementById('currentDate');
    const currentTime = document.getElementById('currentTime');
    
    // Botões de ações
    const saveAllBtn = document.getElementById('saveAllBtn');
    
    // Event Listeners
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', function() {
            // Salvar tudo: categorias, pesos e configuração de sabores
            const tudoSalvo = 
                salvarCategoriasNoStorage() && 
                salvarPesosNoStorage() && 
                salvarConfigSaboresNoStorage();
            
            if (tudoSalvo) {
                mostrarNotificacao('Todas as configurações salvas com sucesso!', 'success');
            }
        });
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remover notificação anterior se existir
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icons[tipo] || 'info-circle'}"></i>
            <span>${mensagem}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Adicionar estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${tipo === 'success' ? '#4caf50' : 
                         tipo === 'error' ? '#f44336' : 
                         tipo === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    // Adicionar estilos CSS se necessário
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 1rem;
                padding: 0;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Adicionar ao body
    document.body.appendChild(notification);
    
    // Fechar notificação ao clicar no botão
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Inicializar data e hora
function inicializarDataHora() {
    const currentDate = document.getElementById('currentDate');
    const currentTime = document.getElementById('currentTime');
    
    if (!currentDate || !currentTime) return;
    
    function updateDateTime() {
        const now = new Date();
        
        // Formatar data
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        currentDate.textContent = now.toLocaleDateString('pt-BR', options);
        
        // Formatar hora
        currentTime.textContent = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// Menu mobile
function setupMobileMenu() {
    if (window.innerWidth > 480) return;
    
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    document.body.appendChild(menuToggle);
    
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        menuToggle.innerHTML = sidebar.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Fechar menu ao clicar em um link
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 480) {
                sidebar.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 480 && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// ===== FUNÇÕES GLOBAIS =====
window.exportarCategorias = function() {
    return [...categorias];
};

window.carregarCategoriasExternamente = function() {
    carregarCategoriasDoStorage();
    return categorias;
};

window.exportarPesos = function() {
    return [...pesos];
};

window.carregarPesosExternamente = function() {
    carregarPesosDoStorage();
    return pesos;
};

window.exportarConfigSabores = function() {
    return { ...configSabores };
};

window.carregarConfigSaboresExternamente = function() {
    carregarConfigSaboresDoStorage();
    return configSabores;
};