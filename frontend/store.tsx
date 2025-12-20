// ...código limpo...
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Table, Order, TableStatus, OrderStatus, Establishment, User, OrderItem, Feedback, ThemeConfig } from './types';

interface AppContextType {
  establishment: Establishment;
  setEstablishment: (e: Establishment) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  waiters: User[];
  setWaiters: React.Dispatch<React.SetStateAction<User[]>>;
  feedbacks: Feedback[];
  addFeedback: (f: Omit<Feedback, 'id' | 'timestamp'>) => void;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  accessToken: string | null;
  setAccessToken: (t: string | null) => void;
  logout: () => Promise<void>;
  deviceTableId: string | null;
  setDeviceTableId: (id: string | null) => void;

  // Novo: buscar pedidos de uma mesa sem sobrescrever o global
  fetchOrdersByTable: (tableId: string) => Promise<Order[]>;

  // Actions
  addOrder: (tableId: string, items: any[]) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderItemStatus: (orderId: string, productId: string, status: 'PENDING' | 'DELIVERED') => void;
  deleteProduct: (productId: string) => void;
  addProduct: (product: Product) => void;
  toggleProductHighlight: (productId: string) => void;
  addWaiter: (name: string, password: string) => void;
  deleteWaiter: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  openTable: (number: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_THEME: ThemeConfig = {
  background: "#06120c",
  card: "#0d1f15",
  text: "#fefce8",
  primary: "#d18a59",
  accent: "#c17a49"
};

const API_BASE = process.env?.VITE_API_URL || 'http://localhost:4000/api';

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_CATEGORIES: string[] = [];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [establishment, setEstablishment] = useState<Establishment>({ name: '', logo: '', address: '', serviceCharge: 10, theme: INITIAL_THEME } as any);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<User[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [deviceTableId, setDeviceTableId] = useState<string | null>(null);

  // Função para buscar pedidos de uma mesa específica (sem sobrescrever o global)
  const fetchOrdersByTable = useCallback(async (tableId: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders?tableId=${tableId}`);
      if (res.ok) {
        const pedidos = await res.json();
        return pedidos.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) }));
      }
    } catch (e) {}
    return [];
  }, []);

  // Load initial data from backend e refresh access token (refresh cookie)
  useEffect(() => {
    (async () => {
      try {
        let localAccess: string | null = null;
        const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        let d: any = null;
        if (r.ok) {
          d = await r.json();
          localAccess = d.accessToken;
          setAccessToken(localAccess);
          setCurrentUser({ id: String(d.user.id), name: d.user.name, role: d.user.role } as any);
        }

        const headers: any = { 'Content-Type': 'application/json' };
        if (localAccess) headers['Authorization'] = `Bearer ${localAccess}`;

        const fetchWithRetry = async (url: string) => {
          let res = await fetch(url, { headers });
          if (res.status === 401 || res.status === 403) {
            // tenta renovar token
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
            if (refreshRes.ok) {
              const d = await refreshRes.json();
              localAccess = d.accessToken;
              setAccessToken(localAccess);
              headers['Authorization'] = `Bearer ${localAccess}`;
            }
            res = await fetch(url, { headers });
          }
          return res.ok ? await res.json() : null;
        };

        // Carrega dados públicos sempre, protegidos só se autenticado
        const [estRes, prodRes, catRes, tableRes, fbRes] = await Promise.all([
          fetchWithRetry(`${API_BASE}/establishment`).catch(() => null),
          fetchWithRetry(`${API_BASE}/products`).catch(() => []),
          fetchWithRetry(`${API_BASE}/categories`).catch(() => []),
          fetchWithRetry(`${API_BASE}/tables`).catch(() => []),
          fetchWithRetry(`${API_BASE}/feedbacks`).catch(() => [])
        ]);
        if (estRes) setEstablishment(estRes);
        if (Array.isArray(prodRes)) setProducts(prodRes.map((p: any) => ({ ...p, id: String(p.id), category: (typeof p.category === 'string' ? p.category : (p.category?.name || 'Geral')) } as any)));
        if (Array.isArray(catRes)) setCategories(catRes.map((c: any) => c.name));
        if (Array.isArray(tableRes)) setTables(tableRes.map((t: any) => ({ ...t, id: String(t.id) })));
        if (Array.isArray(fbRes)) setFeedbacks(fbRes.map((f: any) => ({ ...f, id: String(f.id) })));

        // Só busca dados protegidos se autenticado
        if (localAccess && d && d.user && d.user.role === 'admin') {
          const [orderRes, userRes] = await Promise.all([
            fetchWithRetry(`${API_BASE}/orders`).catch(() => []),
            fetchWithRetry(`${API_BASE}/users`).catch(() => []),
          ]);
          if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
          if (Array.isArray(userRes)) setWaiters(userRes.filter((u:any)=>u.role==='waiter').map((u:any)=>({ ...u, id: String(u.id) })));
        } else if (localAccess && d && d.user && d.user.role === 'customer') {
          // Para cliente, busca apenas pedidos da mesa
          const tableId = localStorage.getItem('deviceTableId');
          if (tableId) {
            const orderRes = await fetchWithRetry(`${API_BASE}/orders?tableId=${tableId}`).catch(() => []);
            if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
          }
        }
      } catch (err) {
        // failed to load remote API during init — fallback silently to local state
      }
    })();
  }, []);

  // When accessToken or currentUser changes, fetch protected resources for admins
  useEffect(() => {
    if (!accessToken || !currentUser) return;
    (async () => {
      try {
        if (currentUser.role === 'admin') {
          const [orderRes, userRes] = await Promise.all([
            fetchWithAuth(`${API_BASE}/orders`).catch(() => []),
            fetchWithAuth(`${API_BASE}/users`).catch(() => [])
          ]);
          if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
          if (Array.isArray(userRes)) setWaiters(userRes.filter((u:any)=>u.role==='waiter').map((u:any)=>({ ...u, id: String(u.id) })));
        } else if (currentUser.role === 'waiter') {
          // waiter may want to see orders
          const orderRes = await fetchWithAuth(`${API_BASE}/orders`).catch(() => []);
          if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [accessToken, currentUser]);

  // Quando o accessToken ou currentUser mudarem, busca dados protegidos para admins
  useEffect(() => {
    (async () => {
      if (!accessToken || !currentUser) return;
      try {
        if (currentUser.role === 'admin') {
          const ordersRes = await fetchWithAuth(`${API_BASE}/orders`);
          if (ordersRes && ordersRes.ok) {
            const ordersData = await ordersRes.json();
            setOrders(Array.isArray(ordersData) ? ordersData.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })) : []);
          }
          const usersRes = await fetchWithAuth(`${API_BASE}/users`);
          if (usersRes && usersRes.ok) {
            const usersData = await usersRes.json();
            setWaiters(Array.isArray(usersData) ? usersData.filter((u:any)=>u.role==='waiter').map((u:any)=>({ ...u, id: String(u.id) })) : []);
          }
        } else if (currentUser.role === 'waiter') {
          // para garçom, atualiza pedidos se necessário
          const tableId = localStorage.getItem('deviceTableId');
          if (tableId) {
            const ordRes = await fetchWithAuth(`${API_BASE}/orders?tableId=${tableId}`);
            if (ordRes && ordRes.ok) {
              const ordData = await ordRes.json();
              setOrders(Array.isArray(ordData) ? ordData.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })) : []);
            }
          }
        }
      } catch (e) {
        // fail silently
      }
    })();
  }, [accessToken, currentUser]);

  useEffect(() => {
    // Attempt to persist changes to backend; fallback to localStorage when offline
    (async () => {
      try {
        await fetch(`${API_BASE}/establishment`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(establishment) });
      } catch (e) {
        localStorage.setItem('establishment', JSON.stringify(establishment));
      }

      try {
        // Sync products (naive approach: delete/create not handled) — keep local for now
        localStorage.setItem('products', JSON.stringify(products));
      } catch (e) {}

      try { localStorage.setItem('categories', JSON.stringify(categories)); } catch(e){}
      try { localStorage.setItem('tables', JSON.stringify(tables)); } catch(e){}
      try { localStorage.setItem('orders', JSON.stringify(orders)); } catch(e){}
      try { localStorage.setItem('waiters', JSON.stringify(waiters)); } catch(e){}
      try { localStorage.setItem('feedbacks', JSON.stringify(feedbacks)); } catch(e){}
      if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); else localStorage.removeItem('currentUser');
      if (deviceTableId) localStorage.setItem('deviceTableId', deviceTableId); else localStorage.removeItem('deviceTableId');
    })();
  }, [establishment, products, categories, tables, orders, waiters, feedbacks, currentUser, deviceTableId]);

  const fetchWithAuth = async (input: RequestInfo, init?: RequestInit) => {
    let access = accessToken;
    const headers = { 'Content-Type': 'application/json', ...(init?.headers as any || {}) } as any;
    if (access) headers['Authorization'] = `Bearer ${access}`;
    let res = await fetch(input, { credentials: 'include', ...init, headers });
    if (res.status === 401 || res.status === 403) {
      // tenta renovar token
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const d = await refreshRes.json();
        access = d.accessToken;
        setAccessToken(access);
        headers['Authorization'] = `Bearer ${access}`;
        res = await fetch(input, { credentials: 'include', ...init, headers });
      } else {
        // Se não conseguir renovar, limpa estado e redireciona para login de garçom
        setAccessToken(null);
        setCurrentUser(null);
        try { localStorage.removeItem('currentUser'); } catch {}
        // envia usuário para a tela de login waiter para reautenticação
        window.location.hash = '#/login/waiter';
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    }
    return res;
  };

  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus) => {
    try {
      await fetchWithAuth(`${API_BASE}/tables/${tableId}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    } catch (e) {
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    }
  }, []);

  const openTable = async (number: number) => {
    try {
      // check existing
      const res = await fetchWithAuth(`${API_BASE}/tables`);
      const all = await res.json();
      const existing = all.find((t: any) => t.number === number);
      if (existing) {
        if (existing.status === TableStatus.AVAILABLE) {
          await updateTableStatus(String(existing.id), TableStatus.OCCUPIED);
        }
        return String(existing.id);
      }
      const createRes = await fetchWithAuth(`${API_BASE}/tables`, { method: 'POST', body: JSON.stringify({ number }) });
      const created = await createRes.json();
      const newTable: Table = { id: String(created.id), number: created.number, status: created.status };
      setTables(prev => [...prev, newTable]);
      return newTable.id;
    } catch (e) {
      // fallback local
      const newId = `table-${Date.now()}`;
      const newTable: Table = { id: newId, number, status: TableStatus.OCCUPIED };
      setTables(prev => [...prev, newTable]);
      return newId;
    }
  };

  const addOrder = useCallback(async (tableId: string, items: any[]) => {
    // Garante que cada item tem productId, name, price, quantity, status
    const normalizedItems = items.map(item => ({
      productId: Number(item.productId),
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      status: item.status || 'PENDING',
      observation: item.observation || null
    }));
    const subtotal = normalizedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    try {
      const res = await fetchWithAuth(`${API_BASE}/orders`, { method: 'POST', body: JSON.stringify({ tableId: Number(tableId), items: normalizedItems, total: subtotal }) });
      const created = await res.json();
      await updateTableStatus(String(created.tableId), TableStatus.OCCUPIED);
      // Após criar pedido, buscar novamente pedidos da mesa para garantir que os itens tenham o id correto do backend
      const pedidosRes = await fetchWithAuth(`${API_BASE}/orders?tableId=${tableId}`);
      if (pedidosRes.ok) {
        const pedidos = await pedidosRes.json();
        setOrders(pedidos.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
      }
    } catch (e) {
      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        tableId,
        items: normalizedItems,
        status: OrderStatus.PENDING,
        timestamp: Date.now(),
        total: subtotal
      };
      setOrders(prev => [...prev, newOrder]);
      updateTableStatus(tableId, TableStatus.OCCUPIED);
    }
  }, [updateTableStatus]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      await fetchWithAuth(`${API_BASE}/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    }
  }, []);

  const updateOrderItemStatus = useCallback(async (orderId: string, itemId: string, status: 'PENDING' | 'DELIVERED') => {
    try {
      await fetchWithAuth(`${API_BASE}/orders/${orderId}/items/${itemId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(order => {
        if (order.id !== orderId) return order;
        const newItems = order.items.map(item => item.id === itemId ? { ...item, status } : item);
        const allDelivered = newItems.every(i => i.status === 'DELIVERED');
        const anyDelivered = newItems.some(i => i.status === 'DELIVERED');
        let newOrderStatus = OrderStatus.PENDING;
        if (allDelivered) newOrderStatus = OrderStatus.DELIVERED;
        else if (anyDelivered) newOrderStatus = OrderStatus.PARTIAL;
        return { ...order, items: newItems, status: newOrderStatus };
      }));
    } catch (e) {
      // local fallback
      setOrders(prev => prev.map(order => {
        if (order.id !== orderId) return order;
        const newItems = order.items.map(item => item.id === itemId ? { ...item, status } : item);
        const allDelivered = newItems.every(i => i.status === 'DELIVERED');
        const anyDelivered = newItems.some(i => i.status === 'DELIVERED');
        let newOrderStatus = OrderStatus.PENDING;
        if (allDelivered) newOrderStatus = OrderStatus.DELIVERED;
        else if (anyDelivered) newOrderStatus = OrderStatus.PARTIAL;
        return { ...order, items: newItems, status: newOrderStatus };
      }));
    }
  }, []);

