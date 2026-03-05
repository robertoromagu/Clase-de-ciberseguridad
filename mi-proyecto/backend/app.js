require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const purchaseRoutes = require('./routes/purchases');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Sesiones
app.use(session({
  store: new SQLiteStore({ db: 'database.db', dir: '.' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 día
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
  });
  
  // En producción deberías tener:
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // si usas reverse proxy
    session.cookie.secure = true;     // solo HTTPS
    session.cookie.httpOnly = true;
    session.cookie.sameSite = 'strict';
  }

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);

// Servir páginas HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../views/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../views/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../views/register.html')));
app.get('/sell', (req, res) => res.sendFile(path.join(__dirname, '../views/sell.html')));
app.get('/my-products', (req, res) => res.sendFile(path.join(__dirname, '../views/my-products.html')));
app.get('/my-purchases', (req, res) => res.sendFile(path.join(__dirname, '../views/my-purchases.html')));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

const db = require('./db/sqlite');

// Inicializar base de datos al arrancar
db.initDatabase().catch(console.error);

const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

const purchaseRoutes = require('./routes/purchases');
app.use('/api/purchases', purchaseRoutes);
