// Vendas do Dia - Sistema completo com atualização periódica

// Dados
let vendasFinalizadas = [];
let vendasPendentes = [];
let vendasCanceladas = [];

// Timer para atualização periódica
let atualizacaoTimer = null;

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Vendas (Supabase) inicializado');
    
    // Atualizar data e hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    
    // Configurar data do filtro para hoje
    document.getElementById('dataFiltro').value = getDataAtual();
    
    // Inicializar e carregar dados
    carregarDadosIniciais();
    
    // Configurar eventos
    configurarEventos();
    
    // Iniciar atualização periódica (a cada 10 segundos)
    iniciarAtualizacaoPeriodica();
});

// ===== FUNÇÕES DE CARREGAMENTO =====

// Carregar dados iniciais
function carregarDadosIniciais() {
    const dataFiltro = document.getElementById('dataFiltro').value;
    carregarPedidosPorData(dataFiltro);
}

// Iniciar atualização periódica
function iniciarAtualizacaoPeriodica() {
    // Parar timer anterior se existir
    if (atualizacaoTimer) {
        clearInterval(atualizacaoTimer);
    }
    
    // Atualizar a cada 10 segundos (pode ajustar o tempo)
    atualizacaoTimer = setInterval(() => {
        const dataFiltro = document.getElementById('dataFiltro').value;
        console.log('🔄 Atualização periódica...');
        carregarPedidosPorData(dataFiltro, true); // true = atualização silenciosa
    }, 10000);
    
    console.log('✅ Atualização periódica iniciada (10 segundos)');
}

// Parar atualização periódica
function pararAtualizacaoPeriodica() {
    if (atualizacaoTimer) {
        clearInterval(atualizacaoTimer);
        atualizacaoTimer = null;
        console.log('⏹️ Atualização periódica parada');
    }
}

// Carregar pedidos por data
async function carregarPedidosPorData(data, atualizacaoSilenciosa = false) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            if (!atualizacaoSilenciosa) {
                mostrarErroTabelas('Erro na conexão com o banco de dados');
            }
            return;
        }
        
        // Mostrar loading apenas na primeira vez ou se não for silenciosa
        if ((!atualizacaoSilenciosa && vendasPendentes.length === 0 && vendasFinalizadas.length === 0 && vendasCanceladas.length === 0)) {
            mostrarLoadingTabelas();
        }
        
        // Buscar pedidos da data especificada
        const { data: pedidos, error } = await supabase
            .from('pedidos')
            .select('*')
            .eq('data', data)
            .order('criado_em', { ascending: false });
        
        if (error) {
            if (!atualizacaoSilenciosa) {
                mostrarNotificacao('Erro ao carregar pedidos', 'error');
                mostrarErroTabelas('Erro ao carregar dados do servidor');
            }
            throw error;
        }
        
        // Verificar se houve mudanças
        const totalPedidos = pedidos.length;
        const totalAtual = vendasFinalizadas.length + vendasPendentes.length + vendasCanceladas.length;
        
        // Se não houve mudanças, não atualizar a interface
        if (atualizacaoSilenciosa && totalPedidos === totalAtual && !verificarMudancas(pedidos)) {
            console.log('📊 Nenhuma mudança detectada, mantendo interface');
            return;
        }
        
        if (!atualizacaoSilenciosa) {
            console.log(`📊 ${totalPedidos} pedidos encontrados para a data ${data}`);
        }
        
        // Processar pedidos
        processarPedidos(pedidos);
        
        // Atualizar interface
        atualizarInterface();
        
    } catch (error) {
        if (!atualizacaoSilenciosa) {
            console.error('❌ Erro ao carregar pedidos:', error);
        }
    }
}

// Verificar se houve mudanças nos dados
function verificarMudancas(novosPedidos) {
    const todosPedidosAtuais = [...vendasFinalizadas, ...vendasPendentes, ...vendasCanceladas];
    
    // Se quantidade diferente, houve mudança
    if (todosPedidosAtuais.length !== novosPedidos.length) {
        return true;
    }
    
    // Verificar por ID
    for (const pedido of novosPedidos) {
        const pedidoAtual = todosPedidosAtuais.find(p => p.id === pedido.id);
        if (!pedidoAtual) {
            return true; // Novo pedido
        }
        
        // Verificar se status mudou
        const statusAtual = pedidoAtual.status;
        const statusNovo = pedido.status || 'pendente';
        
        if (statusAtual !== statusNovo) {
            return true; // Status mudou
        }
    }
    
    return false;
}

