// Estado do carrinho
let state = {
    carrinho: JSON.parse(localStorage.getItem('carrinho')) || [],
    pedidos: JSON.parse(localStorage.getItem('pedidos')) || []
};

// Elementos do DOM
const DOM = {
    emptyCart: document.getElementById('empty-cart'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartItems: document.getElementById('cart-items'),
    totalItens: document.getElementById('total-itens'),
    subtotal: document.getElementById('subtotal'),
    totalPrice: document.getElementById('total-price'),
    clearCartBtn: document.getElementById('clear-cart-btn'),
    checkoutBtn: document.getElementById('checkout-btn'),
    notificationsContainer: document.getElementById('notifications-container')
};

// Classe do Carrinho
class CarrinhoApp {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        try {
            this.supabase = getSupabaseClient();
            this.setupEventListeners();
            this.atualizarCarrinho();
            console.log('✅ Carrinho inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar carrinho:', error);
            this.mostrarErro('Erro ao carregar o carrinho');
        }
    }

    setupEventListeners() {
        DOM.clearCartBtn?.addEventListener('click', () => this.limparCarrinho());
        DOM.checkoutBtn?.addEventListener('click', () => this.finalizarPedido());
    }

    atualizarCarrinho() {
        const totalItens = state.carrinho.reduce((total, item) => total + item.quantidade, 0);
        const subtotalValor = state.carrinho.reduce((total, item) => total + (item.total * item.quantidade), 0);
        const taxaEntrega = 5.00;
        const total = subtotalValor + taxaEntrega;

        // Atualizar contadores
        if (DOM.totalItens) {
            DOM.totalItens.textContent = `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;
        }

        if (DOM.subtotal) {
            DOM.subtotal.textContent = this.formatarPreco(subtotalValor);
        }

        if (DOM.totalPrice) {
            DOM.totalPrice.textContent = this.formatarPreco(total);
        }

        // Mostrar/ocultar estados
        if (state.carrinho.length === 0) {
            if (DOM.emptyCart) DOM.emptyCart.style.display = 'block';
            if (DOM.cartItemsContainer) DOM.cartItemsContainer.style.display = 'none';
        } else {
            if (DOM.emptyCart) DOM.emptyCart.style.display = 'none';
            if (DOM.cartItemsContainer) DOM.cartItemsContainer.style.display = 'grid';
            this.atualizarListaItens();
        }
    }

    atualizarListaItens() {
        if (!DOM.cartItems) return;

        DOM.cartItems.innerHTML = '';

        state.carrinho.forEach((item, index) => {
            const itemElement = this.criarElementoItem(item, index);
            DOM.cartItems.appendChild(itemElement);
        });
    }

    criarElementoItem(item, index) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        const adicionaisText = item.adicionais && item.adicionais.length > 0 
            ? item.adicionais.map(a => a.nome).join(', ') 
            : '';

        const observacoesText = item.observacoes ? item.observacoes : '';
        
        // Verificar se tem múltiplos sabores
        const temMultiplosSabores = item.temMultiplosSabores && item.sabores && item.sabores.length > 0;
        
        let saboresText = '';
        if (temMultiplosSabores) {
            // Agrupar sabores por tipo com contagem
            const saboresAgrupados = item.sabores.map(s => {
                const vezes = s.quantidade > 1 ? ` (${s.quantidade}x)` : '';
                return `${s.nome}${vezes}`;
            }).join(', ');
            
            saboresText = `Sabores: ${saboresAgrupados}`;
        }

        div.innerHTML = `
            <div class="item-image">
                ${item.imagemURL ? 
                    `<img src="${item.imagemURL}" alt="${item.nome}">` : 
                    `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-color); color: var(--text-muted);">
                        <i class="fas fa-image"></i>
                    </div>`
                }
            </div>
            <div class="item-details">
                <div class="item-name">
                    ${item.nome}
                    ${temMultiplosSabores ? 
                        `<span style="font-size: 0.8rem; color: #ff6b6b; background: rgba(255, 107, 107, 0.1); padding: 2px 8px; border-radius: 10px; margin-left: 8px;">
                            <i class="fas fa-pizza-slice"></i> ${item.sabores.reduce((total, s) => total + s.quantidade, 0)} sabores
                        </span>` : 
                        ''}
                </div>
                ${saboresText ? `
                    <div class="item-extras" style="color: #ff6b6b; background: rgba(255, 107, 107, 0.05); padding: 8px; border-radius: 6px; margin: 8px 0; border-left: 3px solid #ff6b6b;">
                        <i class="fas fa-pizza-slice"></i> ${saboresText}
                    </div>
                ` : ''}
                ${adicionaisText ? `
                    <div class="item-extras">
                        <i class="fas fa-plus-circle"></i> ${adicionaisText}
                    </div>
                ` : ''}
                ${observacoesText ? `
                    <div class="item-notes">
                        <i class="fas fa-edit"></i> ${observacoesText}
                    </div>
                ` : ''}
                <div class="item-price">
                    ${this.formatarPreco(item.total)} ${item.quantidade > 1 ? `× ${item.quantidade}` : ''}
                </div>
                <div class="item-controls">
                    <button class="quantity-btn" onclick="carrinhoApp.alterarQuantidade(${index}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity-value">${item.quantidade}</span>
                    <button class="quantity-btn" onclick="carrinhoApp.alterarQuantidade(${index}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="remove-btn" onclick="carrinhoApp.removerDoCarrinho(${index})">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    alterarQuantidade(index, delta) {
        const item = state.carrinho[index];
        if (!item) return;

        const novaQuantidade = item.quantidade + delta;

        if (novaQuantidade < 1) {
            this.removerDoCarrinho(index);
            return;
        }

        // Verificar estoque máximo
        if (novaQuantidade > (item.maxQuantidade || 99)) {
            this.mostrarNotificacao('Quantidade máxima disponível', 'error');
            return;
        }

        item.quantidade = novaQuantidade;
        this.salvarCarrinho();
        this.atualizarCarrinho();
        this.mostrarNotificacao('Quantidade atualizada', 'success');
    }

    removerDoCarrinho(index) {
        const item = state.carrinho[index];
        if (item && confirm(`Remover "${item.nome}" do carrinho?`)) {
            state.carrinho.splice(index, 1);
            this.salvarCarrinho();
            this.atualizarCarrinho();
            this.mostrarNotificacao('Item removido do carrinho', 'info');
        }
    }

    limparCarrinho() {
        if (state.carrinho.length === 0) {
            this.mostrarNotificacao('O carrinho já está vazio', 'info');
            return;
        }

        if (confirm('Tem certeza que deseja limpar todo o carrinho?')) {
            state.carrinho = [];
            this.salvarCarrinho();
            this.atualizarCarrinho();
            this.mostrarNotificacao('Carrinho limpo com sucesso', 'success');
        }
    }

    async finalizarPedido() {
        if (state.carrinho.length === 0) {
            this.mostrarNotificacao('Carrinho vazio', 'error');
            return;
        }

        // Verificar estoque antes de finalizar
        try {
            if (!this.supabase) {
                throw new Error('Cliente Supabase não disponível');
            }

            // Coletar todos os IDs de produtos do carrinho
            const idsProdutos = new Set();
            
            state.carrinho.forEach(item => {
                idsProdutos.add(item.id.split('_')[0]); // Pega o ID base
                if (item.sabores) {
                    item.sabores.forEach(sabor => {
                        idsProdutos.add(sabor.id);
                    });
                }
            });

            // Carregar produtos para verificar estoque
            const { data: produtos, error: produtosError } = await this.supabase
                .from('produtos')
                .select('*')
                .in('id', Array.from(idsProdutos));

            if (produtosError) throw produtosError;

            // Verificar estoque dos produtos
            for (const item of state.carrinho) {
                if (item.temMultiplosSabores && item.sabores) {
                    // Verificar estoque para cada sabor
                    for (const sabor of item.sabores) {
                        const produto = produtos.find(p => p.id === sabor.id);
                        if (!produto || (produto.quantidade || 0) < (sabor.quantidade * item.quantidade)) {
                            this.mostrarNotificacao(`${sabor.nome} sem estoque suficiente!`, 'error');
                            return;
                        }
                    }
                } else {
                    // Verificar estoque para produtos normais
                    const produto = produtos.find(p => p.id === item.id);
                    if (!produto || (produto.quantidade || 0) < item.quantidade) {
                        this.mostrarNotificacao(`${item.nome} sem estoque suficiente!`, 'error');
                        return;
                    }
                }
                
                // Verificar estoque dos adicionais
                if (item.adicionais && item.adicionais.length > 0) {
                    for (const adicional of item.adicionais) {
                        const adicionalInfo = produtos.find(p => p.id === adicional.id);
                        if (!adicionalInfo || (adicionalInfo.quantidade || 0) < item.quantidade) {
                            this.mostrarNotificacao(`${adicional.nome} sem estoque suficiente!`, 'error');
                            return;
                        }
                    }
                }
            }

            // Criar ID do pedido
            const idPedido = this.gerarIdPedido();
            const agora = new Date();
            const offsetBrasilia = -3 * 60;
            const agoraBrasilia = new Date(agora.getTime() + offsetBrasilia * 60000);
            const dataAtual = agoraBrasilia.toISOString().split('T')[0];
            const horaAtual = agoraBrasilia.toISOString().split('T')[1].substring(0, 5);

            const subtotalValor = state.carrinho.reduce((total, item) => total + (item.total * item.quantidade), 0);
            const taxaEntrega = 5.00;
            const total = subtotalValor + taxaEntrega;

            // Preparar itens do pedido
            const itensPedido = state.carrinho.map(item => ({
                produto_id: item.id,
                nome: item.nome,
                preco: item.total,
                quantidade: item.quantidade,
                total_item: item.total * item.quantidade,
                adicionais: item.adicionais || [],
                sabores: item.sabores || [],
                observacoes: item.observacoes || '',
                tem_multi_sabores: item.temMultiplosSabores || false
            }));

            const pedido = {
                id_pedido: idPedido,
                itens: itensPedido,
                subtotal: subtotalValor,
                taxa_entrega: taxaEntrega,
                total: total,
                data: dataAtual,
                hora: horaAtual,
                status: 'pendente',
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };

            const { error: pedidoError } = await this.supabase
                .from('pedidos')
                .insert([pedido]);

            if (pedidoError) throw pedidoError;

            // Limpar carrinho após sucesso
            state.carrinho = [];
            this.salvarCarrinho();
            this.atualizarCarrinho();

            // Salvar histórico de pedidos
            state.pedidos.push(pedido);
            localStorage.setItem('pedidos', JSON.stringify(state.pedidos));

            this.mostrarNotificacao(`Pedido #${idPedido} realizado com sucesso!`, 'success');

            // Redirecionar para página de confirmação ou cardápio
            setTimeout(() => {
                window.location.href = 'cardapio.html';
            }, 2000);

        } catch (error) {
            console.error('Erro ao finalizar pedido:', error);
            this.mostrarNotificacao('Erro ao finalizar pedido: ' + error.message, 'error');
        }
    }

    // Funções auxiliares
    salvarCarrinho() {
        localStorage.setItem('carrinho', JSON.stringify(state.carrinho));
    }

    formatarPreco(preco) {
        return preco.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    gerarIdPedido() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `PED${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
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
        if (DOM.cartItemsContainer) {
            DOM.cartItemsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-2xl); color: var(--error-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: var(--space-lg);"></i>
                    <h3 style="font-size: 1.3rem; margin-bottom: var(--space-sm);">${mensagem}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: var(--space-lg);">
                        Tente recarregar a página
                    </p>
                    <button class="btn btn-confirm" onclick="window.location.reload()" style="margin: 0 auto;">
                        <i class="fas fa-redo"></i> Recarregar Página
                    </button>
                </div>
            `;
        }
    }
}

// Instanciar e exportar o carrinho
const carrinhoApp = new CarrinhoApp();
window.carrinhoApp = carrinhoApp;