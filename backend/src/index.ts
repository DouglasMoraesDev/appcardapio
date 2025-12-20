import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import usersRouter from './routes/users';
import tablesRouter from './routes/tables';
import ordersRouter from './routes/orders';
import feedbacksRouter from './routes/feedbacks';
import establishmentRouter from './routes/establishment';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const allowedOrigins = FRONTEND_ORIGIN ? FRONTEND_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({ origin: (origin, cb) => {
	// allow non-browser requests (like curl, undefined origin)
	if (!origin) return cb(null, true);
	if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
	return cb(new Error('Not allowed by CORS'));
}, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/feedbacks', feedbacksRouter);
app.use('/api/establishment', establishmentRouter);
app.use('/api/auth', authRouter);

app.get('/', (req, res) => res.send({ ok: true, api: '/api' }));

app.listen(port, () => console.log(`Server running on port ${port}`));
