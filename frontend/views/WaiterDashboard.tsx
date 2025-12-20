import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { TableStatus, OrderStatus } from '../types';
import { Bell, Grid, DollarSign, ChevronRight, X } from 'lucide-react';

const WaiterDashboard: React.FC = () => {
  const { tables, orders, setOrders, updateTableStatus, updateOrderStatus, updateOrderItemStatus, establishment, openTable, setDeviceTableId, deviceTableId, fetchOrdersByTable } = useApp();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [loadingTableOrders, setLoadingTableOrders] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const theme = establishment.theme;
  const activeTables = tables
    .filter(t => t.status !== TableStatus.AVAILABLE)
    .filter(t => !tableFilter || String(t.number).includes(tableFilter))
    .sort((a,b) => a.number - b.number);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSelectTable = async (tableId: string) => {
    setSelectedTable(tableId);
    setLoadingTableOrders(true);
    try {
      const pedidos = await fetchOrdersByTable(tableId);
      setTableOrders(pedidos || []);
      // merge into global orders keeping others
      setOrders(prev => {
        const others = prev.filter(o => String(o.tableId) !== String(tableId));
        return [...others, ...(pedidos || [])];
      });
    } catch (e) {
      setTableOrders([]);
    } finally {
      setLoadingTableOrders(false);
    }
  };

  const handleOpenTable = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTableNumber) return;
    try {
      const tableId = await openTable(Number(newTableNumber));
      setDeviceTableId(tableId);
      setOpenForm(false);
      setNewTableNumber('');
      window.location.hash = '#/mesa';
    } catch (err) {
      setOpenForm(false);
      setNewTableNumber('');
    }
  };

  return (
    <div className="flex h-screen bg-[#06120c]">
      <div className="w-full lg:w-2/3 p-8 lg:p-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-[#d18a59]">Atendimento — Garçom</h2>
          <div className="flex items-center gap-3">
            {!deviceTableId ? (
              <button onClick={() => setOpenForm(true)} style={{ backgroundColor: theme.primary }} className="px-4 py-2 rounded-2xl font-bold text-black">Abrir Mesa</button>
            ) : (
              <button onClick={() => setOpenForm(true)} style={{ backgroundColor: theme.card }} className="px-4 py-2 rounded-2xl font-bold text-white border border-white/10">Abrir Outra</button>
            )}
          </div>
        </div>

        {activeTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20 text-white space-y-4">
            <Grid className="w-16 h-16" />
            <p className="uppercase font-bold tracking-widest text-xs">Nenhuma mesa em atendimento</p>
          </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {activeTables.map(table => (
              <div key={table.id} className="relative group">
                <button
                  onClick={() => handleSelectTable(table.id)}
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  className={`w-full aspect-square flex flex-col items-center justify-center rounded-[2.5rem] border-2 transition-all relative ${table.status === TableStatus.CALLING_WAITER ? 'bg-red-900/40 border-red-500 text-white' : 'bg-[#0d1f15]'}`}
                >
                  <span className="text-3xl lg:text-4xl font-serif font-bold">{table.number}</span>
                  <span className="text-[8px] uppercase font-black mt-2 tracking-widest opacity-50">{table.status}</span>
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
                    onClick={async (e) => { e.stopPropagation(); try { await updateTableStatus(table.id, TableStatus.OCCUPIED); alert('Solicitação marcada como atendida'); if (selectedTable===table.id) setSelectedTable(null); } catch(e){} }}
                    className="absolute bottom-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs shadow-md"
                  >
                    Resolvido
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block lg:w-1/3 p-8 bg-[#07140e] border-l border-white/5">
        {selectedTable ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-serif text-white">Mesa {tables.find(t=>t.id===selectedTable)?.number}</h3>
                <p className="text-xs text-gray-400">Detalhes</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setDeviceTableId(selectedTable); window.location.hash = '#/mesa'; }} className="px-3 py-2 bg-amber-500 text-black rounded-2xl font-bold">Abrir Cardápio</button>
                <button onClick={() => setSelectedTable(null)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>
            {tables.find(t=>t.id===selectedTable)?.status === TableStatus.CALLING_WAITER && (
              <div className="mb-4">
                <button onClick={async () => { await updateTableStatus(selectedTable, TableStatus.OCCUPIED); alert('Solicitação marcada como atendida'); setSelectedTable(null); }} className="px-3 py-2 bg-blue-600 text-white rounded-2xl">Marcar Solicitação Resolvida</button>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-[10px] text-gray-400">Pedidos (cada pedido = 1 cliente)</div>
                <div className="text-sm font-bold text-[#d18a59]">Subtotal R$ {tableOrders.reduce((a,b)=>a+(Number(b.total)||0),0).toFixed(2)}</div>
              </div>

              {loadingTableOrders ? (
                <div className="py-8 text-center text-gray-400">Carregando pedidos...</div>
              ) : tableOrders.length === 0 ? (
                <div className="py-8 text-center text-gray-400">Nenhum pedido para esta mesa.</div>
              ) : (
                <div className="space-y-4">
                  {tableOrders.map((order, idx) => (
                    <div key={order.id} className="bg-black/10 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="text-xs text-gray-300 font-bold">Cliente {idx+1}</span>
                          <div className="text-[10px] text-gray-400">Pedido #{order.id}</div>
                        </div>
                        <div className="text-sm text-white">R$ {Number(order.total).toFixed(2)}</div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div>
                              <div className="text-sm text-white font-medium">{item.quantity}x {item.name}</div>
                              <div className="text-[10px] text-gray-400">{item.observation || ''}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] ${item.status==='DELIVERED' ? 'text-green-400' : 'text-yellow-300'}`}>{item.status==='DELIVERED' ? 'Entregue' : 'Pendente'}</span>
                              {item.status !== 'DELIVERED' && (
                                <button onClick={async () => { try { await updateOrderItemStatus(order.id, item.id, 'DELIVERED'); const updated = await fetchOrdersByTable(selectedTable!); setTableOrders(updated || []); } catch(e){}}} className="px-3 py-1 bg-green-600 text-black rounded-full text-xs font-bold">Marcar Entregue</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => { setDeviceTableId(selectedTable); window.location.hash = '#/mesa'; }} className="px-3 py-2 bg-[#d18a59] text-black rounded-2xl">Ver Cardápio / Conta</button>
                        <button onClick={async () => {
                          const ok = window.confirm('Confirmar pagamento e liberar mesa?');
                          if (!ok) return;
                          const svc = window.confirm('A taxa de serviço foi paga? (OK = Sim, Cancel = Não)');
                          try {
                            await updateOrderStatus(order.id, 'PAID', svc);
                            setOrders(prev => prev.map(o => o.id===order.id ? { ...o, status: 'PAID' } : o));
                            const remaining = tableOrders.filter(o => o.id !== order.id);
                            setTableOrders(remaining);
                          } catch (e) {}
                        }} className="px-3 py-2 bg-green-600 text-black rounded-2xl">Marcar Conta Paga</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4">
                <button onClick={async () => {
                  const ok = window.confirm('Confirmar que todos os clientes da mesa pagaram e liberar a mesa?');
                  if (!ok) return;
                  const svc = window.confirm('A taxa de serviço foi paga? (OK = Sim, Cancel = Não)');
                  try {
                    // marca todos os pedidos da mesa como PAID (com informação de servicePaid)
                    for(const o of tableOrders) await updateOrderStatus(o.id, 'PAID', svc);
                    await updateTableStatus(selectedTable, TableStatus.AVAILABLE, svc);
                    // remove local orders and close panel
                    setOrders(prev => prev.filter(o => String(o.tableId) !== String(selectedTable)));
                    setTableOrders([]);
                    setSelectedTable(null);
                  } catch (e) {}
                }} className="w-full py-3 rounded-2xl bg-white/5">Liberar Mesa (Pagamento Recebido)</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Grid className="w-12 h-12 text-gray-500" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mt-4">Selecione uma mesa ativa</p>
          </div>
        )}
      </div>
      
      {/* Mobile modal for selected table */}
      {isMobile && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedTable(null)}></div>
          <div className="relative z-60 w-full max-w-md p-6 bg-[#0d1f15] rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-serif text-white">Mesa {tables.find(t=>t.id===selectedTable)?.number}</h3>
                <p className="text-xs text-gray-400">Detalhes</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setDeviceTableId(selectedTable); window.location.hash = '#/mesa'; }} className="px-3 py-2 bg-amber-500 text-black rounded-2xl font-bold">Abrir Cardápio</button>
                <button onClick={() => setSelectedTable(null)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="space-y-4">
              {tables.find(t=>t.id===selectedTable)?.status === TableStatus.CALLING_WAITER && (
                <div className="mb-2">
                  <button onClick={async () => { await updateTableStatus(selectedTable, TableStatus.OCCUPIED); alert('Solicitação marcada como atendida'); setSelectedTable(null); }} className="px-3 py-2 bg-blue-600 text-white rounded-2xl w-full">Marcar Solicitação Resolvida</button>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="text-[10px] text-gray-400">Pedidos (cada pedido = 1 cliente)</div>
                <div className="text-sm font-bold text-[#d18a59]">Subtotal R$ {tableOrders.reduce((a,b)=>a+(Number(b.total)||0),0).toFixed(2)}</div>
              </div>

              {loadingTableOrders ? (
                <div className="py-8 text-center text-gray-400">Carregando pedidos...</div>
              ) : tableOrders.length === 0 ? (
                <div className="py-8 text-center text-gray-400">Nenhum pedido para esta mesa.</div>
              ) : (
                <div className="space-y-4">
                  {tableOrders.map((order, idx) => (
                    <div key={order.id} className="bg-black/10 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="text-xs text-gray-300 font-bold">Cliente {idx+1}</span>
                          <div className="text-[10px] text-gray-400">Pedido #{order.id}</div>
                        </div>
                        <div className="text-sm text-white">R$ {Number(order.total).toFixed(2)}</div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div>
                              <div className="text-sm text-white font-medium">{item.quantity}x {item.name}</div>
                              <div className="text-[10px] text-gray-400">{item.observation || ''}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] ${item.status==='DELIVERED' ? 'text-green-400' : 'text-yellow-300'}`}>{item.status==='DELIVERED' ? 'Entregue' : 'Pendente'}</span>
                              {item.status !== 'DELIVERED' && (
                                <button onClick={async () => { try { await updateOrderItemStatus(order.id, item.id, 'DELIVERED'); const updated = await fetchOrdersByTable(selectedTable!); setTableOrders(updated || []); } catch(e){}}} className="px-3 py-1 bg-green-600 text-black rounded-full text-xs font-bold">Marcar Entregue</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => { setDeviceTableId(selectedTable); window.location.hash = '#/mesa'; }} className="px-3 py-2 bg-[#d18a59] text-black rounded-2xl">Ver Cardápio / Conta</button>
                        <button onClick={async () => {
                          const ok = window.confirm('Confirmar pagamento e liberar mesa?');
                          if (!ok) return;
                          try {
                            await updateOrderStatus(order.id, 'PAID');
                            setOrders(prev => prev.map(o => o.id===order.id ? { ...o, status: 'PAID' } : o));
                            const remaining = tableOrders.filter(o => o.id !== order.id);
                            setTableOrders(remaining);
                          } catch (e) {}
                        }} className="px-3 py-2 bg-green-600 text-black rounded-2xl">Marcar Conta Paga</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4">
                <button onClick={async () => {
                  const ok = window.confirm('Confirmar que todos os clientes da mesa pagaram e liberar a mesa?');
                  if (!ok) return;
                  const svc = window.confirm('A taxa de serviço foi paga? (OK = Sim, Cancel = Não)');
                  try {
                    for(const o of tableOrders) await updateOrderStatus(o.id, 'PAID', svc);
                    await updateTableStatus(selectedTable, TableStatus.AVAILABLE, svc);
                    setOrders(prev => prev.filter(o => String(o.tableId) !== String(selectedTable)));
                    setTableOrders([]);
                    setSelectedTable(null);
                  } catch (e) {}
                }} className="w-full py-3 rounded-2xl bg-white/5">Liberar Mesa (Pagamento Recebido)</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setOpenForm(false)}></div>
          <form onSubmit={handleOpenTable} className="relative z-60 p-6 bg-[#0d1f15] rounded-2xl border border-white/5">
            <input value={newTableNumber} onChange={e=>setNewTableNumber(e.target.value)} placeholder="Número da mesa" className="p-3 rounded-2xl bg-black/20 mb-3" />
            <div className="flex gap-2">
              <button type="button" onClick={()=>setOpenForm(false)} className="px-4 py-2 bg-white/5 rounded-2xl">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#d18a59] text-black rounded-2xl">Abrir</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WaiterDashboard;

