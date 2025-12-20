import React, { useState } from 'react';
import { useApp } from '../store';
import { TableStatus, OrderStatus, Table } from '../types';
import { Bell, CheckCircle, Clock, UtensilsCrossed, AlertTriangle, Grid, DollarSign, ChevronRight, Check, MessageSquare, X, PlusCircle } from 'lucide-react';

const WaiterDashboard: React.FC = () => {
  const { tables, orders, setOrders, updateTableStatus, updateOrderItemStatus, updateOrderStatus, establishment, openTable, setDeviceTableId, deviceTableId } = useApp();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Busca pedidos da mesa ao selecionar, mas só atualiza o estado global orders do garçom
  const { fetchOrdersByTable } = useApp();
  const handleSelectTable = async (tableId: string) => {
    setSelectedTable(tableId);
    try {
      const pedidos = await fetchOrdersByTable(tableId);
      // Atualiza apenas os pedidos da mesa selecionada no estado global, mantendo os outros
      setOrders(prev => {
        // Remove pedidos antigos dessa mesa e adiciona os novos
        const outros = prev.filter(o => String(o.tableId) !== String(tableId));
        return [...outros, ...pedidos];
      });
    } catch (e) {
      // erro ao buscar pedidos da mesa
    }
  };

  const [isOpeningTable, setIsOpeningTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');

  const theme = establishment.theme;

  // Garçom agora vê apenas mesas ativas (Ocupada, Chamando ou Pagamento)
  const activeTables = tables.filter(t => t.status !== TableStatus.AVAILABLE);

  const getTableColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE: return 'bg-[#0d1f15] border-white/5 text-gray-600';
      case TableStatus.OCCUPIED: return 'bg-[#d18a59]/10 border-[#d18a59]/30 text-[#d18a59]';
      case TableStatus.CALLING_WAITER: return 'bg-red-900/40 border-red-500 text-white animate-pulse';
      case TableStatus.BILL_REQUESTED: return 'bg-blue-900/40 border-blue-400 text-blue-400';
      default: return 'bg-[#0d1f15]';
    }
  };

  const mapTableStatus = (s?: string) => {
    switch (s) {
      case 'AVAILABLE': return 'Disponível';
      case 'OCCUPIED': return 'Ocupada';
      case 'CALLING_WAITER': return 'Chamando Garçom';
      case 'BILL_REQUESTED': return 'Solicitou Conta';
      default: return s || '';
    }
  };

  const mapItemStatus = (s: string) => {
    switch (s) {
      case 'DELIVERED': return 'Entregue';
      case 'PENDING': return 'Pendente';
      default: return s;
    }
  };

  const currentTableOrders = orders.filter(o => String(o.tableId) === String(selectedTable) && o.status !== OrderStatus.PAID);
  const tableDetail = tables.find(t => t.id === selectedTable);

  const allItemsDelivered = currentTableOrders.every(order => 
    order.items.every(item => item.status === 'DELIVERED')
  );

  const hasPendingOrders = currentTableOrders.length > 0;

  const handleFinalizeTable = () => {
    if (!selectedTable) return;
    if (!allItemsDelivered && hasPendingOrders) {
      alert('Atenção: Existem itens pendentes de entrega!');
      return;
    }
    const ok = window.confirm('Confirma que o cliente já pagou e deixou a mesa? Isso liberará o número para reutilização.');
    if (!ok) return;
    updateTableStatus(selectedTable, TableStatus.AVAILABLE);
    currentTableOrders.forEach(o => updateOrderStatus(o.id, OrderStatus.PAID));
    setSelectedTable(null);
  };

  const handleOpenTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;
    try {
      const tableId = await openTable(Number(newTableNumber));
      setDeviceTableId(tableId);
      setIsOpeningTable(false);
      setNewTableNumber('');
      window.location.hash = '#/mesa';
    } catch (err) {
      setIsOpeningTable(false);
      setNewTableNumber('');
    }
  };

  const clearNotification = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    updateTableStatus(tableId, TableStatus.OCCUPIED);
  };

  const getTimeElapsed = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    return `${minutes} min atrás`;
  };

  return (
    <div className="flex h-screen bg-[#06120c]">
      {/* Abrir Mesa */}
      <div className="absolute top-6 right-6 z-50">
        {!deviceTableId ? (
          <button onClick={() => window.location.hash = '#/abrir-mesa'} style={{ backgroundColor: theme.primary }} className="px-4 py-2 rounded-2xl font-bold text-black shadow-xl">Abrir Mesa</button>
        ) : (
          <button onClick={() => window.location.hash = '#/abrir-mesa'} style={{ backgroundColor: theme.card }} className="px-4 py-2 rounded-2xl font-bold text-white border border-white/10">Abrir Outra</button>
        )}
      </div>
      {/* Coluna de mesas */}
      <div className="flex-1 flex flex-col p-8 lg:p-10">
        {activeTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20 text-white space-y-4">
            <Grid className="w-16 h-16" />
            <p className="uppercase font-bold tracking-widest text-xs">Nenhuma mesa em atendimento</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 lg:gap-6">
            {activeTables.map(table => (
              <div key={table.id} className="relative group">
                <button
                  onClick={() => handleSelectTable(table.id)}
                  style={{ borderColor: selectedTable === table.id ? theme.primary : 'rgba(255,255,255,0.05)' }}
                  className={`w-full aspect-square flex flex-col items-center justify-center rounded-[2.5rem] border-2 transition-all relative ${getTableColor(table.status)} ${selectedTable === table.id ? 'scale-105 shadow-2xl bg-[#0d1f15]' : ''}`}
                >
                  <span className="text-3xl lg:text-4xl font-serif font-bold group-hover:scale-110 transition-transform">{table.number}</span>
                  <span className="text-[8px] uppercase font-black mt-2 tracking-widest opacity-50">Ativa</span>
                  {table.status === TableStatus.CALLING_WAITER && (
                    <div className="absolute -top-1 -right-1 bg-red-500 p-2.5 rounded-full shadow-lg animate-bounce">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {table.status === TableStatus.BILL_REQUESTED && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 p-2.5 rounded-full shadow-lg">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
                {table.status === TableStatus.CALLING_WAITER && (
                  <button 
                    onClick={(e) => clearNotification(e, table.id)}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-black text-[8px] font-black px-4 py-2 rounded-full shadow-xl uppercase tracking-tighter hover:bg-[#d18a59] transition-colors whitespace-nowrap z-20"
                  >
                    Atender Chamado
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Painel de Detalhes (Drawer Mobile / Coluna Desktop) */}
      {selectedTable && (
        <div className={`fixed inset-0 z-[60] lg:relative lg:inset-auto lg:w-[450px] transition-transform duration-500 ease-in-out ${selectedTable ? 'translate-y-0 lg:translate-y-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-0'}`}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md lg:hidden" onClick={() => setSelectedTable(null)}></div>
          <div className="relative w-full lg:w-[450px] h-full bg-[#07140e] p-6 lg:rounded-l-3xl border-l border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <div>
                <h3 className="text-xl font-serif text-white">Mesa {tableDetail?.number}</h3>
                <p className="text-xs text-gray-400">Status: {mapTableStatus(tableDetail?.status)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.open(`${window.location.origin + window.location.pathname}#/customer?tableId=${selectedTable}`, '_blank')} className="px-3 py-2 bg-amber-500 text-black rounded-2xl font-bold">Abrir Cardápio Cliente</button>
                <button onClick={handleFinalizeTable} className="px-3 py-2 bg-green-600 text-black rounded-2xl font-bold">Limpar Mesa</button>
                <button onClick={() => setSelectedTable(null)} className="px-3 py-2 bg-white/5 text-white rounded-2xl">Fechar</button>
              </div>
            </div>

            <div className="space-y-4">
              {currentTableOrders.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum pedido ativo nesta mesa.</p>
              ) : (
                currentTableOrders.map(order => (
                  <div key={order.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-300 font-bold">Pedido #{order.id}</span>
                      <span className="text-xs text-white">R$ {order.total.toFixed(2)}</span>
                    </div>
                    <div className="space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-white font-medium">{item.quantity}x {item.name}</div>
                            <div className="text-[10px] text-gray-400">{item.observation || ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${item.status==='DELIVERED' ? 'text-green-400' : 'text-yellow-300'}`}>{mapItemStatus(item.status)}</span>
                            {item.status !== 'DELIVERED' && (
                              <button onClick={() => updateOrderItemStatus(order.id, item.id, 'DELIVERED')} className="px-3 py-1 bg-green-600 text-black rounded-full text-xs font-bold">Marcar Entregue</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterDashboard;


