// Estado da aplicação
let state = {
    produtos: [],
    adicionais: [],
    categorias: new Set(),
    carrinho: JSON.parse(localStorage.getItem('carrinho')) || [],
    logoURL: '',
    categoriaAtiva: null,
    tamanhoAtivo: null
};

// Elementos do DOM
const DOM = {
    productsGrid: document.getElementById('products-grid'),
    categoriesContainer: document.getElementById('categories-container'),
    categoriesContainer2: document.getElementById('categories-container2'),
    categoriesContainerMobile: document.getElementById('categories-container-mobile'),
    categoriesContainer2Mobile: document.getElementById('categories-container2-mobile'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    cartCount: document.getElementById('cart-count'),
    companyLogo: document.getElementById('company-logo'),
    logoPlaceholder: document.getElementById('logo-placeholder'),
    companyName: document.getElementById('company-name'),
    notificationsContainer: document.getElementById('notifications-container')
};

// Classe principal da aplicação
class CardapioApp {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        try {
            this.supabase = getSupabaseClient();
            this.setupEventListeners();
            await this.carregarDados();
            this.atualizarContadorCarrinho();
            this.atualizarLogo();
            console.log('✅ Cardápio inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar cardápio:', error);
            this.mostrarErro('Erro ao carregar o cardápio');
        }
    }

    async carregarDados() {
        try {
            await this.carregarProdutos();
            await this.carregarAdicionais();
            await this.carregarConfiguracoesEmpresa();
            this.renderizarCategorias();
            
            const categorias = Array.from(state.categorias);
            if (categorias.length > 0) {
                this.filtrarPorCategoria(categorias[0]);
            } else {
                this.renderizarProdutos(state.produtos);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    setupEventListeners() {
        DOM.searchInput?.addEventListener('input', (e) => {
            this.filtrarProdutos(e.target.value);
            DOM.searchClear?.classList.toggle('active', e.target.value.length > 0);
        });
        
        DOM.searchClear?.addEventListener('click', () => {
            DOM.searchInput.value = '';
            DOM.searchClear.classList.remove('active');
            
            if (state.categoriaAtiva) {
                this.filtrarPorCategoria(state.categoriaAtiva);
            } else {
                this.renderizarProdutos(state.produtos);
            }
        });
    }

    async carregarProdutos() {
        if (!this.supabase) {
            throw new Error('Supabase não inicializado');
        }

        const loadingElement = DOM.productsGrid?.querySelector('.loading-state');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }

        try {
            const { data, error } = await this.supabase
                .from('produtos')
                .select('*')
                .neq('tipo', 'adicional')
                .or('status.eq.on,status.eq.ativo,status.is.null')
                .order('nome');

            if (error) throw error;

            state.produtos = data.map(produto => ({
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
                peso: produto.peso || '' // AQUI ESTÃO OS TAMANHOS
            }));

            console.log('Produtos carregados:', state.produtos);

            state.categorias = new Set();
            state.produtos.forEach(produto => {
                if (produto.categoria) {
                    state.categorias.add(produto.categoria);
                }
            });

            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            this.configurarRealtime();

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erro ao carregar produtos</h3>
                        <p>${error.message || 'Verifique sua conexão'}</p>
                        <button class="btn btn-add" onclick="window.location.reload()" style="margin-top: 20px; width: auto;">
                            <i class="fas fa-redo"></i> Tentar novamente
                        </button>
                    </div>
                `;
            }
            this.mostrarNotificacao('Erro ao carregar produtos', 'error');
        }
    }

    async carregarAdicionais() {
        if (!this.supabase) {
            console.warn('Supabase não inicializado para carregar adicionais');
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('tipo', 'adicional')
                .or('status.eq.on,status.eq.ativo,status.is.null');

            if (error) {
                console.warn('Não foi possível carregar adicionais:', error);
                return;
            }

            state.adicionais = data.map(adicional => {
                let categoriasAdicionais = [];
                if (adicional.categorias_adicionais) {
                    if (Array.isArray(adicional.categorias_adicionais)) {
                        categoriasAdicionais = adicional.categorias_adicionais;
                    } else if (typeof adicional.categorias_adicionais === 'string') {
                        try {
                            categoriasAdicionais = JSON.parse(adicional.categorias_adicionais);
                        } catch (e) {
                            console.warn('Não foi possível converter categorias_adicionais:', e);
                        }
                    }
                }
                
                return {
                    id: adicional.id,
                    nome: adicional.nome || 'Adicional sem nome',
                    preco: adicional.preco || 0,
                    quantidade: adicional.quantidade || 0,
                    status: adicional.status || 'off',
                    categorias_adicionais: categoriasAdicionais
                };
            });

        } catch (error) {
            console.warn('Erro ao carregar adicionais:', error);
        }
    }

    async carregarConfiguracoesEmpresa() {
        if (!this.supabase) return;

        try {
            const { data, error } = await this.supabase
                .from('empresa')
                .select('*')
                .single();

            if (!error && data) {
                state.logoURL = data.logo_url || '';
                if (DOM.companyName && data.nome) {
                    DOM.companyName.textContent = data.nome;
                }
            }
        } catch (error) {
            console.warn('Não foi possível carregar configurações da empresa:', error);
        }
    }

    renderizarProdutos(produtos) {
        if (!DOM.productsGrid) return;

        DOM.productsGrid.innerHTML = '';

        if (produtos.length === 0) {
            DOM.productsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente outra busca ou categoria</p>
                </div>
            `;
            return;
        }

        produtos.forEach(produto => {
            const produtoElement = this.criarElementoProduto(produto);
            DOM.productsGrid.appendChild(produtoElement);
        });
    }

    criarElementoProduto(produto) {
        const div = document.createElement('div');
        div.className = 'product-card';
        
        const temEstoque = produto.quantidade > 0;
        const precoFormatado = this.formatarPreco(produto.preco);
        const temMultiplosSabores = produto.maxSabores > 1;
        
        div.innerHTML = `
            ${!temEstoque ? `
                <div class="product-badge out-of-stock">
                    Esgotado
                </div>
            ` : ''}
            
            <div class="product-image">
                ${produto.imagemURL ? 
                    `<img src="${produto.imagemURL}" alt="${produto.nome}" onerror="this.parentElement.innerHTML='<div style=\"display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #f8f9fa, #e1e5eb); color: #999999;\"><i class=\"fas fa-image\"></i></div>'">` : 
                    `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #f8f9fa, #e1e5eb); color: #999999;">
                        <i class="fas fa-image"></i>
                    </div>`
                }
            </div>
            <div class="product-content">
                <div class="product-header">
                    <h3 class="product-name">${produto.nome}</h3>
                    <div class="product-specs">
                        ${produto.peso ? `
                            <span class="spec-item">
                                <i class="fas fa-weight-hanging"></i> ${produto.peso}
                            </span>
                        ` : ''}
                        ${temMultiplosSabores ? `
                            <span class="spec-item">
                                <i class="fas fa-pizza-slice"></i> Até ${produto.maxSabores} sabores
                            </span>
                        ` : ''}
                    </div>
                </div>
                <p class="product-description">${produto.descricao || 'Sem descrição'}</p>
                <div class="product-footer">
                    <span class="product-price">${precoFormatado}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-add" 
                            onclick="app.selecionarProduto('${produto.id}')" 
                            ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                        Adicionar
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    /**
     * EXTRAI TAMANHOS DO CAMPO PESO dos produtos da categoria
     */
    extrairTamanhosDaCategoria(categoria) {
        // Filtra produtos da categoria
        const produtosDaCategoria = state.produtos.filter(p => p.categoria === categoria);
        
        console.log(`Analisando ${produtosDaCategoria.length} produtos da categoria: ${categoria}`);
        
        // Extrai tamanhos únicos do campo peso
        const tamanhos = new Set();
        
        produtosDaCategoria.forEach(produto => {
            if (produto.peso && produto.peso.trim() !== '') {
                console.log(`Produto: ${produto.nome} | Peso: ${produto.peso}`);
                tamanhos.add(produto.peso.trim());
            }
        });
        
        const tamanhosArray = Array.from(tamanhos);
        console.log(`Tamanhos únicos encontrados no campo peso:`, tamanhosArray);
        
        return tamanhosArray;
    }

    /**
     * RENDERIZA BOTÕES DE TAMANHO (USANDO O MESMO ESTILO DO SPEC-ITEM)
     */
    renderizarTamanhosPorCategoria(categoria) {
        // Renderiza nos dois containers (desktop e mobile)
        const containers = [
            DOM.categoriesContainer2,
            DOM.categoriesContainer2Mobile
        ];
        
        containers.forEach(container => {
            if (!container) return;
            
            console.log(`Renderizando tamanhos para categoria: ${categoria} no container`);
            
            // Limpa o container de tamanhos
            container.innerHTML = '';
            
            // Extrai tamanhos únicos do campo peso
            const tamanhos = this.extrairTamanhosDaCategoria(categoria);
            
            console.log(`Tamanhos a serem renderizados:`, tamanhos);
            
            if (tamanhos.length === 0) {
                console.log('Nenhum tamanho encontrado no campo peso para esta categoria');
                return;
            }
            
            // Cria botões para cada tamanho único
            tamanhos.forEach(tamanho => {
                const btn = document.createElement('button');
                btn.className = `size-btn ${state.tamanhoAtivo === tamanho ? 'active' : ''}`;
                btn.dataset.size = tamanho;
                
                btn.innerHTML = `
                    <i class="fas fa-weight-hanging"></i>
                    <span>${tamanho}</span>
                `;
                
                btn.addEventListener('click', () => {
                    // Se clicou no mesmo tamanho, desativa o filtro
                    if (state.tamanhoAtivo === tamanho) {
                        state.tamanhoAtivo = null;
                    } else {
                        state.tamanhoAtivo = tamanho;
                    }
                    this.filtrarPorCategoriaComTamanho(categoria, state.tamanhoAtivo);
                    this.renderizarTamanhosPorCategoria(categoria); // Re-renderiza para atualizar o active
                });
                
                container.appendChild(btn);
            });
        });
    }

    filtrarPorCategoria(categoria) {
        // Reseta o tamanho ativo ao mudar de categoria
        state.tamanhoAtivo = null;
        
        // Atualiza botões em ambos os containers
        const containers = [
            DOM.categoriesContainer,
            DOM.categoriesContainerMobile
        ];
        
        containers.forEach(container => {
            if (!container) return;
            container.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === categoria) {
                    btn.classList.add('active');
                }
            });
        });

        state.categoriaAtiva = categoria;
        
        this.filtrarPorCategoriaComTamanho(categoria, null);
        
        // Renderiza os tamanhos disponíveis para esta categoria
        this.renderizarTamanhosPorCategoria(categoria);
    }

    filtrarPorCategoriaComTamanho(categoria, tamanho) {
        let produtosFiltrados = state.produtos.filter(p => p.categoria === categoria);
        
        // Aplica filtro de tamanho se existir
        if (tamanho) {
            produtosFiltrados = produtosFiltrados.filter(produto => 
                produto.peso === tamanho
            );
        }

        const termoBusca = DOM.searchInput?.value.toLowerCase() || '';
        if (termoBusca) {
            produtosFiltrados = produtosFiltrados.filter(produto => 
                produto.nome.toLowerCase().includes(termoBusca) || 
                (produto.descricao && produto.descricao.toLowerCase().includes(termoBusca))
            );
        }

        this.renderizarProdutos(produtosFiltrados);
    }

    filtrarProdutos(termo) {
        termo = termo.toLowerCase().trim();
        
        let produtosFiltrados;
        if (state.categoriaAtiva) {
            produtosFiltrados = state.produtos.filter(p => p.categoria === state.categoriaAtiva);
            
            // Aplica filtro de tamanho se existir
            if (state.tamanhoAtivo) {
                produtosFiltrados = produtosFiltrados.filter(produto => 
                    produto.peso === state.tamanhoAtivo
                );
            }
        } else {
            produtosFiltrados = state.produtos;
        }

        if (termo) {
            produtosFiltrados = produtosFiltrados.filter(produto => 
                produto.nome.toLowerCase().includes(termo) || 
                (produto.descricao && produto.descricao.toLowerCase().includes(termo))
            );
        }

        this.renderizarProdutos(produtosFiltrados);
    }

    produtoTemAdicionais(produtoId) {
        const produto = state.produtos.find(p => p.id === produtoId);
        if (!produto) return false;

        if (state.adicionais.length === 0) return false;

        const categoriaProduto = produto.categoria;
        
        const adicionaisDisponiveis = state.adicionais.filter(adicional => {
            const temEstoque = adicional.quantidade > 0;
            if (!temEstoque) return false;

            const estaAtivo = adicional.status === 'on' || adicional.status === 'ativo' || adicional.status === true;
            if (!estaAtivo) return false;

            if (!adicional.categorias_adicionais || adicional.categorias_adicionais.length === 0) {
                return true;
            }

            return adicional.categorias_adicionais.includes(categoriaProduto);
        });

        return adicionaisDisponiveis.length > 0;
    }

    selecionarProduto(produtoId) {
        console.log('🎯 Selecionando produto:', produtoId);
        
        const produto = state.produtos.find(p => p.id === produtoId);
        if (!produto) {
            console.error('❌ Produto não encontrado:', produtoId);
            this.mostrarNotificacao('Produto não encontrado', 'error');
            return;
        }

        const temEstoque = produto.quantidade > 0;
        if (!temEstoque) {
            this.mostrarNotificacao('Produto esgotado', 'error');
            return;
        }

        this.redirecionarParaAdicionais(produtoId);
    }

    redirecionarParaAdicionais(produtoId) {
        const produto = state.produtos.find(p => p.id === produtoId);
        if (!produto) {
            this.mostrarNotificacao('Produto não encontrado', 'error');
            return;
        }

        localStorage.setItem('produto_selecionado', JSON.stringify(produto));
        window.location.href = `adicionais.html?produto=${produtoId}`;
    }

    renderizarCategorias() {
        // Renderiza em ambos os containers (desktop e mobile)
        const containers = [
            DOM.categoriesContainer,
            DOM.categoriesContainerMobile
        ];
        
        containers.forEach(container => {
            if (!container) return;
            
            container.innerHTML = '';

            Array.from(state.categorias).forEach(categoria => {
                const btn = document.createElement('button');
                btn.className = 'category-btn';
                btn.dataset.category = categoria;
                
                const icon = this.getIconForCategory(categoria);
                
                btn.innerHTML = `
                    <i class="fas ${icon}"></i>
                    <span>${this.formatarCategoria(categoria)}</span>
                `;
                btn.addEventListener('click', () => this.filtrarPorCategoria(categoria));
                container.appendChild(btn);
            });
        });
    }

    atualizarContadorCarrinho() {
        if (DOM.cartCount) {
            const totalItens = state.carrinho.reduce((total, item) => total + item.quantidade, 0);
            DOM.cartCount.textContent = totalItens;
        }
    }

    salvarCarrinho() {
        localStorage.setItem('carrinho', JSON.stringify(state.carrinho));
    }

    formatarPreco(preco) {
        return preco.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    formatarCategoria(categoria) {
        const categoriasMap = {
            'bebida': 'Bebidas',
            'comida': 'Comidas',
            'sobremesa': 'Sobremesas',
            'lanche': 'Lanches',
            'pizza': 'Pizzas',
            'salada': 'Saladas',
            'prato_principal': 'Pratos Principais',
            'entrada': 'Entradas',
            'outro': 'Outros'
        };
        
        return categoriasMap[categoria] || categoria.charAt(0).toUpperCase() + categoria.slice(1);
    }

    getIconForCategory(categoria) {
        const iconsMap = {
            'bebida': 'fa-glass-martini-alt',
            'sobremesa': 'fa-ice-cream',
            'lanche': 'fa-hamburger',
            'pizza': 'fa-pizza-slice',
            'salada': 'fa-leaf',
            'prato_principal': 'fa-utensils',
            'entrada': 'fa-drumstick-bite',
            'outro': 'fa-star'
        };
        
        return iconsMap[categoria] || 'fa-star';
    }

    atualizarLogo() {
        if (state.logoURL && state.logoURL.trim() !== '') {
            if (DOM.companyLogo) {
                DOM.companyLogo.src = state.logoURL;
                DOM.companyLogo.style.display = 'block';
                if (DOM.logoPlaceholder) DOM.logoPlaceholder.style.display = 'none';
                
                DOM.companyLogo.onerror = () => {
                    DOM.companyLogo.style.display = 'none';
                    if (DOM.logoPlaceholder) DOM.logoPlaceholder.style.display = 'flex';
                };
            }
        } else {
            if (DOM.companyLogo) DOM.companyLogo.style.display = 'none';
            if (DOM.logoPlaceholder) DOM.logoPlaceholder.style.display = 'flex';
        }
    }

    mostrarNotificacao(mensagem, tipo = 'info', duracao = 2000) {
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
        if (DOM.productsGrid) {
            DOM.productsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${mensagem}</h3>
                    <p>Tente recarregar a página</p>
                    <button class="btn btn-add" onclick="window.location.reload()" style="margin-top: 20px; width: auto;">
                        <i class="fas fa-redo"></i> Recarregar
                    </button>
                </div>
            `;
        }
    }

    configurarRealtime() {
        if (!this.supabase) return;

        try {
            this.supabase
                .channel('produtos-cardapio')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'produtos' 
                    }, 
                    (payload) => {
                        console.log('Atualização realtime detectada:', payload);
                        this.carregarProdutos();
                        this.carregarAdicionais();
                    }
                )
                .subscribe();

        } catch (error) {
            console.warn('Não foi possível configurar realtime:', error);
        }
    }
}

// Função para tornar as categorias arrastáveis com mouse/dedo
function initDragScroll() {
    const containers = [
        'categories-container', 
        'categories-container2',
        'categories-container-mobile',
        'categories-container2-mobile'
    ];
    
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        
        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.classList.add('active');
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            e.preventDefault();
        });
        
        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.classList.remove('active');
        });
        
        container.addEventListener('mouseup', () => {
            isDown = false;
            container.classList.remove('active');
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });
        
        container.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });
        
        container.addEventListener('touchend', () => {
            isDown = false;
        });
        
        container.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });
        
        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('dragstart', (e) => e.preventDefault());
        });
    });
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDragScroll);

// Sobrescrever o método de renderizarCategorias para reinicializar o drag scroll
const originalRenderizarCategorias = CardapioApp.prototype.renderizarCategorias;
CardapioApp.prototype.renderizarCategorias = function() {
    originalRenderizarCategorias.call(this);
    setTimeout(initDragScroll, 50);
};

// Instanciar e exportar a aplicação
const app = new CardapioApp();
window.app = app;
window.selecionarProduto = (produtoId) => app.selecionarProduto(produtoId);