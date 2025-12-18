import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize(['admin','waiter']), async (req, res) => {
  const orders = await prisma.order.findMany({ include: { items: true } });
  res.json(orders);
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
