// Estado da aplicação
const state = {
    produto: null,
    adicionais: [],
    adicionaisSelecionados: [],
    saboresSelecionados: [],
    produtosDisponiveis: [],
    observacoes: '',
    carrinho: JSON.parse(localStorage.getItem('carrinho')) || [],
    modoSelecaoSabores: false
};

// Elementos do DOM
const DOM = {
    // Header
    backBtn: document.getElementById('back-btn'),
    
    // Produto
    productSection: document.getElementById('product-section'),
    
    // Adicionais
    extrasSection: document.getElementById('extras-section'),
    extrasContainer: document.getElementById('extras-container'),
    selectedCount: document.getElementById('selected-count'),
    totalExtras: document.getElementById('total-extras'),
    extrasCounter: document.getElementById('extras-counter'),
    
    // Observações
    productNotes: document.getElementById('product-notes'),
    notesCount: document.getElementById('notes-count'),
    clearNotes: document.getElementById('clear-notes'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    
    // Resumo
    summaryProductName: document.getElementById('summary-product-name'),
    summaryProductPrice: document.getElementById('summary-product-price'),
    summaryExtrasCount: document.getElementById('summary-extras-count'),
    summaryExtrasList: document.getElementById('summary-extras-list'),
    summaryExtrasPrice: document.getElementById('summary-extras-price'),
    summaryTotalPrice: document.getElementById('summary-total-price'),
    
    // Botão flutuante
    floatingAction: document.getElementById('floating-action'),
    totalPrice: document.getElementById('total-price'),
    floatingItemCount: document.getElementById('floating-item-count'),
    addToCartBtn: document.getElementById('add-to-cart-btn'),
    
    // Notificações
    notificationsContainer: document.getElementById('notifications-container'),
    
    // Supabase
    supabase: null
};

// Classe principal da aplicação
class AdicionaisApp {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // Inicializar Supabase
            DOM.supabase = getSupabaseClient();
            
            // Configurar listeners
            this.setupEventListeners();
            
            // Atualizar contador do carrinho
            this.atualizarContadorCarrinho();
            
            // Carregar dados da URL
            await this.carregarDadosDaURL();
            
            // Carregar dados
            await this.carregarDados();
            
            // Renderizar
            this.renderizarProduto();
            
            // Verificar se é produto com múltiplos sabores
            if (state.produto.maxSabores > 1) {
                state.modoSelecaoSabores = true;
                state.saboresSelecionados = [state.produto];
                
                await this.carregarProdutosMesmaCategoria();
                this.criarSelecaoSabores();
            } else {
                this.carregarAdicionaisSupabase();
            }
            
            this.atualizarResumo();
            
            console.log('✅ Página de adicionais inicializada com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar página:', error);
            this.mostrarErro('Erro ao carregar a página de personalização');
        }
    }

    setupEventListeners() {
        DOM.backBtn?.addEventListener('click', () => {
            window.history.back();
        });

        DOM.productNotes?.addEventListener('input', (e) => {
            state.observacoes = e.target.value;
            DOM.notesCount.textContent = e.target.value.length;
        });

        DOM.clearNotes?.addEventListener('click', () => {
            DOM.productNotes.value = '';
            state.observacoes = '';
            DOM.notesCount.textContent = '0';
        });

        DOM.presetButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                const presets = {
                    sem_cebola: 'Sem cebola',
                    ponto_carne: 'Carne bem passada',
                    pouco_sal: 'Pouco sal',
                    separado: 'Ingredientes separados'
                };
                
                if (presets[preset]) {
                    this.adicionarObservacao(presets[preset]);
                }
            });
        });

        DOM.addToCartBtn?.addEventListener('click', () => {
            this.adicionarAoCarrinho();
        });
    }

    async carregarDadosDaURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const produtoId = urlParams.get('produto');
        
        if (!produtoId) {
            this.mostrarErro('Produto não especificado');
            throw new Error('Produto não especificado');
        }
        
        console.log('🔄 Carregando produto ID:', produtoId);
        
        await this.carregarProdutoDoSupabase(produtoId);
    }

    async carregarProdutoDoSupabase(produtoId) {
        if (!DOM.supabase) {
            throw new Error('Supabase não inicializado');
        }

        try {
            const { data, error } = await DOM.supabase
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            if (!data) {
                throw new Error('Produto não encontrado');
            }

            state.produto = {
                id: data.id,
                nome: data.nome || 'Produto sem nome',
                descricao: data.descricao || '',
                preco: data.preco || 0,
                quantidade: data.quantidade || 0,
                categoria: data.categoria || 'outro',
                imagemURL: data.imagem_url || '',
                status: data.status || 'off',
                tipo: data.tipo || 'normal',
                maxSabores: data.max_sabores || 1,
                peso: data.peso || ''
            };

            console.log('✅ Produto carregado do Supabase:', state.produto.nome);
            console.log('📊 Máximo de sabores:', state.produto.maxSabores);

        } catch (error) {
            console.error('❌ Erro ao carregar produto:', error);
            this.mostrarErro('Produto não encontrado');
            throw error;
        }
    }

    async carregarDados() {
        if (!DOM.supabase) return;

        try {
            await this.carregarAdicionaisSupabase();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    async carregarProdutosMesmaCategoria() {
        if (!DOM.supabase || !state.produto) return;

        try {
            const { data, error } = await DOM.supabase
                .from('produtos')
                .select('*')
                .eq('categoria', state.produto.categoria)
                .neq('id', state.produto.id)
                .neq('tipo', 'adicional')
                .or('status.eq.on,status.eq.ativo,status.is.null')
                .order('nome');

            if (error) throw error;

            state.produtosDisponiveis = data.map(produto => ({
                id: produto.id,
                nome: produto.nome || 'Produto sem nome',
                descricao: produto.descricao || '',
                preco: produto.preco || 0,
                quantidade: produto.quantidade || 0,
                categoria: produto.categoria || 'outro',
                imagemURL: produto.imagem_url || '',
                status: produto.status || 'off',
                tipo: produto.tipo || 'normal',
                maxSabores: produto.max_sabores || 1,
                peso: produto.peso || ''
            }));

            console.log(`✅ ${state.produtosDisponiveis.length} produtos da mesma categoria carregados`);

        } catch (error) {
            console.error('❌ Erro ao carregar produtos da mesma categoria:', error);
        }
    }

    async carregarAdicionaisSupabase() {
        if (!DOM.supabase || !state.produto) return;

        try {
            console.log('🔄 Carregando adicionais para o produto:', state.produto.nome);
            console.log('📋 Categoria do produto:', state.produto.categoria);

            const { data, error } = await DOM.supabase
                .from('produtos')
                .select('*')
                .eq('tipo', 'adicional')
                .or('status.eq.on,status.eq.ativo,status.is.null');

            if (error) {
                console.error('❌ Erro ao carregar adicionais:', error);
                throw error;
            }

            console.log(`✅ ${data.length} adicionais carregados do Supabase`);

            const adicionaisFiltrados = data.filter(adicional => {
                const temEstoque = (adicional.quantidade || adicional.quantidade_estoque || 0) > 0;
                if (!temEstoque) {
                    return false;
                }

                const estaAtivo = adicional.status === 'on' || adicional.status === 'ativo' || adicional.status === true;
                if (!estaAtivo) {
                    return false;
                }

                let categoriasAdicionais = [];
                if (adicional.categorias_adicionais) {
                    if (Array.isArray(adicional.categorias_adicionais)) {
                        categoriasAdicionais = adicional.categorias_adicionais;
                    } else if (typeof adicional.categorias_adicionais === 'string') {
                        try {
                            categoriasAdicionais = JSON.parse(adicional.categorias_adicionais);
                        } catch (e) {
                            console.warn('⚠️ Não foi possível converter categorias_adicionais:', e);
                        }
                    }
                }

                if (categoriasAdicionais.length === 0) {
                    return true;
                }

                const disponivel = categoriasAdicionais.includes(state.produto.categoria);
                
                return disponivel;
            });

            console.log(`✅ ${adicionaisFiltrados.length} adicionais disponíveis para "${state.produto.categoria}"`);

            const adicionaisSupabase = adicionaisFiltrados.map(adicional => {
                let categoriasAdicionais = [];
                if (adicional.categorias_adicionais) {
                    if (Array.isArray(adicional.categorias_adicionais)) {
                        categoriasAdicionais = adicional.categorias_adicionais;
                    } else if (typeof adicional.categorias_adicionais === 'string') {
                        try {
                            categoriasAdicionais = JSON.parse(adicional.categorias_adicionais);
                        } catch (e) {
                            console.warn('⚠️ Não foi possível converter categorias_adicionais:', e);
                        }
                    }
                }
                
                return {
                    id: adicional.id,
                    nome: adicional.nome || 'Adicional sem nome',
                    preco: adicional.preco || 0,
                    quantidade: adicional.quantidade || adicional.quantidade_estoque || 0,
                    imagemURL: adicional.imagem_url || '',
                    status: adicional.status || 'off',
                    tipo: 'adicional',
                    categorias_adicionais: categoriasAdicionais,
                    origem: 'supabase'
                };
            });

            state.adicionais = [...adicionaisSupabase];
            
            if (DOM.totalExtras) {
                DOM.totalExtras.textContent = state.adicionais.length;
            }
            
            if (!state.modoSelecaoSabores) {
                this.renderizarAdicionais();
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar adicionais do Supabase:', error);
        }
    }

    criarSelecaoSabores() {
        const saboresSection = document.createElement('section');
        saboresSection.className = 'sabores-section';
        saboresSection.innerHTML = `
            <div class="sabores-info">
                <p><i class="fas fa-info-circle"></i>Você pode escolher mais ${state.produto.maxSabores} sabores diferente, ou prosseguir com apenas 1.</p>
            </div>
            <div class="sabores-container" id="sabores-container">
                <div class="loading-sabores">
                    <div class="spinner small"></div>
                    <p>Carregando sabores disponíveis...</p>
                </div>
            </div>
        `;

        const mainContent = document.querySelector('.main-content');
        const productSection = document.getElementById('product-section');
        mainContent.insertBefore(saboresSection, productSection.nextSibling);

        DOM.saboresSection = saboresSection;
        DOM.saboresContainer = document.getElementById('sabores-container');
        DOM.saboresList = document.getElementById('sabores-list');
        DOM.saboresSelected = document.getElementById('sabores-selected');

        this.renderizarSaboresDisponiveis();
        this.renderizarSaboresSelecionados();
    }

    renderizarSaboresDisponiveis() {
        if (!DOM.saboresContainer) return;

        const loadingElement = DOM.saboresContainer.querySelector('.loading-sabores');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (state.produtosDisponiveis.length === 0) {
            DOM.saboresContainer.innerHTML = `
                <div class="no-sabores">
                    <i class="fas fa-pizza-slice"></i>
                    <p>Não há outros produtos na mesma categoria para selecionar como sabores adicionais.</p>
                </div>
            `;
            return;
        }

        DOM.saboresContainer.innerHTML = '';

        const produtoBaseElement = this.criarElementoSabor(state.produto, true);
        DOM.saboresContainer.appendChild(produtoBaseElement);

        state.produtosDisponiveis.forEach(produto => {
            const saborElement = this.criarElementoSabor(produto, false);
            DOM.saboresContainer.appendChild(saborElement);
        });
    }

    criarElementoSabor(produto, isBase = false) {
        const saborElement = document.createElement('div');
        saborElement.className = 'sabor-card';
        saborElement.dataset.id = produto.id;
        
        const precoFormatado = this.formatarPreco(produto.preco);
        const temEstoque = produto.quantidade > 0;
        const isSelected = state.saboresSelecionados.some(s => s.id === produto.id);
        const vezesSelecionado = state.saboresSelecionados.filter(s => s.id === produto.id).length;
        
        const podeSelecionar = temEstoque && 
            (state.saboresSelecionados.length < state.produto.maxSabores || isSelected);
        
        const botaoRemoverTexto = isBase ? 'Remover a pizza base irá cancelar a seleção' : 'Remover sabor';
        
        saborElement.innerHTML = `
            <div class="sabor-card-content ${isBase ? 'base' : ''} ${isSelected ? 'selected' : ''} ${!podeSelecionar && !isSelected ? 'disabled' : ''}">
                <div class="sabor-info">
                    <div class="sabor-header">
                        <h3 class="sabor-name">${produto.nome}${isBase ? ' (Escolhida)' : ''}</h3>
                        ${vezesSelecionado > 1 ? `<span class="sabor-count">${vezesSelecionado}x</span>` : ''}
                    </div>
                </div>
                <div class="sabor-actions">
                    ${isSelected ? `
                        <button class="btn-remove-sabor" onclick="adicionaisApp.removerSabor('${produto.id}')" title="${botaoRemoverTexto}">
                            <i class="fas fa-minus"></i>
                            ${isBase && vezesSelecionado === 1 ? ' ' : ''}
                        </button>
                    ` : `
                        <button class="btn-add-sabor" onclick="adicionaisApp.adicionarSabor('${produto.id}')" 
                                ${!podeSelecionar ? 'disabled' : ''} title="Adicionar sabor">
                            <i class="fas fa-plus"></i>
                        </button>
                    `}
                </div>
            </div>
        `;

        return saborElement;
    }

    adicionarSabor(produtoId) {
        if (state.saboresSelecionados.length >= state.produto.maxSabores) {
            this.mostrarNotificacao(`Você já selecionou o máximo de ${state.produto.maxSabores} sabores`, 'error');
            return;
        }

        const produto = state.produtosDisponiveis.find(p => p.id === produtoId) || state.produto;
        if (!produto) return;

        if (produto.quantidade <= 0) {
            this.mostrarNotificacao('Este sabor está esgotado', 'error');
            return;
        }

        state.saboresSelecionados.push(produto);
        
        this.renderizarSaboresDisponiveis();
        this.renderizarSaboresSelecionados();
        this.atualizarContadorSabores();
        this.atualizarResumo();
    }

    removerSabor(produtoId) {
        const isProdutoBase = produtoId === state.produto.id;
        
        const lastIndex = state.saboresSelecionados.map((s, i) => s.id === produtoId ? i : -1)
            .filter(i => i !== -1)
            .pop();
        
        if (lastIndex !== undefined) {
            state.saboresSelecionados.splice(lastIndex, 1);
            
            if (isProdutoBase) {
                const aindaTemBase = state.saboresSelecionados.some(s => s.id === state.produto.id);
                
                if (!aindaTemBase) {
                    this.mostrarNotificacao(
                        '<div style="text-align: center;">' +
                        '<i class="fas fa-info-circle" style="font-size: 1.5rem; margin-bottom: 8px;"></i><br>' +
                        '<strong>Pizza base removida</strong><br>' +
                        '<small>Voltando ao cardápio...</small>' +
                        '</div>', 
                        'warning',
                        2000
                    );
                    
                    setTimeout(() => {
                        window.location.href = 'cardapio.html';
                    }, 2000);
                    return;
                }
            }
            
            this.renderizarSaboresDisponiveis();
            this.renderizarSaboresSelecionados();
            this.atualizarContadorSabores();
            this.atualizarResumo();
        }
    }

    renderizarSaboresSelecionados() {
        if (!DOM.saboresList) return;

        DOM.saboresList.innerHTML = '';

        if (state.saboresSelecionados.length === 0) {
            DOM.saboresList.innerHTML = `
                <div class="empty-sabores">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhum sabor selecionado ainda</p>
                </div>
            `;
            return;
        }

        const saboresAgrupados = {};
        state.saboresSelecionados.forEach(sabor => {
            if (!saboresAgrupados[sabor.id]) {
                saboresAgrupados[sabor.id] = {
                    produto: sabor,
                    quantidade: 0,
                    total: 0
                };
            }
            saboresAgrupados[sabor.id].quantidade++;
            saboresAgrupados[sabor.id].total += sabor.preco;
        });

        Object.values(saboresAgrupados).forEach(info => {
            const saborItem = document.createElement('div');
            saborItem.className = 'sabor-selected-item';
            
            saborItem.innerHTML = `
                <div class="sabor-info">
                    <span class="sabor-name">${info.produto.nome}</span>
                    ${info.quantidade > 1 ? `<span class="sabor-quantity">${info.quantidade}x</span>` : ''}
                </div>
                <div class="sabor-price">${this.formatarPreco(info.total)}</div>
            `;
            
            DOM.saboresList.appendChild(saborItem);
        });
    }

    atualizarContadorSabores() {
        if (DOM.saboresSelected) {
            DOM.saboresSelected.textContent = state.saboresSelecionados.length;
        }
    }

    temSaborBaseNaSelecao() {
        return state.saboresSelecionados.some(sabor => sabor.id === state.produto.id);
    }

    renderizarProduto() {
        if (!DOM.productSection || !state.produto) return;

        const produto = state.produto;
        const precoFormatado = this.formatarPreco(produto.preco);
        const temEstoque = produto.quantidade > 0;
        const temMultiplosSabores = produto.maxSabores > 1;

        let estoqueStatus = 'out';
        let estoqueTexto = 'Esgotado';
        let estoqueClass = 'error';
        
        if (temEstoque) {
            if (produto.quantidade > 5) {
                estoqueStatus = 'available';
                estoqueTexto = 'Em estoque';
                estoqueClass = 'success';
            } else {
                estoqueStatus = 'low';
                estoqueTexto = `Últimas ${produto.quantidade}`;
                estoqueClass = 'warning';
            }
        }

        const loadingElement = DOM.productSection.querySelector('.section-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        DOM.productSection.innerHTML = `
            <div class="product-card-compact">
                <div class="product-header-compact">
                    <h1 class="product-name-compact">${produto.nome}</h1>
                </div>
                
                <div class="product-body-compact">
                    <div class="product-image-side">
                        <div class="product-image-compact">
                            ${produto.imagemURL ? 
                                `<img src="${produto.imagemURL}" alt="${produto.nome}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\"image-placeholder-compact\"><i class=\"fas fa-image\"></i></div>` : 
                                `<div class="image-placeholder-compact">
                                    <i class="fas fa-image"></i>
                                </div>`
                            }
                        </div>
                    <div class="product-info-side">
                        <div class="info-item-vertical">
                            <div class="info-icon-vertical">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="info-content-vertical">
                                <div class="info-label-vertical">Valor</div>
                                <div class="info-value-vertical price-value">
                                    ${precoFormatado}
                                </div>
                            </div>
                        </div>
                        
                        ${produto.peso ? `
                            <div class="info-item-vertical">
                                <div class="info-icon-vertical">
                                    <i class="fas fa-weight-hanging"></i>
                                </div>
                                <div class="info-content-vertical">
                                    <div class="info-label-vertical">Tamanho</div>
                                    <div class="info-value-vertical size-value">
                                        ${produto.peso}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${temMultiplosSabores ? `
                            <div class="info-item-vertical">
                                <div class="info-icon-vertical">
                                    <i class="fas fa-pizza-slice"></i>
                                </div>
                                <div class="info-content-vertical">
                                    <div class="info-label-vertical">Sabores</div>
                                    <div class="info-value-vertical flavors-value">
                                        Até ${produto.maxSabores}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>    
                    </div>
                </div>
            </div>
        `;
        
        DOM.summaryProductName.textContent = produto.nome;
        DOM.summaryProductPrice.textContent = precoFormatado;
    }

    renderizarAdicionais() {
        if (!DOM.extrasContainer) return;

        const loadingElement = DOM.extrasContainer.querySelector('.loading-extras');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (state.adicionais.length === 0) {
            DOM.extrasContainer.innerHTML = `
                <div class="no-extras">
                    <i class="fas fa-plus-circle"></i>
                    <p>Não há adicionais disponíveis para produtos desta categoria no momento.</p>
                </div>
            `;
            return;
        }

        DOM.extrasContainer.innerHTML = '';

        state.adicionais.forEach(adicional => {
            const precoFormatado = this.formatarPreco(adicional.preco);
            const isSelected = state.adicionaisSelecionados.some(a => a.id === adicional.id);
            const quantidadeDisponivel = adicional.quantidade || 0;
            
            let estoqueStatus = 'available';
            let estoqueTexto = 'Disponível';
            let estoqueIcon = 'fa-check';
            
            if (quantidadeDisponivel <= 0) {
                estoqueStatus = 'out';
                estoqueTexto = 'Esgotado';
                estoqueIcon = 'fa-times';
            } else if (quantidadeDisponivel <= 3) {
                estoqueStatus = 'low';
                estoqueTexto = `Últimas ${quantidadeDisponivel}`;
                estoqueIcon = 'fa-exclamation';
            }

            const extraElement = document.createElement('div');
            extraElement.className = `extra-card ${isSelected ? 'selected' : ''}`;
            extraElement.dataset.id = adicional.id;

            extraElement.innerHTML = `
                <div class="extra-card-content">
                    <div class="extra-info-detailed">
                        <div class="extra-header">
                            <h3 class="extra-name-detailed">${adicional.nome}</h3>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div class="extra-price-detailed" style="color: var(--primary-color); font-weight: 700;">+ ${precoFormatado}</div>
                        </div>
                    </div>
                    <div class="extra-checkbox-detailed">
                        ${isSelected ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                </div>
            `;

            extraElement.addEventListener('click', () => {
                if (quantidadeDisponivel > 0) {
                    this.toggleAdicional(adicional);
                } else {
                    this.mostrarNotificacao('Este adicional está esgotado', 'error');
                }
            });

            DOM.extrasContainer.appendChild(extraElement);
        });
    }

    toggleAdicional(adicional) {
        if (adicional.quantidade <= 0) {
            this.mostrarNotificacao('Este adicional está esgotado', 'error');
            return;
        }

        const index = state.adicionaisSelecionados.findIndex(a => a.id === adicional.id);

        if (index === -1) {
            state.adicionaisSelecionados.push({
                id: adicional.id,
                nome: adicional.nome,
                preco: adicional.preco
            });
        } else {
            state.adicionaisSelecionados.splice(index, 1);
        }

        const extraElement = document.querySelector(`.extra-card[data-id="${adicional.id}"]`);
        if (extraElement) {
            extraElement.classList.toggle('selected');
            const checkbox = extraElement.querySelector('.extra-checkbox-detailed');
            if (checkbox) {
                checkbox.innerHTML = index === -1 ? '<i class="fas fa-check"></i>' : '';
            }
        }

        DOM.selectedCount.textContent = state.adicionaisSelecionados.length;
        
        this.atualizarResumo();
    }

    adicionarObservacao(texto) {
        const textarea = DOM.productNotes;
        const atual = textarea.value.trim();
        
        if (atual) {
            textarea.value = atual + ', ' + texto;
        } else {
            textarea.value = texto;
        }
        
        state.observacoes = textarea.value;
        DOM.notesCount.textContent = textarea.value.length;
    }

    atualizarResumo() {
        if (!state.produto) return;

        let precoTotal = 0;
        let descricao = '';

        if (state.modoSelecaoSabores) {
            const precoSabores = state.saboresSelecionados.reduce((total, sabor) => total + sabor.preco, 0);
            const precoMedio = precoSabores / state.saboresSelecionados.length;
            
            precoTotal = precoMedio;
            
            const saboresAgrupados = {};
            state.saboresSelecionados.forEach(sabor => {
                if (!saboresAgrupados[sabor.id]) {
                    saboresAgrupados[sabor.id] = {
                        nome: sabor.nome,
                        quantidade: 0
                    };
                }
                saboresAgrupados[sabor.id].quantidade++;
            });
            
            const saboresDescricao = Object.values(saboresAgrupados)
                .map(info => info.quantidade > 1 ? `${info.nome} (${info.quantidade}x)` : info.nome)
                .join(', ');
            
            descricao = `Sabores: ${saboresDescricao}`;
            
            DOM.summaryProductName.textContent = `${state.produto.nome} (${state.saboresSelecionados.length} Sabor)`;
            
        } else {
            precoTotal = state.produto.preco;
            descricao = state.produto.nome;
            DOM.summaryProductName.textContent = state.produto.nome;
        }

        const precoAdicionais = state.adicionaisSelecionados.reduce((total, adicional) => total + adicional.preco, 0);
        precoTotal += precoAdicionais;

        if (DOM.selectedCount) {
            DOM.selectedCount.textContent = state.adicionaisSelecionados.length;
        }
        
        if (DOM.summaryExtrasCount) {
            DOM.summaryExtrasCount.textContent = state.adicionaisSelecionados.length;
        }
        
        if (DOM.floatingItemCount) {
            const saboresCount = state.modoSelecaoSabores ? `${state.saboresSelecionados.length} sabores` : '';
            const adicionaisCount = state.adicionaisSelecionados.length > 0 ? `${state.adicionaisSelecionados.length} adicionais` : '';
            DOM.floatingItemCount.textContent = [saboresCount, adicionaisCount].filter(Boolean).join(', ');
        }

        if (DOM.summaryExtrasList) {
            DOM.summaryExtrasList.innerHTML = '';
            state.adicionaisSelecionados.forEach(adicional => {
                const item = document.createElement('div');
                item.className = 'extra-summary-item';
                item.innerHTML = `
                    <span class="name">${adicional.nome}</span>
                    <span class="price">+ ${this.formatarPreco(adicional.preco)}</span>
                `;
                DOM.summaryExtrasList.appendChild(item);
            });
        }

        if (DOM.summaryExtrasPrice) {
            DOM.summaryExtrasPrice.textContent = this.formatarPreco(precoAdicionais);
        }
        
        if (DOM.summaryTotalPrice) {
            DOM.summaryTotalPrice.textContent = this.formatarPreco(precoTotal);
        }
        
        if (DOM.totalPrice) {
            DOM.totalPrice.textContent = this.formatarPreco(precoTotal);
        }

        const temEstoque = state.produto.quantidade > 0;
        const saboresValidos = !state.modoSelecaoSabores || state.saboresSelecionados.length > 0;
        const temBase = !state.modoSelecaoSabores || this.temSaborBaseNaSelecao();
        
        DOM.addToCartBtn.disabled = !temEstoque || !saboresValidos || !temBase;
        
        if (!temEstoque) {
            DOM.addToCartBtn.innerHTML = `
                <i class="fas fa-times"></i>
                <span>Produto Esgotado</span>
                <span class="item-quantity">0</span>
            `;
        } else if (!saboresValidos) {
            DOM.addToCartBtn.innerHTML = `
                <i class="fas fa-times"></i>
                <span>Selecione pelo menos 1 sabor</span>
                <span class="item-quantity">0</span>
            `;
        } else if (!temBase) {
            DOM.addToCartBtn.innerHTML = `
                <i class="fas fa-times"></i>
                <span>É necessário ter pelo menos 1 sabor base</span>
                <span class="item-quantity">0</span>
            `;
        } else {
            DOM.addToCartBtn.innerHTML = `
                <i class="fas fa-cart-plus"></i>
                <span>Adicionar ao Carrinho</span>
                <span class="item-quantity">1</span>
            `;
        }
    }

    atualizarContadorCarrinho() {
        const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
        const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
        
        console.log(`🛒 ${totalItens} itens no carrinho`);
    }

    adicionarAoCarrinho() {
        if (!state.produto) {
            this.mostrarNotificacao('Produto não selecionado', 'error');
            return;
        }

        const estoqueProduto = state.produto.quantidade || 0;
        if (estoqueProduto <= 0) {
            this.mostrarNotificacao('Produto esgotado', 'error');
            return;
        }

        if (state.modoSelecaoSabores && !this.temSaborBaseNaSelecao()) {
            this.mostrarNotificacao('É necessário manter pelo menos 1 sabor base', 'error');
            return;
        }

        if (state.modoSelecaoSabores) {
            for (const sabor of state.saboresSelecionados) {
                if (sabor.quantidade <= 0) {
                    this.mostrarNotificacao(`${sabor.nome} está esgotado`, 'error');
                    return;
                }
            }
        }

        for (const adicional of state.adicionaisSelecionados) {
            const adicionalInfo = state.adicionais.find(a => a.id === adicional.id);
            if (!adicionalInfo || adicionalInfo.quantidade <= 0) {
                this.mostrarNotificacao(`${adicional.nome} está esgotado', 'error`);
                return;
            }
        }

        const itemCarrinho = {
            id: state.produto.id + (state.modoSelecaoSabores ? '_multisabores_' + Date.now() : ''),
            nome: state.modoSelecaoSabores ? 
                `${state.produto.nome} (${state.saboresSelecionados.length} sabores)` : 
                state.produto.nome,
            preco: state.modoSelecaoSabores ? 
                state.saboresSelecionados.reduce((total, sabor) => total + sabor.preco, 0) / state.saboresSelecionados.length :
                state.produto.preco,
            quantidade: 1,
            imagemURL: state.produto.imagemURL,
            maxQuantidade: Math.min(
                estoqueProduto,
                ...(state.modoSelecaoSabores ? state.saboresSelecionados.map(s => s.quantidade) : []),
                ...state.adicionaisSelecionados.map(a => 
                    state.adicionais.find(ad => ad.id === a.id)?.quantidade || 0
                )
            ),
            maxSabores: state.produto.maxSabores || 1,
            peso: state.produto.peso || '',
            adicionais: [...state.adicionaisSelecionados],
            observacoes: state.observacoes,
            total: state.modoSelecaoSabores ? 
                (state.saboresSelecionados.reduce((total, sabor) => total + sabor.preco, 0) / state.saboresSelecionados.length) + 
                state.adicionaisSelecionados.reduce((total, adicional) => total + adicional.preco, 0) :
                state.produto.preco + state.adicionaisSelecionados.reduce((total, adicional) => total + adicional.preco, 0),
            dataAdicao: new Date().toISOString(),
            temMultiplosSabores: state.modoSelecaoSabores,
            saboresSelecionados: state.modoSelecaoSabores ? [...state.saboresSelecionados] : undefined
        };

        let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

        const itemExistenteIndex = carrinho.findIndex(item => 
            item.id === itemCarrinho.id && 
            JSON.stringify(item.adicionais) === JSON.stringify(itemCarrinho.adicionais) &&
            item.observacoes === itemCarrinho.observacoes &&
            (!item.temMultiplosSabores || JSON.stringify(item.saboresSelecionados) === JSON.stringify(itemCarrinho.saboresSelecionados))
        );

        if (itemExistenteIndex !== -1) {
            if (carrinho[itemExistenteIndex].quantidade + 1 > itemCarrinho.maxQuantidade) {
                this.mostrarNotificacao('Estoque insuficiente para adicionar mais unidades', 'error');
                return;
            }
            carrinho[itemExistenteIndex].quantidade++;
        } else {
            carrinho.push(itemCarrinho);
        }

        localStorage.setItem('carrinho', JSON.stringify(carrinho));

        this.atualizarContadorCarrinho();

        this.mostrarNotificacao(`${itemCarrinho.nome} adicionado ao carrinho!`, 'success');

        setTimeout(() => {
            window.location.href = 'cardapio.html';
        }, 1500);
    }

    formatarPreco(preco) {
        return preco.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    formatarCategoria(categoria) {
        const categoriasMap = {
            'queijo': 'Queijo',
            'carne': 'Carne',
            'vegetal': 'Vegetal',
            'molho': 'Molho',
            'outro': 'Outro',
            'bebida': 'Bebida',
            'comida': 'Comida',
            'sobremesa': 'Sobremesa',
            'lanche': 'Lanche',
            'pizza': 'Pizza',
            'salada': 'Salada',
            'prato_principal': 'Prato Principal',
            'entrada': 'Entrada',
            'adicional': 'Adicional'
        };
        
        return categoriasMap[categoria] || categoria.charAt(0).toUpperCase() + categoria.slice(1);
    }

    mostrarNotificacao(mensagem, tipo = 'info', duracao = 3000) {
        const notificacao = document.createElement('div');
        notificacao.className = `notification ${tipo}`;
        
        let icon = 'fa-info-circle';
        if (tipo === 'success') icon = 'fa-check-circle';
        if (tipo === 'error') icon = 'fa-exclamation-circle';
        if (tipo === 'warning') icon = 'fa-exclamation-triangle';
        
        notificacao.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${mensagem}</span>
        `;
        
        if (DOM.notificationsContainer) {
            DOM.notificationsContainer.appendChild(notificacao);
            
            setTimeout(() => {
                notificacao.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notificacao.parentElement) {
                        notificacao.remove();
                    }
                }, 300);
            }, duracao);
        }
    }

    mostrarErro(mensagem) {
        if (DOM.productSection) {
            DOM.productSection.innerHTML = `
                <div class="no-extras" style="grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${mensagem}</h3>
                    <p>Por favor, retorne ao cardápio e tente novamente.</p>
                    <button class="back-btn" onclick="window.history.back()" style="margin-top: 20px;">
                        <i class="fas fa-arrow-left"></i>
                        Voltar ao Cardápio
                    </button>
                </div>
            `;
        }
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const app = new AdicionaisApp();
    window.adicionaisApp = app;
});