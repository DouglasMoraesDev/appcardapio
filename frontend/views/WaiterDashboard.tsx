
import React, { useState } from 'react';
import { useApp } from '../store';
import { TableStatus, OrderStatus, Table } from '../types';
import { Bell, CheckCircle, Clock, UtensilsCrossed, AlertTriangle, Grid, DollarSign, ChevronRight, Check, MessageSquare, X, PlusCircle } from 'lucide-react';

const WaiterDashboard: React.FC = () => {
  const { tables, orders, setOrders, updateTableStatus, updateOrderItemStatus, updateOrderStatus, establishment, openTable, setDeviceTableId } = useApp();
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
    } catch (e) {}
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

  const currentTableOrders = orders.filter(o => String(o.tableId) === String(selectedTable) && o.status !== OrderStatus.PAID);
  const tableDetail = tables.find(t => t.id === selectedTable);

  const allItemsDelivered = currentTableOrders.every(order => 
    order.items.every(item => item.status === 'DELIVERED')
  );

  const hasPendingOrders = currentTableOrders.length > 0;

  const handleFinalizeTable = () => {
    if (!selectedTable) return;
    if (!allItemsDelivered && hasPendingOrders) {
      alert("Atenção: Existem itens pendentes de entrega!");
      return;
    }
    updateTableStatus(selectedTable, TableStatus.AVAILABLE);
    currentTableOrders.forEach(o => updateOrderStatus(o.id, OrderStatus.PAID));
    setSelectedTable(null);
  };

  const handleOpenTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;
    const tableId = await openTable(parseInt(newTableNumber));
    setSelectedTable(tableId);
    setDeviceTableId(tableId); // Garante que a mesa ativa está definida
    setIsOpeningTable(false);
    setNewTableNumber('');
    window.location.hash = '#/mesa';
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
    <div className="min-h-screen bg-[#06120c] flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Área de Mesas */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar pb-32">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="flex justify-between items-center gap-4">
            <div>
               <h2 className="text-4xl font-serif text-white uppercase tracking-tighter">Mesas Ativas</h2>
               <p className="text-[#d18a59] text-[10px] uppercase font-bold tracking-[0.3em] mt-1">Gestão de Atendimento em Curso</p>
            </div>
            <button 
              onClick={() => setIsOpeningTable(true)}
              className="bg-[#d18a59] text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 shadow-xl transition-all">
              <PlusCircle className="w-5 h-5" /> Abrir Mesa
            </button>
          </div>
          
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
      </div>

      {/* Painel de Detalhes (Drawer Mobile / Coluna Desktop) */}
      <div className={`fixed inset-0 z-[60] lg:relative lg:inset-auto lg:w-[450px] transition-transform duration-500 ease-in-out ${selectedTable ? 'translate-y-0 lg:translate-y-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-0'}`}>
        {selectedTable && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md lg:hidden" onClick={() => setSelectedTable(null)}></div>
        )}

        <div className={`absolute bottom-0 left-0 right-0 h-[85vh] lg:h-full lg:relative bg-[#0d1f15] rounded-t-[4rem] lg:rounded-none border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col shadow-2xl overflow-hidden`}>
          {selectedTable && tableDetail ? (
            <>
              <div className="p-8 lg:p-10 border-b border-white/5 bg-[#06120c]/50 flex flex-col gap-4 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-3xl font-serif text-[#d18a59] uppercase tracking-tighter leading-none">Mesa {tableDetail.number}</h3>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-2">Detalhamento de Consumo</p>
                  </div>
                  <button onClick={() => setSelectedTable(null)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:gap-4 mt-2">
                  <button 
                    onClick={() => { setDeviceTableId(selectedTable); window.location.hash = '#/mesa'; }}
                    className="w-full lg:w-auto py-3 px-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] bg-[#d18a59] text-black hover:opacity-90 shadow-lg">
                    Ver Cardápio/Conta da Mesa
                  </button>
                  <button 
                    onClick={handleFinalizeTable}
                    style={{ backgroundColor: (allItemsDelivered || !hasPendingOrders) ? theme.primary : undefined }}
                    className={`w-full lg:w-auto py-3 px-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl ${
                      allItemsDelivered || !hasPendingOrders 
                        ? 'text-black hover:opacity-90' 
                        : 'bg-white/5 text-gray-700 cursor-not-allowed border border-white/5'
                    }`}>
                    {allItemsDelivered || !hasPendingOrders ? (
                      <>Liberar Mesa <ChevronRight className="w-5 h-5" /></>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span>Itens Pendentes...</span>
                      </div>
                    )}
                  </button>
                  <div className="flex-1 flex items-end justify-end">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 mr-2">Subtotal</span>
                    <span className="text-2xl font-serif text-[#d18a59] font-black leading-none">R$ {currentTableOrders.reduce((a, b) => a + b.total, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 lg:p-10 overflow-y-auto space-y-6 no-scrollbar">
                {tableDetail.status === TableStatus.CALLING_WAITER && (
                  <div className="bg-red-500/20 border border-red-500/30 p-6 rounded-[2rem] flex items-center justify-between mb-4 animate-in zoom-in">
                    <div className="flex items-center gap-4">
                      <Bell className="w-6 h-6 text-red-500 animate-pulse" />
                      <div>
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Solicitando Garçom</p>
                        <p className="text-xs text-white/60">Aguardando atendimento imediato</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => clearNotification(e, selectedTable)}
                      className="bg-red-500 text-white text-[9px] font-black px-5 py-3 rounded-2xl uppercase tracking-widest hover:bg-red-600 transition-colors"
                    >
                      Resolvido
                    </button>
                  </div>
                )}

                {currentTableOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-700 text-center space-y-6 opacity-30">
                     <UtensilsCrossed className="w-20 h-20" />
                     <p className="text-xs font-black uppercase tracking-widest">Aguardando novos pedidos...</p>
                  </div>
                ) : (
                  currentTableOrders.map((order, oIdx) => (
                    <div key={order.id} className="bg-black/20 rounded-[2.5rem] p-6 space-y-5 border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-[#d18a59]"></div>
                           <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Pedido #{oIdx + 1}</span>
                        </div>
                        <span className="text-[9px] text-[#d18a59] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> {getTimeElapsed(order.timestamp)}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {order.items.map((item, iIdx) => (
                          <div key={iIdx} className={`space-y-2 p-5 rounded-3xl border transition-all ${item.status === 'DELIVERED' ? 'bg-green-900/5 border-green-500/10 opacity-40' : 'bg-[#06120c] border-white/5 shadow-lg'}`}>
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="text-base font-bold text-white">
                                  <span className="text-[#d18a59] mr-2 font-black">{item.quantity}x</span> {item.name}
                                </p>
                              </div>
                              {item.status === 'PENDING' ? (
                                <button 
                                  onClick={() => updateOrderItemStatus(order.id, item.id, 'DELIVERED')}
                                  style={{ backgroundColor: theme.primary }}
                                  className="text-black p-3 rounded-2xl hover:scale-110 transition-all shadow-xl active:scale-95">
                                  <Check className="w-5 h-5" />
                                </button>
                              ) : (
                                <div className="text-green-500 bg-green-500/10 p-2 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
                              )}
                            </div>
                            {item.observation && (
                              <div className="flex items-start gap-3 text-[10px] text-blue-400 bg-blue-900/20 p-3 rounded-2xl border border-blue-500/20 mt-2">
                                 <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                                 <span className="italic font-bold">"OBS: {item.observation}"</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 opacity-10 h-full">
              <div className="w-24 h-24 border-2 border-dashed border-gray-500 rounded-full flex items-center justify-center">
                <Grid className="w-12 h-12 text-gray-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Selecione uma mesa ativa</p>
            </div>
          )}
        </div>
      </div>

      {isOpeningTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
           <div className="bg-[#0d1f15] w-full max-w-xs rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-in zoom-in-95 space-y-8">
              <div className="text-center space-y-2">
                 <UtensilsCrossed className="w-12 h-12 text-[#d18a59] mx-auto" />
                 <h3 className="text-2xl font-serif text-white uppercase tracking-tighter">Abrir Mesa</h3>
                 <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Inicie um novo atendimento</p>
              </div>
              <form onSubmit={handleOpenTable} className="space-y-6">
                 <input 
                  type="number" 
                  placeholder="Nº da Mesa"
                  value={newTableNumber}
                  onChange={e => setNewTableNumber(e.target.value)}
                  className="w-full bg-[#06120c] border border-white/5 rounded-3xl py-6 text-center text-4xl font-serif text-[#d18a59] outline-none focus:ring-1 focus:ring-[#d18a59]"
                  autoFocus
                 />
                 <div className="flex gap-4">
                    <button type="button" onClick={() => setIsOpeningTable(false)} className="flex-1 text-xs font-bold text-gray-500 uppercase py-2">Cancelar</button>
                    <button type="submit" className="flex-[2] bg-[#d18a59] text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Abrir Agora</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default WaiterDashboard;