// Processar pedidos
function processarPedidos(pedidos) {
    // Resetar arrays
    const novosFinalizadas = [];
    const novosPendentes = [];
    const novosCanceladas = [];
    
    if (pedidos.length > 0) {
        pedidos.forEach(pedido => {
            // Formatar o pedido
            const pedidoFormatado = formatarPedido(pedido);
            
            // Separar por status
            if (pedidoFormatado.status === 'finalizada') {
                novosFinalizadas.push(pedidoFormatado);
            } else if (pedidoFormatado.status === 'pendente') {
                novosPendentes.push(pedidoFormatado);
            } else if (pedidoFormatado.status === 'cancelada') {
                novosCanceladas.push(pedidoFormatado);
            } else {
                pedidoFormatado.status = 'pendente';
                novosPendentes.push(pedidoFormatado);
            }
        });
    }
    
    // Atualizar arrays globais
    vendasFinalizadas = novosFinalizadas;
    vendasPendentes = novosPendentes;
    vendasCanceladas = novosCanceladas;
}

// Formatar pedido vindo do Supabase
function formatarPedido(pedido) {
    // Garantir que itens seja um array
    let itens = [];
    if (Array.isArray(pedido.itens)) {
        itens = pedido.itens.map(item => ({
            produto_id: item.produto_id || item.id,
            nome: item.nome || 'Produto sem nome',
            preco: parseFloat(item.preco) || 0,
            quantidade: parseInt(item.quantidade) || 0,
            total_item: parseFloat(item.total_item) || (parseFloat(item.preco) || 0) * (parseInt(item.quantidade) || 0)
        }));
    } else if (pedido.itens && typeof pedido.itens === 'object') {
        // Se for objeto, converter para array
        itens = Object.values(pedido.itens);
    }
    
    // Formatar hora
    let hora = pedido.hora || '';
    if (!hora && pedido.criado_em) {
        try {
            const dataCriacao = new Date(pedido.criado_em);
            hora = dataCriacao.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            console.error('Erro ao formatar hora:', e);
        }
    }
    
    // Normalizar status
    let status = (pedido.status || 'pendente').toLowerCase().trim();
    
    // Converter para formato padrão
    if (status === 'finalizado' || status === 'completed' || status === 'done') {
        status = 'finalizada';
    }
    if (status === 'pendente' || status === 'pending' || status === 'waiting') {
        status = 'pendente';
    }
    if (status === 'cancelado' || status === 'cancelled' || status === 'canceled') {
        status = 'cancelada';
    }
    
    return {
        id: pedido.id,
        idPedido: pedido.id_pedido || `PED${pedido.id}`,
        itens: itens,
        subtotal: parseFloat(pedido.subtotal) || 0,
        taxaEntrega: parseFloat(pedido.taxa_entrega) || 0,
        total: parseFloat(pedido.total) || 0,
        data: pedido.data,
        hora: hora,
        status: status,
        motivoCancelamento: pedido.motivo_cancelamento,
        criadoEm: pedido.criado_em,
        atualizadoEm: pedido.atualizado_em
    };
}

// ===== ATUALIZAÇÃO DA INTERFACE =====

// Atualizar interface completa
function atualizarInterface() {
    atualizarTabelas();
    atualizarContadores();
    atualizarResumoVendas();
    verificarNovosPedidos();
}

