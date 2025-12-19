import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const tables = await prisma.table.findMany();
  res.json(tables);
});

router.post('/', async (req, res) => {
  const { number, status } = req.body;
  try {
    const t = await prisma.table.create({ data: { number: Number(number), status: status || 'AVAILABLE' } });
    res.json(t);
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Erro de chave única (mesa já existe)
      res.status(409).json({ error: 'Mesa com esse número já existe.' });
    } else {
      res.status(500).json({ error: 'Erro ao criar mesa', details: error.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body;
  const updated = await prisma.table.update({ where: { id }, data });
  res.json(updated);
});

// Atualiza o status de uma mesa
router.post('/status', async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: 'id e status são obrigatórios' });
  }
  try {
    const updated = await prisma.table.update({
      where: { id: Number(id) },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status da mesa', details: error });
  }
});

export default router;
