import axios from 'axios';

const API = 'http://localhost:4000/api';


async function testApp() {
  try {
    console.log('--- Teste: Login Admin ---');
    const adminLogin = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin', role: 'admin' });
    console.log('Admin login:', adminLogin.data);
  } catch (err: any) {
    console.error('Erro no login admin:', err.response?.data || err.message);
    return;
  }

  try {
    console.log('--- Teste: Login Garçom ---');
    const waiterLogin = await axios.post(`${API}/auth/login`, { username: 'douglas', password: '1234', role: 'waiter' });
    console.log('Garçom login:', waiterLogin.data);
  } catch (err: any) {
    console.error('Erro no login garçom:', err.response?.data || err.message);
    return;
  }

  let uniqueUsername = `cliente-teste-${Date.now()}`;
  try {
    console.log('--- Teste: Registro Cliente ---');
    const clientRegister = await axios.post(`${API}/auth/register`, { username: uniqueUsername, password: '1234', name: 'Cliente Teste', role: 'customer' });
    console.log('Cliente registrado:', clientRegister.data);
  } catch (err: any) {
    console.error('Erro no registro cliente:', err.response?.data || err.message);
    return;
  }

  let clientLogin;
  try {
    console.log('--- Teste: Login Cliente ---');
    clientLogin = await axios.post(`${API}/auth/login`, { username: uniqueUsername, password: '1234', role: 'customer' });
    console.log('Cliente login:', clientLogin.data);
  } catch (err: any) {
    console.error('Erro no login cliente:', err.response?.data || err.message);
    return;
  }

  try {
    console.log('--- Teste: Listar Mesas ---');
    const tablesList = await axios.get(`${API}/tables`);
    console.log('Mesas:', tablesList.data);
  } catch (err: any) {
    console.error('Erro ao listar mesas:', err.response?.data || err.message);
    return;
  }

  let tableId;
  try {
    console.log('--- Teste: Abrir Mesa ---');
    const openTable = await axios.post(`${API}/tables`, { number: 100 });
    tableId = (openTable.data as any).id;
    console.log('Mesa aberta:', openTable.data);
  } catch (err: any) {
    console.error('Erro ao abrir mesa:', err.response?.data || err.message);
    return;
  }

  try {
    console.log('--- Teste: Atualizar Mesa ---');
    const updateTable = await axios.put(`${API}/tables/${tableId}`, { status: 'OCCUPIED' });
    console.log('Mesa atualizada:', updateTable.data);
  } catch (err: any) {
    console.error('Erro ao atualizar mesa:', err.response?.data || err.message);
    return;
  }

  try {
    console.log('--- Teste: Listar Produtos ---');
    const productsList = await axios.get(`${API}/products`);
    console.log('Produtos:', productsList.data);
  } catch (err: any) {
    console.error('Erro ao listar produtos:', err.response?.data || err.message);
    return;
  }

  let orderId;
  // --- Simulação completa do fluxo cliente/garçom ---
  // 1. Cliente faz pedido
  console.log('--- Simulação: Cliente faz pedido ---');
  const pedido = await axios.post(`${API}/orders`, { tableId, items: [ { productId: 1, name: 'Cerveja Artesanal Lager', price: 28, quantity: 2, status: 'PENDING', observation: '' } ] });
  orderId = (pedido.data as any).id;
  console.log('Pedido realizado:', pedido.data);

  // 2. Garçom vê o pedido e marca como entregue
  console.log('--- Simulação: Garçom marca pedido como entregue ---');
  // Busca itens do pedido
  const pedidoDetalhe = await axios.get(`${API}/orders/${orderId}`);
  const itemId = (pedidoDetalhe.data as any).items[0].id;
  const entrega = await axios.put(`${API}/orders/${orderId}/items/${itemId}/status`, { status: 'DELIVERED' });
  console.log('Item marcado como entregue:', entrega.data);

  // 3. Cliente vê a conta
  console.log('--- Simulação: Cliente vê a conta ---');
  const conta = await axios.get(`${API}/orders?tableId=${tableId}`);
  console.log('Conta da mesa:', conta.data);

  // 4. Cliente pede a conta
  console.log('--- Simulação: Cliente pede a conta ---');
  const pedirConta = await axios.post(`${API}/tables/status`, { id: tableId, status: 'BILL_REQUESTED' });
  console.log('Conta solicitada:', pedirConta.data);

  // 5. Garçom libera a mesa
  console.log('--- Simulação: Garçom libera a mesa ---');
  const liberarMesa = await axios.put(`${API}/tables/${tableId}`, { status: 'AVAILABLE' });
  console.log('Mesa liberada:', liberarMesa.data);

  // 6. Cliente envia feedback
  console.log('--- Simulação: Cliente envia feedback ---');
  const feedback = await axios.post(`${API}/feedbacks`, { tableNumber: 100, rating: 5, comment: 'Ótimo atendimento!' });
  console.log('Feedback enviado:', feedback.data);

  console.log('--- Simulação COMPLETA concluída ---');
}

// Executa o teste
if (require.main === module) {
  testApp().catch(err => {
    console.error('Erro no teste:', err.response?.data || err.message);
  });
}