// Mostrar loading nas tabelas
function mostrarLoadingTabelas() {
    const tabelaFinalizadasBody = document.getElementById('tabelaFinalizadasBody');
    const tabelaPendentesBody = document.getElementById('tabelaPendentesBody');
    const tabelaCanceladasBody = document.getElementById('tabelaCanceladasBody');
    
    if (tabelaFinalizadasBody) {
        tabelaFinalizadasBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6">
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Carregando vendas finalizadas...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (tabelaPendentesBody) {
        tabelaPendentesBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7">
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Carregando vendas pendentes...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (tabelaCanceladasBody) {
        tabelaCanceladasBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7">
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Carregando vendas canceladas...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Mostrar erro nas tabelas
function mostrarErroTabelas(mensagem) {
    const tabelaFinalizadasBody = document.getElementById('tabelaFinalizadasBody');
    const tabelaPendentesBody = document.getElementById('tabelaPendentesBody');
    const tabelaCanceladasBody = document.getElementById('tabelaCanceladasBody');
    
    if (tabelaFinalizadasBody) {
        tabelaFinalizadasBody.innerHTML = `
            <tr class="error-row">
                <td colspan="6">
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${mensagem}</span>
                        <button onclick="recarregarDados()" class="btn-reload">
                            <i class="fas fa-redo"></i> Tentar Novamente
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (tabelaPendentesBody) {
        tabelaPendentesBody.innerHTML = `
            <tr class="error-row">
                <td colspan="7">
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${mensagem}</span>
                        <button onclick="recarregarDados()" class="btn-reload">
                            <i class="fas fa-redo"></i> Tentar Novamente
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (tabelaCanceladasBody) {
        tabelaCanceladasBody.innerHTML = `
            <tr class="error-row">
                <td colspan="7">
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${mensagem}</span>
                        <button onclick="recarregarDados()" class="btn-reload">
                            <i class="fas fa-redo"></i> Tentar Novamente
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Recarregar dados
function recarregarDados() {
    const dataFiltro = document.getElementById('dataFiltro').value;
    carregarPedidosPorData(dataFiltro);
}

// Atualizar todas as tabelas
function atualizarTabelas() {
    atualizarTabelaVendas('finalizadas', vendasFinalizadas);
    atualizarTabelaVendas('pendentes', vendasPendentes);
    atualizarTabelaVendas('canceladas', vendasCanceladas);
}

// Atualizar tabela específica
function atualizarTabelaVendas(tipo, vendas) {
    const tbodyId = `tabela${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Body`;
    const tbody = document.getElementById(tbodyId);
    const totalElement = document.getElementById(`total${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    
    if (!tbody) return;
    
    if (vendas.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="${tipo === 'pendentes' ? 7 : tipo === 'canceladas' ? 7 : 6}">
                    <div class="empty-state">
                        <i class="fas fa-${tipo === 'finalizadas' ? 'check-circle' : tipo === 'pendentes' ? 'clock' : 'times-circle'}"></i>
                        <h4>Sem vendas ${tipo}</h4>
                        <p>Nenhuma venda ${tipo} encontrada para esta data</p>
                    </div>
                </td>
            </tr>
        `;
        if (totalElement) totalElement.textContent = '0';
        return;
    }
    
    let html = '';
    
    vendas.forEach((pedido) => {
        // Para cada item no pedido, criar uma linha
        pedido.itens.forEach((item, index) => {
            const isFirstItem = index === 0;
            const totalItem = item.total_item || item.totalItem || (item.preco * item.quantidade);
            const nomeProduto = item.nome || 'Produto sem nome';
            
            if (tipo === 'finalizadas') {
                html += `
                    <tr>
                        <td>${isFirstItem ? `<strong class="pedido-id">#${pedido.idPedido}</strong>` : ''}</td>
                        <td><strong>${nomeProduto}</strong></td>
                        <td><span class="quantidade-badge">${item.quantidade}x</span></td>
                        <td>${formatarMoeda(item.preco)}</td>
                        <td><strong>${formatarMoeda(totalItem)}</strong></td>
                        <td>${isFirstItem ? `<span class="hora-pedido">${pedido.hora}</span>` : ''}</td>
                    </tr>
                `;
            } else if (tipo === 'pendentes') {
                const horaPedido = pedido.criadoEm ? 
                    new Date(pedido.criadoEm).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 
                    pedido.hora;
                
                html += `
                    <tr data-id="${pedido.id}" class="pedido-pendente ${isFirstItem ? 'first-item' : ''}">
                        <td>${isFirstItem ? `<strong class="pedido-id">#${pedido.idPedido}</strong>` : ''}</td>
                        <td><strong>${nomeProduto}</strong></td>
                        <td><span class="quantidade-badge">${item.quantidade}x</span></td>
                        <td>${formatarMoeda(item.preco)}</td>
                        <td><strong>${formatarMoeda(totalItem)}</strong></td>
                        <td>${isFirstItem ? `<span class="hora-pedido">${horaPedido}</span>` : ''}</td>
                        <td>
                            ${isFirstItem ? `
                                <div class="acoes-pedido">
                                    <button class="btn-acao btn-finalizar" onclick="finalizarVenda('${pedido.id}', '${pedido.idPedido}')" title="Finalizar Pedido">
                                        <i class="fas fa-check"></i> Finalizar
                                    </button>
                                    <button class="btn-acao btn-cancelar" onclick="cancelarVenda('${pedido.id}', '${pedido.idPedido}')" title="Cancelar Pedido">
                                        <i class="fas fa-times"></i> Cancelar
                                    </button>
                                </div>
                            ` : ''}
                        </td>
                    </tr>
                `;
            } else if (tipo === 'canceladas') {
                const motivo = pedido.motivoCancelamento || 'Cliente solicitou';
                
                html += `
                    <tr>
                        <td>${isFirstItem ? `<strong class="pedido-id">#${pedido.idPedido}</strong>` : ''}</td>
                        <td><strong>${nomeProduto}</strong></td>
                        <td><span class="quantidade-badge">${item.quantidade}x</span></td>
                        <td>${formatarMoeda(item.preco)}</td>
                        <td>${formatarMoeda(totalItem)}</td>
                        <td>${isFirstItem ? `<span class="hora-pedido">${pedido.hora}</span>` : ''}</td>
                        <td><span class="motivo-badge" title="${motivo}">${motivo.length > 20 ? motivo.substring(0, 20) + '...' : motivo}</span></td>
                    </tr>
                `;
            }
        });
    });
    
    tbody.innerHTML = html;
    if (totalElement) totalElement.textContent = vendas.length;
}

// Atualizar contadores das abas
function atualizarContadores() {
    const contadorFinalizadas = document.getElementById('contadorFinalizadas');
    const contadorPendentes = document.getElementById('contadorPendentes');
    const contadorCanceladas = document.getElementById('contadorCanceladas');
    
    if (contadorFinalizadas) contadorFinalizadas.textContent = vendasFinalizadas.length;
    if (contadorPendentes) contadorPendentes.textContent = vendasPendentes.length;
    if (contadorCanceladas) contadorCanceladas.textContent = vendasCanceladas.length;
    
    // Destacar se houver pendentes
    if (contadorPendentes) {
        if (vendasPendentes.length > 0) {
            contadorPendentes.classList.add('has-pending');
        } else {
            contadorPendentes.classList.remove('has-pending');
        }
    }
}

// Atualizar resumo de vendas
function atualizarResumoVendas() {
    const totalVendasElement = document.getElementById('totalVendas');
    const quantidadeVendasElement = document.getElementById('quantidadeVendas');
    const totalProdutosElement = document.getElementById('totalProdutos');
    const produtosDiferentesElement = document.getElementById('produtosDiferentes');
    const ticketMedioElement = document.getElementById('ticketMedio');
    const melhorProdutoElement = document.getElementById('melhorProduto');
    const melhorProdutoQuantidadeElement = document.getElementById('melhorProdutoQuantidade');
    
    if (!totalVendasElement) return;
    
    if (vendasFinalizadas.length === 0) {
        totalVendasElement.textContent = 'R$ 0,00';
        quantidadeVendasElement.textContent = '0 vendas';
        totalProdutosElement.textContent = '0';
        produtosDiferentesElement.textContent = 'unidades';
        ticketMedioElement.textContent = 'R$ 0,00';
        melhorProdutoElement.textContent = '-';
        melhorProdutoQuantidadeElement.textContent = '0 un';
        return;
    }
    
    // Calcular totais
    const totalVendas = vendasFinalizadas.reduce((soma, pedido) => soma + pedido.total, 0);
    const quantidadeVendas = vendasFinalizadas.length;
    
    // Total de produtos vendidos
    let totalProdutos = 0;
    const produtosVendidos = {};
    
    vendasFinalizadas.forEach(pedido => {
        pedido.itens.forEach(item => {
            totalProdutos += item.quantidade;
            const nomeProduto = item.nome || 'Produto sem nome';
            produtosVendidos[nomeProduto] = (produtosVendidos[nomeProduto] || 0) + item.quantidade;
        });
    });
    
    // Produtos diferentes
    const produtosUnicos = Object.keys(produtosVendidos);
    
    // Ticket médio
    const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;
    
    // Produto mais vendido
    let melhorProduto = '';
    let melhorProdutoQuantidade = 0;
    
    for (const [produto, quantidade] of Object.entries(produtosVendidos)) {
        if (quantidade > melhorProdutoQuantidade) {
            melhorProduto = produto;
            melhorProdutoQuantidade = quantidade;
        }
    }
    
    // Atualizar interface
    totalVendasElement.textContent = formatarMoeda(totalVendas);
    quantidadeVendasElement.textContent = `${quantidadeVendas} venda${quantidadeVendas !== 1 ? 's' : ''}`;
    totalProdutosElement.textContent = totalProdutos;
    produtosDiferentesElement.textContent = `${produtosUnicos.length} tipo${produtosUnicos.length !== 1 ? 's' : ''}`;
    ticketMedioElement.textContent = formatarMoeda(ticketMedio);
    melhorProdutoElement.textContent = melhorProduto.substring(0, 15) + (melhorProduto.length > 15 ? '...' : '');
    melhorProdutoQuantidadeElement.textContent = `${melhorProdutoQuantidade} un`;
}

// ===== AÇÕES DE PEDIDOS =====

// Finalizar venda pendente
async function finalizarVenda(pedidoId, idPedido) {
    if (confirm(`Deseja finalizar o pedido #${idPedido}?`)) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Cliente Supabase não disponível');
            }
            
            console.log(`🔄 Finalizando pedido #${idPedido}...`);
            
            // Atualizar status no Supabase
            const { error } = await supabase
                .from('pedidos')
                .update({
                    status: 'finalizada',
                    atualizado_em: new Date().toISOString()
                })
                .eq('id', pedidoId);
            
            if (error) throw error;
            
            console.log(`✅ Pedido #${idPedido} finalizado no banco`);
            
            // Atualizar interface IMEDIATAMENTE
            const pedidoIndex = vendasPendentes.findIndex(p => p.id === pedidoId);
            if (pedidoIndex !== -1) {
                const pedido = vendasPendentes[pedidoIndex];
                pedido.status = 'finalizada';
                
                // Mover de pendentes para finalizadas
                vendasPendentes.splice(pedidoIndex, 1);
                vendasFinalizadas.push(pedido);
                
                // Atualizar interface
                atualizarInterface();
            }
            
            mostrarNotificacao(`Pedido #${idPedido} finalizado com sucesso!`, 'success');
            
            // Forçar atualização completa em 3 segundos
            setTimeout(() => {
                const dataFiltro = document.getElementById('dataFiltro').value;
                carregarPedidosPorData(dataFiltro, true);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Erro ao finalizar pedido:', error);
            mostrarNotificacao('Erro ao finalizar pedido: ' + error.message, 'error');
        }
    }
}

// Cancelar venda pendente
async function cancelarVenda(pedidoId, idPedido) {
    const motivo = prompt(`Informe o motivo do cancelamento do pedido #${idPedido}:`, 'Cliente solicitou');
    if (motivo !== null && motivo.trim() !== '') {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Cliente Supabase não disponível');
            }
            
            console.log(`🔄 Cancelando pedido #${idPedido}...`);
            
            // Primeiro, buscar o pedido para reestocar produtos
            const { data: pedidoData, error: pedidoError } = await supabase
                .from('pedidos')
                .select('*')
                .eq('id', pedidoId)
                .single();
            
            if (pedidoError) throw pedidoError;
            
            // Reestocar produtos se o pedido tiver itens
            if (pedidoData.itens && Array.isArray(pedidoData.itens)) {
                for (const item of pedidoData.itens) {
                    if (item.produto_id) {
                        // Buscar produto atual
                        const { data: produtoData, error: produtoError } = await supabase
                            .from('produtos')
                            .select('quantidade, quantidade_estoque')
                            .eq('id', item.produto_id)
                            .single();
                        
                        if (!produtoError && produtoData) {
                            // Calcular nova quantidade
                            const novaQuantidade = (produtoData.quantidade || 0) + item.quantidade;
                            const novaQuantidadeEstoque = (produtoData.quantidade_estoque || 0) + item.quantidade;
                            
                            // Atualizar produto
                            const { error: updateError } = await supabase
                                .from('produtos')
                                .update({
                                    quantidade: novaQuantidade,
                                    quantidade_estoque: novaQuantidadeEstoque,
                                    data_atualizacao: new Date().toISOString()
                                })
                                .eq('id', item.produto_id);
                            
                            if (updateError) {
                                console.error(`⚠️ Erro ao reestocar produto ${item.produto_id}:`, updateError);
                            }
                        }
                    }
                }
            }
            
            // Atualizar status do pedido
            const { error: updatePedidoError } = await supabase
                .from('pedidos')
                .update({
                    status: 'cancelada',
                    motivo_cancelamento: motivo.trim(),
                    atualizado_em: new Date().toISOString()
                })
                .eq('id', pedidoId);
            
            if (updatePedidoError) throw updatePedidoError;
            
            console.log(`✅ Pedido #${idPedido} cancelado no banco`);
            
            // Atualizar interface IMEDIATAMENTE
            const pedidoIndex = vendasPendentes.findIndex(p => p.id === pedidoId);
            if (pedidoIndex !== -1) {
                const pedido = vendasPendentes[pedidoIndex];
                pedido.status = 'cancelada';
                pedido.motivoCancelamento = motivo.trim();
                
                // Mover de pendentes para canceladas
                vendasPendentes.splice(pedidoIndex, 1);
                vendasCanceladas.push(pedido);
                
                // Atualizar interface
                atualizarInterface();
            }
            
            mostrarNotificacao(`Pedido #${idPedido} cancelado com sucesso!`, 'success');
            
            // Forçar atualização completa em 3 segundos
            setTimeout(() => {
                const dataFiltro = document.getElementById('dataFiltro').value;
                carregarPedidosPorData(dataFiltro, true);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Erro ao cancelar pedido:', error);
            mostrarNotificacao('Erro ao cancelar pedido: ' + error.message, 'error');
        }
    }
}

// Finalizar todos os pendentes
async function finalizarTodosPendentes() {
    if (vendasPendentes.length === 0) {
        alert('Não há pedidos pendentes para finalizar!');
        return;
    }
    
    if (confirm(`Deseja finalizar todos os ${vendasPendentes.length} pedidos pendentes?`)) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Cliente Supabase não disponível');
            }
            
            // Pegar IDs dos pedidos pendentes
            const idsPendentes = vendasPendentes.map(p => p.id);
            
            // Atualizar todos os pedidos pendentes
            const { error } = await supabase
                .from('pedidos')
                .update({
                    status: 'finalizada',
                    atualizado_em: new Date().toISOString()
                })
                .in('id', idsPendentes);
            
            if (error) throw error;
            
            // Atualizar interface imediatamente
            const pedidosFinalizados = [...vendasPendentes];
            pedidosFinalizados.forEach(pedido => {
                pedido.status = 'finalizada';
                vendasFinalizadas.push(pedido);
            });
            vendasPendentes = [];
            
            atualizarInterface();
            
            mostrarNotificacao('Todos os pedidos foram finalizados!', 'success');
            
            // Forçar atualização completa
            setTimeout(() => {
                const dataFiltro = document.getElementById('dataFiltro').value;
                carregarPedidosPorData(dataFiltro, true);
            }, 3000);
            
        } catch (error) {
            console.error('❌ Erro ao finalizar todos os pedidos:', error);
            mostrarNotificacao('Erro ao finalizar pedidos: ' + error.message, 'error');
        }
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Filtrar tabela
function filtrarTabela(tipo, texto) {
    const tabelaId = tipo === 'finalizadas' ? 'tabelaFinalizadas' : 
                    tipo === 'pendentes' ? 'tabelaPendentes' : 'tabelaCanceladas';
    const tabela = document.getElementById(tabelaId);
    if (!tabela) return;
    
    const linhas = tabela.querySelectorAll('tbody tr');
    const textoBusca = texto.toLowerCase().trim();
    
    linhas.forEach(linha => {
        if (linha.classList.contains('empty-row') || linha.classList.contains('loading-row') || linha.classList.contains('error-row')) {
            return;
        }
        
        const textoLinha = linha.textContent.toLowerCase();
        if (textoBusca === '' || textoLinha.includes(textoBusca)) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
    });
}

// Exportar dados para CSV
function exportarDados(tipo) {
    let dados;
    let nomeArquivo;
    
    if (tipo === 'finalizadas') {
        dados = vendasFinalizadas;
        nomeArquivo = 'vendas_finalizadas';
    } else {
        dados = vendasCanceladas;
        nomeArquivo = 'vendas_canceladas';
    }
    
    if (dados.length === 0) {
        alert(`Não há dados de ${tipo} para exportar!`);
        return;
    }
    
    // Criar CSV
    let csv = 'ID Pedido,Produto,Quantidade,Valor Unitário,Total,Data,Hora,Status';
    if (tipo === 'canceladas') {
        csv += ',Motivo\n';
    } else {
        csv += '\n';
    }
    
    dados.forEach(pedido => {
        pedido.itens.forEach((item, index) => {
            const linha = [
                index === 0 ? pedido.idPedido : '',
                item.nome || 'Produto sem nome',
                item.quantidade,
                item.preco ? item.preco.toFixed(2).replace('.', ',') : '0,00',
                (item.preco * item.quantidade).toFixed(2).replace('.', ','),
                pedido.data,
                index === 0 ? pedido.hora : '',
                pedido.status
            ];
            
            if (tipo === 'canceladas') {
                linha.push(pedido.motivoCancelamento || '');
            }
            
            csv += linha.join(';') + '\n';
        });
    });
    
    // Criar e baixar arquivo
    const dataAtual = getDataAtual();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${nomeArquivo}_${dataAtual}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao(`Exportado: ${dados.length} ${tipo}`, 'success');
}

// Verificar se há novos pedidos pendentes
function verificarNovosPedidos() {
    const pendentesBtn = document.querySelector('[data-aba="pendentes"]');
    if (!pendentesBtn) return;
    
    const contador = pendentesBtn.querySelector('.aba-contador');
    if (!contador) return;
    
    // Adicionar animação se o contador mudou
    if (contador.textContent !== vendasPendentes.length.toString()) {
        contador.classList.add('pulse');
        setTimeout(() => contador.classList.remove('pulse'), 1000);
    }
    
    // Se a aba não está ativa, mostrar notificação
    const abaAtiva = document.querySelector('.aba-conteudo.active');
    if (abaAtiva && abaAtiva.id !== 'aba-pendentes' && vendasPendentes.length > 0) {
        const novaNotificacao = vendasPendentes.filter(p => {
            // Verificar se o pedido é recente (últimos 5 minutos)
            if (p.criadoEm) {
                const criado = new Date(p.criadoEm);
                const agora = new Date();
                const diferencaMin = (agora - criado) / (1000 * 60);
                return diferencaMin < 5;
            }
            return true;
        }).length;
        
        if (novaNotificacao > 0) {
            mostrarNotificacaoPedido(`${novaNotificacao} novo(s) pedido(s) pendente(s)!`, 'warning');
        }
    }
}

// Notificação especial para novos pedidos
function mostrarNotificacaoPedido(mensagem, tipo) {
    // Verificar se já existe uma notificação
    const notificacaoExistente = document.querySelector('.notificacao-pedido');
    if (notificacaoExistente) {
        notificacaoExistente.remove();
    }
    
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao-pedido ${tipo}`;
    notificacao.innerHTML = `
        <div class="notificacao-conteudo">
            <i class="fas fa-bell"></i>
            <div>
                <strong>Novo Pedido!</strong>
                <span>${mensagem}</span>
            </div>
            <button class="notificacao-fechar" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <button class="notificacao-acao" onclick="abrirAbaPendentes()">
            <i class="fas fa-eye"></i> Ver Pedidos
        </button>
    `;
    
    document.body.appendChild(notificacao);
    
    // Remover automaticamente após 10 segundos
    setTimeout(() => {
        if (notificacao.parentElement) {
            notificacao.remove();
        }
    }, 10000);
}

// Abrir aba de pendentes
function abrirAbaPendentes() {
    // Ativar aba pendentes
    document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active'));
    const btnPendentes = document.querySelector('[data-aba="pendentes"]');
    if (btnPendentes) btnPendentes.classList.add('active');
    
    // Mostrar conteúdo
    document.querySelectorAll('.aba-conteudo').forEach(content => {
        content.classList.remove('active');
    });
    const abaPendentes = document.getElementById('aba-pendentes');
    if (abaPendentes) abaPendentes.classList.add('active');
    
    // Remover notificação
    const notificacao = document.querySelector('.notificacao-pedido');
    if (notificacao) notificacao.remove();
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo) {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao-flutuante ${tipo}`;
    notificacao.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensagem}</span>
    `;
    
    document.body.appendChild(notificacao);
    
    // Remover após 3 segundos
    setTimeout(() => {
        if (notificacao.parentElement) {
            notificacao.remove();
        }
    }, 3000);
}

// Funções auxiliares
function formatarMoeda(valor) {
    if (typeof valor !== 'number') {
        valor = parseFloat(valor) || 0;
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(valor);
}

// Atualizar data e hora
function atualizarDataHora() {
    const agora = new Date();
    
    // Formatar data
    const dataFormatada = agora.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const currentDate = document.getElementById('currentDate');
    if (currentDate) currentDate.textContent = dataFormatada;
    
    // Formatar hora
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const currentTime = document.getElementById('currentTime');
    if (currentTime) currentTime.textContent = horaFormatada;
}

// Obter data atual no formato YYYY-MM-DD
function getDataAtual() {
    const agora = new Date();
    
    // Ajustar para o fuso horário de Brasília (UTC-3)
    const offsetBrasilia = -3 * 60; // UTC-3 em minutos
    const agoraBrasilia = new Date(agora.getTime() + offsetBrasilia * 60000);
    
    const ano = agoraBrasilia.getUTCFullYear();
    const mes = String(agoraBrasilia.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(agoraBrasilia.getUTCDate()).padStart(2, '0');
    
    return `${ano}-${mes}-${dia}`;
}

// ===== CONFIGURAÇÃO DE EVENTOS =====

function configurarEventos() {
    // Navegação entre abas
    document.querySelectorAll('.aba-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const abaId = this.getAttribute('data-aba');
            
            // Ativar aba clicada
            document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar conteúdo da aba
            document.querySelectorAll('.aba-conteudo').forEach(content => {
                content.classList.remove('active');
            });
            const abaElement = document.getElementById(`aba-${abaId}`);
            if (abaElement) abaElement.classList.add('active');
        });
    });
    
    // Filtro por data
    const btnFiltrar = document.getElementById('btnFiltrar');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', function() {
            pararAtualizacaoPeriodica();
            carregarDadosIniciais();
            iniciarAtualizacaoPeriodica();
        });
    }
    
    // Botão "Hoje"
    const btnHoje = document.getElementById('btnHoje');
    if (btnHoje) {
        btnHoje.addEventListener('click', function() {
            document.getElementById('dataFiltro').value = getDataAtual();
            const categoriaFiltro = document.getElementById('categoriaFiltro');
            if (categoriaFiltro) categoriaFiltro.value = 'todos';
            pararAtualizacaoPeriodica();
            carregarDadosIniciais();
            iniciarAtualizacaoPeriodica();
        });
    }
    
    // Busca nas tabelas
    const searchProdutos = document.getElementById('searchProdutos');
    const searchPendentes = document.getElementById('searchPendentes');
    const searchCanceladas = document.getElementById('searchCanceladas');
    
    if (searchProdutos) searchProdutos.addEventListener('input', function(e) {
        filtrarTabela('finalizadas', e.target.value);
    });
    
    if (searchPendentes) searchPendentes.addEventListener('input', function(e) {
        filtrarTabela('pendentes', e.target.value);
    });
    
    if (searchCanceladas) searchCanceladas.addEventListener('input', function(e) {
        filtrarTabela('canceladas', e.target.value);
    });
    
    // Exportar dados
    const btnExportarFinalizadas = document.getElementById('btnExportarFinalizadas');
    if (btnExportarFinalizadas) {
        btnExportarFinalizadas.addEventListener('click', function() {
            exportarDados('finalizadas');
        });
    }
    
    const btnExportarCanceladas = document.getElementById('btnExportarCanceladas');
    if (btnExportarCanceladas) {
        btnExportarCanceladas.addEventListener('click', function() {
            exportarDados('canceladas');
        });
    }
    
    // Finalizar todos pendentes
    const btnFinalizarTodos = document.getElementById('btnFinalizarTodos');
    if (btnFinalizarTodos) {
        btnFinalizarTodos.addEventListener('click', finalizarTodosPendentes);
    }
    
    // Voltar ao Dashboard
    const btnVoltarDashboard = document.getElementById('btnVoltarDashboard');
    if (btnVoltarDashboard) {
        btnVoltarDashboard.addEventListener('click', function() {
            // Parar atualização periódica ao sair
            pararAtualizacaoPeriodica();
            window.location.href = 'dashboard.html';
        });
    }
    
    // Atualizar quando a página ganha foco
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Página ficou visível novamente, recarregar dados
            const dataFiltro = document.getElementById('dataFiltro').value;
            carregarPedidosPorData(dataFiltro);
        }
    });
}

// ===== EXPORTAR FUNÇÕES PARA O ESCOPO GLOBAL =====

window.finalizarVenda = finalizarVenda;
window.cancelarVenda = cancelarVenda;
window.abrirAbaPendentes = abrirAbaPendentes;
window.recarregarDados = recarregarDados;