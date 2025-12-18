
import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { TableStatus, OrderItem, Table, Order, Product } from '../types';
import { ShoppingCart, Bell, Receipt, Plus, Minus, X, Check, Search, ChevronLeft, Lock, Star, Sparkles, MessageSquare, Timer, Send, UtensilsCrossed } from 'lucide-react';

const CustomerView: React.FC = () => {
  const { products, addOrder, updateTableStatus, tables, deviceTableId, setDeviceTableId, orders, categories: appCategories, addFeedback, establishment, openTable } = useApp();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isChangeTableOpen, setIsChangeTableOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [tableInput, setTableInput] = useState('');

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const currentTable = tables.find(t => t.id === deviceTableId);
  const tableOrders = orders.filter(o => o.tableId === deviceTableId);
  const subTotal = tableOrders.reduce((acc, o) => acc + o.total, 0);
  const serviceValue = subTotal * (establishment.serviceCharge / 100);
  const grandTotal = subTotal + serviceValue;

  const highlights = products.filter(p => p.isHighlight);
  const menuCategories = ['Todas', ...appCategories];

  const theme = establishment.theme;

  const filteredProducts = products.filter(p => 
    (activeCategory === 'Todas' || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedProducts: Record<string, Product[]> = appCategories.reduce((acc, cat) => {
    const productsInCat = filteredProducts.filter(p => p.category === cat);
    if (productsInCat.length > 0) acc[cat] = productsInCat;
    return acc;
  }, {} as Record<string, Product[]>);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStartService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableInput) return;
    const tableId = await openTable(parseInt(tableInput));
    setDeviceTableId(tableId);
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, status: 'PENDING', observation: '' }];
    });
    showNotification(`${product.name} adicionado ao carrinho`);
  };

  const updateItemObservation = (id: string, obs: string) => {
    setCart(prev => prev.map(item => item.productId === id ? { ...item, observation: obs } : item));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !deviceTableId) return;
    await addOrder(deviceTableId, cart);
    setCart([]);
    setIsCartOpen(false);
    showNotification("Pedido enviado para a cozinha!", "success");
  };

  const handleCallWaiter = () => {
    if (!deviceTableId) return;
    updateTableStatus(deviceTableId, TableStatus.CALLING_WAITER);
    showNotification("O garçom já foi chamado!", "info");
  };

  const handleRequestFinalBill = () => {
    if (!deviceTableId) return;
    updateTableStatus(deviceTableId, TableStatus.BILL_REQUESTED);
    setIsBillOpen(false);
    setIsFeedbackOpen(true);
    showNotification("Solicitação de conta enviada!", "info");
  };

  const handleSubmitFeedback = () => {
    if (!currentTable) return;
    addFeedback({
      tableNumber: currentTable.number,
      rating: feedbackRating,
      comment: feedbackComment
    });
    setIsFeedbackOpen(false);
    setFeedbackComment('');
    setFeedbackRating(5);
    showNotification("Obrigado pela sua avaliação!", "success");
  };

  const handleConfirmChangeTable = () => {
    if (pinInput === '1234') {
      setDeviceTableId(null);
      setIsChangeTableOpen(false);
      setPinInput('');
    } else {
      alert("PIN inválido!");
    }
  };

  if (!deviceTableId) {
    return (
      <div style={{ backgroundColor: theme.background }} className="min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="max-w-md w-full space-y-12 animate-in fade-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-[#d18a59]/20 blur-[60px] rounded-full"></div>
            <img src={establishment.logo} className="h-32 mx-auto relative z-10 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" alt="Logo" />
          </div>
          <div className="space-y-4">
            <h2 style={{ color: theme.primary }} className="text-5xl font-serif uppercase tracking-tighter">Seja Bem-vindo</h2>
            <p style={{ color: theme.text }} className="text-[11px] uppercase tracking-[0.4em] font-black opacity-60">Para iniciar o atendimento, informe seu lugar</p>
          </div>
          <form onSubmit={handleStartService} className="space-y-8 bg-[#0d1f15] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
             <div className="space-y-4">
                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest block text-left ml-2">Qual o número da sua mesa?</label>
                <input 
                  type="number" 
                  value={tableInput}
                  onChange={e => setTableInput(e.target.value)}
                  placeholder="00"
                  className="w-full bg-[#06120c] border border-white/5 rounded-3xl py-8 text-center text-6xl font-serif text-[#d18a59] outline-none focus:ring-1 focus:ring-[#d18a59] placeholder:opacity-10"
                  autoFocus
                />
             </div>
             <button 
              type="submit"
              disabled={!tableInput}
              style={{ backgroundColor: theme.primary }}
              className="w-full text-black font-black py-6 rounded-2xl text-[12px] uppercase tracking-[0.3em] shadow-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-20">
               Começar a Pedir
             </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.background, color: theme.text }} className="min-h-screen pb-40 overflow-x-hidden">
      <div className="relative h-64 overflow-hidden">
        <img src="https://cervejacamposdojordao.com.br/wp-content/uploads/2021/08/bg-playpub.jpg" className="w-full h-full object-cover scale-105" alt="Banner" />
        <div style={{ background: `linear-gradient(to top, ${theme.background}, transparent)` }} className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="text-5xl font-serif text-white uppercase tracking-tighter">{establishment.name.split(' ')[0]}</h1>
              <div className="flex items-center gap-3">
                 <span style={{ backgroundColor: theme.primary }} className="h-0.5 w-6"></span>
                 <p style={{ color: theme.primary }} className="font-bold tracking-[0.4em] text-[10px] uppercase">Mesa {currentTable?.number}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsChangeTableOpen(true)}
              className="text-white hover:opacity-80 transition-opacity text-[9px] uppercase font-bold flex items-center gap-2 bg-black/40 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-lg">
              <Lock className="w-3 h-3" /> Alterar
            </button>
          </div>
        </div>
      </div>

      {highlights.length > 0 && searchTerm === '' && (
        <div className="py-8 space-y-4">
           <div className="px-8 flex items-center gap-3">
             <Sparkles style={{ color: theme.primary }} className="w-4 h-4" />
             <h3 style={{ color: theme.text }} className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80">Seleção do Chef</h3>
           </div>
           <div className="flex gap-6 overflow-x-auto px-8 no-scrollbar snap-x">
             {highlights.map(item => (
               <div 
                 key={item.id} 
                 onClick={() => addToCart(item)}
                 style={{ backgroundColor: theme.card, borderColor: 'rgba(255,255,255,0.05)' }}
                 className="snap-start min-w-[260px] rounded-[2.5rem] overflow-hidden border relative active:scale-95 transition-all shadow-2xl group cursor-pointer"
               >
                 <div className="h-32 w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: `url(${item.image})` }}></div>
                 <div className="p-6 space-y-2">
                   <h4 className="font-bold text-base text-white truncate">{item.name}</h4>
                   <p style={{ color: theme.primary }} className="font-serif font-bold text-xl leading-none">R$ {item.price.toFixed(2)}</p>
                 </div>
                 <div style={{ backgroundColor: theme.primary }} className="absolute bottom-6 right-6 text-black p-2.5 rounded-full shadow-lg">
                    <Plus className="w-4 h-4" />
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div style={{ backgroundColor: `${theme.background}E6` }} className="sticky top-0 z-40 backdrop-blur-2xl p-6 pt-8 space-y-5 border-b border-white/5">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 transition-colors" />
          <input 
            type="text" 
            placeholder="Qual será a pedida de hoje?"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ backgroundColor: theme.card, color: theme.text, borderColor: 'rgba(255,255,255,0.05)' }}
            className="w-full border rounded-3xl pl-14 pr-6 py-4.5 text-sm transition-all placeholder-gray-300 outline-none"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {menuCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ 
                backgroundColor: activeCategory === cat ? theme.primary : theme.card,
                color: activeCategory === cat ? theme.background : theme.text,
                borderColor: 'rgba(255,255,255,0.05)'
              }}
              className="px-7 py-3 rounded-2xl text-[10px] font-bold transition-all whitespace-nowrap uppercase tracking-widest border"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 pt-10 space-y-12 max-w-4xl mx-auto">
        {Object.entries(groupedProducts).map(([catName, productsList]) => (
          <div key={catName} className="space-y-6">
            <div className="flex items-center gap-4 ml-2">
               <h2 className="text-white font-serif text-3xl uppercase tracking-tighter">{catName}</h2>
               <div className="flex-1 h-px bg-white/10"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {productsList.map(product => (
                <div key={product.id} style={{ backgroundColor: `${theme.card}80`, borderColor: 'rgba(255,255,255,0.05)' }} className="rounded-[2rem] overflow-hidden flex gap-5 border p-4 group active:bg-white/5 transition-all">
                  <div className="w-28 h-28 rounded-2xl bg-cover bg-center shrink-0 border border-white/10" style={{ backgroundImage: `url(${product.image})` }}></div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-white group-hover:opacity-70 transition-opacity">{product.name}</h4>
                        {product.isHighlight && <Star style={{ color: theme.primary }} className="w-3 h-3 fill-current" />}
                      </div>
                      <p style={{ color: theme.text }} className="text-[10px] opacity-70 leading-relaxed line-clamp-3">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span style={{ color: theme.primary }} className="font-serif font-bold text-lg">R$ {product.price.toFixed(2)}</span>
                      <button 
                        onClick={() => addToCart(product)}
                        style={{ backgroundColor: theme.primary }}
                        className="text-black p-2.5 rounded-2xl hover:scale-110 transition-all shadow-lg active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {tableOrders.some(o => o.status !== 'PAID') && (
        <div className="fixed bottom-32 left-6 right-6 z-50 animate-in slide-in-from-bottom-10">
           <div style={{ backgroundColor: `${theme.card}F2` }} className="p-5 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div style={{ backgroundColor: `${theme.primary}33` }} className="p-3 rounded-2xl">
                    <Timer style={{ color: theme.primary }} className="w-5 h-5 animate-pulse" />
                 </div>
                 <div>
                    <p style={{ color: theme.text }} className="text-[10px] uppercase font-bold tracking-widest opacity-60">Seu Pedido está</p>
                    <p className="text-xs font-bold text-white uppercase">Em Preparação na Cozinha</p>
                 </div>
              </div>
              <div className="flex gap-1">
                 {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ backgroundColor: i <= 2 ? theme.primary : 'rgba(255,255,255,0.1)' }} className="w-6 h-1 rounded-full"></div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <div style={{ background: `linear-gradient(to top, #000, transparent)` }} className="fixed bottom-0 left-0 right-0 z-50 p-8">
        <div className="max-w-xl mx-auto flex gap-5">
          <button 
            onClick={handleCallWaiter}
            style={{ backgroundColor: theme.card, borderColor: 'rgba(255,255,255,0.1)' }}
            className="border text-white flex-1 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-1.5 shadow-2xl active:scale-95 transition-all">
            <Bell className={`w-5 h-5 ${currentTable?.status === TableStatus.CALLING_WAITER ? 'text-red-500 animate-bounce' : ''}`} style={{ color: currentTable?.status === TableStatus.CALLING_WAITER ? undefined : theme.primary }} />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white">Garçom</span>
          </button>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ backgroundColor: theme.primary }}
            className="text-black flex-[2.8] py-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all relative overflow-hidden group">
            <ShoppingCart className="w-5 h-5" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs uppercase tracking-[0.2em] font-bold">Meu Pedido</span>
              <span className="text-[10px] font-bold opacity-70">Total: R$ {cartTotal.toFixed(2)}</span>
            </div>
            {cart.length > 0 && (
              <span className="absolute top-3 right-5 bg-black text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center border border-white/10 font-black shadow-lg">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>

          <button 
            onClick={() => setIsBillOpen(true)}
            style={{ backgroundColor: theme.card, borderColor: 'rgba(255,255,255,0.1)' }}
            className="border text-white flex-1 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-1.5 shadow-2xl active:scale-95 transition-all">
            <Receipt style={{ color: theme.primary }} className={`w-5 h-5 ${currentTable?.status === TableStatus.BILL_REQUESTED ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white">Conta</span>
          </button>
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setIsCartOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-lg rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-10 space-y-8 animate-in slide-in-from-bottom duration-500 border-t border-white/10">
            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto opacity-50 mb-2"></div>
            <div className="flex justify-between items-center">
              <h3 style={{ color: theme.primary }} className="text-4xl font-serif uppercase tracking-tighter">Pedido</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-6 no-scrollbar py-2">
              {cart.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                   <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-white" />
                   <p className="text-sm uppercase font-bold tracking-widest text-white">Sua sacola está vazia</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="space-y-4 bg-black/30 p-5 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h5 className="font-bold text-base text-white">{item.name}</h5>
                        <p style={{ color: theme.primary }} className="text-xs font-bold">R$ {item.price.toFixed(2)} cada</p>
                      </div>
                      <div className="flex items-center gap-5 bg-black/40 rounded-2xl p-1.5 border border-white/5">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"><Minus className="w-4 h-4" /></button>
                        <span className="font-black text-sm w-4 text-center text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)} style={{ color: theme.primary }} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="Adicionar observação (ex: sem cebola)" 
                        value={item.observation || ''}
                        onChange={e => updateItemObservation(item.productId, e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white placeholder-gray-300 outline-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="space-y-8 pt-6">
                <div className="flex justify-between items-end">
                  <span className="text-white font-bold uppercase text-[10px] tracking-widest mb-1 opacity-70">Subtotal</span>
                  <span style={{ color: theme.primary }} className="text-5xl font-serif font-bold">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handlePlaceOrder}
                  style={{ backgroundColor: theme.primary }}
                  className="w-full text-black font-black py-7 rounded-[2rem] text-[11px] uppercase tracking-[0.3em] hover:opacity-90 shadow-2xl transition-all active:scale-95">
                  Confirmar e Enviar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isBillOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setIsBillOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-lg rounded-t-[4rem] shadow-2xl p-10 space-y-8 animate-in slide-in-from-bottom duration-500 border-t border-white/10">
            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto opacity-50 mb-2"></div>
            <div className="flex justify-between items-center">
              <h3 style={{ color: theme.primary }} className="text-4xl font-serif uppercase tracking-tighter">Minha Conta</h3>
              <button onClick={() => setIsBillOpen(false)} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-[45vh] overflow-y-auto space-y-4 no-scrollbar border-y border-white/5 py-8">
              {tableOrders.length === 0 ? (
                <p className="text-center text-white py-10 uppercase font-bold text-xs">Nenhum consumo registrado</p>
              ) : (
                <>
                  {tableOrders.map((order, idx) => (
                    <div key={order.id} className="p-5 bg-black/20 rounded-3xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-200 font-black uppercase">Pedido #{idx + 1}</span>
                        <span style={{ color: theme.primary }} className="text-[10px] font-black">R$ {order.total.toFixed(2)}</span>
                      </div>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-white font-medium">{item.quantity}x {item.name}</span>
                          <span className="text-gray-300">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  <div className="p-5 space-y-3 bg-white/5 rounded-3xl mt-6 border border-white/5">
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-white font-bold">R$ {subTotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Serviço ({establishment.serviceCharge}%)</span>
                        <span className="text-white font-bold">R$ {serviceValue.toFixed(2)}</span>
                     </div>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <span className="text-white font-bold uppercase text-[10px] tracking-widest mb-1 opacity-70">Total a Pagar</span>
                <span style={{ color: theme.primary }} className="text-5xl font-serif font-bold">R$ {grandTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleRequestFinalBill}
                disabled={grandTotal === 0}
                style={{ backgroundColor: theme.primary }}
                className="w-full text-black font-black py-7 rounded-[2rem] text-[11px] uppercase tracking-[0.3em] hover:opacity-90 shadow-2xl transition-all active:scale-95 disabled:opacity-20">
                Pedir Fechamento (Trazer Conta)
              </button>
            </div>
          </div>
        </div>
      )}

      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsFeedbackOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-md rounded-[3rem] p-10 border border-white/5 space-y-8 shadow-2xl animate-in zoom-in-95">
            <div className="text-center space-y-4">
               <div style={{ backgroundColor: `${theme.primary}1A`, borderColor: `${theme.primary}33` }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border">
                 <Star style={{ color: theme.primary }} className="w-10 h-10 fill-current" />
               </div>
               <h3 style={{ color: theme.primary }} className="text-3xl font-serif uppercase tracking-tighter">Sua Opinião</h3>
               <p className="text-[10px] text-white uppercase font-black tracking-widest opacity-80">Como foi sua experiência no Playpub?</p>
            </div>

            <div className="flex justify-center gap-3">
               {[1, 2, 3, 4, 5].map(num => (
                 <button 
                   key={num} 
                   onClick={() => setFeedbackRating(num)}
                   style={{ 
                    backgroundColor: feedbackRating >= num ? theme.primary : 'black',
                    color: feedbackRating >= num ? 'black' : 'white',
                    borderColor: 'rgba(255,255,255,0.1)'
                   }}
                   className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all border">
                   <Star className={`w-6 h-6 ${feedbackRating >= num ? 'fill-current' : ''}`} />
                 </button>
               ))}
            </div>

            <div className="space-y-2">
               <label className="text-[10px] text-white uppercase font-black tracking-widest ml-4">Comentário (opcional)</label>
               <textarea 
                 value={feedbackComment}
                 onChange={e => setFeedbackComment(e.target.value)}
                 placeholder="O que mais gostou? No que podemos melhorar?"
                 className="w-full bg-black/50 border border-white/10 rounded-3xl p-6 text-sm text-white placeholder-gray-400 outline-none min-h-[120px] resize-none"
               />
            </div>

            <button 
              onClick={handleSubmitFeedback}
              style={{ backgroundColor: theme.primary }}
              className="w-full text-black font-black py-6 rounded-2xl text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              Enviar Avaliação <Send className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsFeedbackOpen(false)}
              className="w-full text-[10px] text-white uppercase font-black tracking-widest opacity-40">Pular por enquanto</button>
          </div>
        </div>
      )}

      {isChangeTableOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsChangeTableOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-xs rounded-[3rem] p-10 border border-white/5 space-y-8 shadow-2xl animate-in zoom-in-95">
            <div className="text-center space-y-3">
              <Lock style={{ color: theme.primary }} className="w-10 h-10 mx-auto" />
              <h3 style={{ color: theme.primary }} className="font-serif text-2xl uppercase tracking-widest">Área Restrita</h3>
              <p className="text-[10px] text-white uppercase font-bold opacity-80">Solicite o PIN ao garçom</p>
            </div>
            <input 
              type="password" 
              placeholder="••••"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-3xl py-6 text-center text-4xl tracking-[0.5em] text-white outline-none"
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => setIsChangeTableOpen(false)} className="flex-1 text-xs font-bold text-white uppercase opacity-40">Cancelar</button>
              <button onClick={handleConfirmChangeTable} style={{ backgroundColor: theme.primary }} className="flex-1 text-black py-4 rounded-2xl text-[10px] font-bold uppercase">Liberar</button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-12 left-8 right-8 z-[200] flex justify-center pointer-events-none">
          <div style={{ backgroundColor: theme.card, borderColor: notification.type === 'success' ? 'rgba(34,197,94,0.3)' : theme.primary }} className="px-10 py-6 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex items-center gap-5 animate-in fade-in slide-in-from-top-10 duration-700 border text-white">
            <div className={`p-2.5 rounded-full ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-white/10'}`}>
              <Check className={`w-5 h-5 font-bold ${notification.type === 'success' ? 'text-green-500' : 'text-white'}`} />
            </div>
            <p className="font-bold text-xs uppercase tracking-widest">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
