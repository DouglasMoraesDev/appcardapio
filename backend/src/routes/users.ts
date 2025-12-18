import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { name, username, password, role, pin } = req.body;
  const hashed = password ? await bcrypt.hash(password, 8) : undefined;
  const user = await prisma.user.create({ data: { name, username, password: hashed, role, pin } });
  res.json(user);
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
