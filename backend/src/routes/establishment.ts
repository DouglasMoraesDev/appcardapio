import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const e = await prisma.establishment.findFirst({ include: { theme: true, adminUser: true } });
  res.json(e);
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { name, address, cep, cpfCnpj, logo, serviceCharge, theme } = req.body;
  const themeData = theme || { background: '#06120c', card: '#0d1f15', text: '#fefce8', primary: '#d18a59', accent: '#c17a49' };
  const createdTheme = await prisma.theme.create({ data: { ...themeData } }).catch(() => null);
  const e = await prisma.establishment.create({ data: { name, address, cep, cpfCnpj, logo, serviceCharge: Number(serviceCharge || 10), themeId: createdTheme?.id } });
  res.json(e);
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body;
  const updated = await prisma.establishment.update({ where: { id }, data });
  res.json(updated);
});

// Convenience: update the first establishment (no id) - useful for frontend sync in dev
router.put('/', async (req, res) => {
  const data = req.body || {};
  const themePayload = data.theme;
  // remove theme from payload to avoid Prisma nested errors
  if (themePayload) delete data.theme;
  // whitelist allowed establishment fields to avoid nested objects from frontend
  const allowedFields = ['name', 'address', 'cep', 'cpfCnpj', 'logo', 'serviceCharge', 'adminUserId'];
  const payload: any = {};
  for (const k of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) payload[k] = data[k];
  }
  let e = await prisma.establishment.findFirst();
  if (e) {
    // update establishment fields (without theme)
    const updated = await prisma.establishment.update({ where: { id: e.id }, data: payload });
    // handle theme separately
      if (themePayload) {
        if (e.themeId) {
          await prisma.theme.update({ where: { id: e.themeId }, data: themePayload }).catch(() => null);
        } else {
          const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
          if (t) await prisma.establishment.update({ where: { id: e.id }, data: { themeId: t.id } }).catch(() => null);
        }
      }
    const fresh = await prisma.establishment.findUnique({ where: { id: e.id }, include: { theme: true } });
    return res.json(fresh);
  }
  // create new theme if provided
  let themeId = null as number | null;
  if (themePayload) {
    const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
    themeId = t?.id ?? null;
  }
  const createPayload: any = {};
  for (const k of ['name', 'address', 'cep', 'cpfCnpj', 'logo', 'serviceCharge', 'adminUserId']) {
    if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) createPayload[k] = data[k];
  }
  createPayload.themeId = themeId;
  const created = await prisma.establishment.create({ data: { ...createPayload } });
  res.json(created);
});

export default router;
