import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Endpoint para relatório de mesas fechadas do dia
router.get('/closed-today', authenticate, authorize(['admin']), async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  // Busca pedidos com status PAID ou DELIVERED do dia
  const closedOrders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'DELIVERED'] },
      timestamp: { gte: startOfDay, lte: endOfDay }
    },
    include: { items: true, table: true }
  });
  // Agrupa por mesa
  const report = closedOrders.reduce((acc, order) => {
    const tableId = order.tableId;
    if (!acc[tableId]) {
      acc[tableId] = {
        tableNumber: order.table.number,
        total: 0,
        orders: [],
      };
    }
    acc[tableId].total += order.total;
    acc[tableId].orders.push(order);
    return acc;
  }, {});
  res.json(Object.values(report));
});

router.get('/', async (req, res) => {
  // Se for admin ou garçom, retorna todos os pedidos
  const token = req.headers.authorization?.split(' ')[1];
  let user = null;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
      user = decoded;
    } catch {}
  }
  if (user && (user.role === 'admin' || user.role === 'waiter')) {
    const orders = await prisma.order.findMany({ include: { items: true } });
    return res.json(orders);
  }
  // Se for cliente, permite buscar pedidos da mesa
  const tableId = req.query.tableId;
  if (tableId) {
    const orders = await prisma.order.findMany({ where: { tableId: Number(tableId) }, include: { items: true } });
    return res.json(orders);
  }
  return res.status(403).json({ error: 'Acesso negado' });
});

router.post('/', async (req, res) => {
  const { tableId, items, status, total, paymentMethod } = req.body;
  const order = await prisma.order.create({
    data: {
      tableId: Number(tableId),
      status: status || 'PENDING',
      total: Number(total) || 0,
      paymentMethod: paymentMethod || null,
      items: { create: items.map((it: any) => ({ productId: it.productId ? Number(it.productId) : undefined, quantity: Number(it.quantity), name: it.name, price: Number(it.price), status: it.status || 'PENDING', observation: it.observation || null })) }
    },
    include: { items: true }
  });
  res.json(order);
});

router.put('/:id/status', authenticate, authorize(['admin','waiter']), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const updated = await prisma.order.update({ where: { id }, data: { status } });
  res.json(updated);
});

router.put('/:id/items/:itemId/status', authenticate, authorize(['admin','waiter']), async (req, res) => {
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { status } = req.body;
  const updated = await prisma.orderItem.update({ where: { id: itemId }, data: { status } });
  res.json(updated);
});

export default router;