  const addFeedback = async (f: Omit<Feedback, 'id' | 'timestamp'>) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/feedbacks`, { method: 'POST', body: JSON.stringify(f) });
      const created = await res.json();
      setFeedbacks(prev => [{ ...created, id: String(created.id) }, ...prev]);
    } catch (e) {
      const newFeedback: Feedback = { ...f, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() };
      setFeedbacks(prev => [newFeedback, ...prev]);
    }
  };

  const addProduct = async (p: Product) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/products`, { method: 'POST', body: JSON.stringify(p) });
      const created = await res.json();
      const normalized = { ...created, id: String(created.id), category: (typeof created.category === 'string' ? created.category : (created.category?.name || 'Geral')) } as any;
      setProducts(prev => [...prev, normalized]);
    } catch (e) {
      setProducts(prev => [...prev, p]);
    }
  };

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/products/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      const updated = await res.json();
      const normalized = { ...updated, id: String(updated.id), category: (typeof updated.category === 'string' ? updated.category : (updated.category?.name || 'Geral')) } as any;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...normalized } : p));
      return true;
    } catch (e) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await fetchWithAuth(`${API_BASE}/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };
  
  const toggleProductHighlight = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/products/${id}`, { method: 'PUT', body: JSON.stringify({ isHighlight: !prod.isHighlight }) });
      const updated = await res.json();
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isHighlight: updated.isHighlight } : p));
    } catch (e) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isHighlight: !p.isHighlight } : p));
    }
  };

  const addWaiter = async (name: string, password: string) => {
    try {
      const username = name.replace(/\s+/g, '').toLowerCase();
      const res = await fetchWithAuth(`${API_BASE}/users`, { method: 'POST', body: JSON.stringify({ name, username, password, role: 'waiter' }) });
      const created = await res.json();
      setWaiters(prev => [...prev, { ...created, id: String(created.id) }]);
    } catch (e) {
      const newWaiter: User = { id: Math.random().toString(36).substr(2, 9), name, role: 'waiter' } as any;
      setWaiters(prev => [...prev, newWaiter]);
    }
  };

  const deleteWaiter = async (id: string) => {
    try {
      await fetchWithAuth(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      setWaiters(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      setWaiters(prev => prev.filter(w => w.id !== id));
    }
  };

  const addCategory = async (name: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`, { method: 'POST', body: JSON.stringify({ name }) });
      const created = await res.json();
      setCategories(prev => [...prev, created.name]);
    } catch (e) {
      if (!categories.includes(name)) setCategories(prev => [...prev, name]);
    }
  };

  const saveEstablishment = async () => {
    try {
      const res = await fetch(`${API_BASE}/establishment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(establishment) });
      if (res.ok) {
        const updated = await res.json();
        setEstablishment(updated);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const deleteCategory = async (name: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`);
      const cats = await res.json();
      const found = cats.find((c: any) => c.name === name);
      if (found) await fetchWithAuth(`${API_BASE}/categories/${found.id}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c !== name));
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== name));
    }
  };

  const updateCategory = async (oldName: string, newName: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`);
      const cats = await res.json();
      const found = cats.find((c: any) => c.name === oldName);
      if (found) await fetchWithAuth(`${API_BASE}/categories/${found.id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    setAccessToken(null);
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider value={{
      establishment, setEstablishment,
      products, setProducts,
      categories, setCategories,
      tables, setTables,
      orders, setOrders,
      waiters, setWaiters,
      feedbacks, addFeedback,
      currentUser, setCurrentUser, accessToken, setAccessToken, logout,
      deviceTableId, setDeviceTableId,
      addOrder,
      updateTableStatus,
      updateOrderStatus,
      updateOrderItemStatus,
      updateProduct,
      deleteProduct,
      addProduct,
      toggleProductHighlight,
      addWaiter,
      deleteWaiter,
      addCategory,
      deleteCategory,
      updateCategory,
      openTable,
      fetchOrdersByTable
      , saveEstablishment
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
