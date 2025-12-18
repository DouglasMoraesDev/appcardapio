import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const tables = await prisma.table.findMany();
  res.json(tables);
});

router.post('/', async (req, res) => {
  const { number, status } = req.body;
  const t = await prisma.table.create({ data: { number: Number(number), status: status || 'AVAILABLE' } });
  res.json(t);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body;
  const updated = await prisma.table.update({ where: { id }, data });
  res.json(updated);
});

export default router;
