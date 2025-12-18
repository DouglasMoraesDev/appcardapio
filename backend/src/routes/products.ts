import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const products = await prisma.product.findMany({ include: { category: true } });
  res.json(products);
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { name, description, price, image, categoryId, isHighlight } = req.body;
  const product = await prisma.product.create({ data: { name, description, price: Number(price || 0), image, categoryId: categoryId || null, isHighlight: !!isHighlight } });
  res.json(product);
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body;
  const updated = await prisma.product.update({ where: { id }, data });
  res.json(updated);
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
