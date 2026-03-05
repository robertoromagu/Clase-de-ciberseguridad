// src/db/sqlite.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta absoluta al archivo de la base de datos
const dbPath = path.join(__dirname, '../../database.db');

// Conexión (se crea el archivo si no existe)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite →', dbPath);
  }
});

// Promisificar métodos comunes para usar async/await
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Inicializar tablas (se ejecuta una sola vez al arrancar)
async function initDatabase() {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL CHECK(price > 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buyer_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('Tablas verificadas/creadas correctamente');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
  }
}

// ────────────────────────────────────────────────
// Funciones helper (las usarás en los routers)
// ────────────────────────────────────────────────

async function createUser(email, hashedPassword) {
  const result = await run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, hashedPassword]
  );
  return result.lastID;
}

async function getUserByEmail(email) {
  return get('SELECT * FROM users WHERE email = ?', [email]);
}

async function getUserById(id) {
  return get('SELECT id, email, created_at FROM users WHERE id = ?', [id]);
}

async function createProduct(userId, name, description, price) {
  const result = await run(
    'INSERT INTO products (user_id, name, description, price) VALUES (?, ?, ?, ?)',
    [userId, name, description || null, price]
  );
  return { id: result.lastID, user_id: userId, name, description, price };
}

async function getAllProducts() {
  return query(`
    SELECT p.id, p.name, p.description, p.price, p.created_at, u.email AS seller
    FROM products p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `);
}

async function getProductsByUser(userId) {
  return query(
    'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

async function getProductById(productId) {
  return get('SELECT * FROM products WHERE id = ?', [productId]);
}

async function createPurchase(buyerId, productId) {
  const result = await run(
    'INSERT INTO purchases (buyer_id, product_id) VALUES (?, ?)',
    [buyerId, productId]
  );
  return result.lastID;
}

async function getPurchasesByUser(userId) {
  return query(`
    SELECT pu.id, pu.purchased_at, p.id AS product_id, p.name, p.price, u.email AS seller
    FROM purchases pu
    JOIN products p ON pu.product_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE pu.buyer_id = ?
    ORDER BY pu.purchased_at DESC
  `, [userId]);
}

// Exportamos todo lo necesario
module.exports = {
  initDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  createProduct,
  getAllProducts,
  getProductsByUser,
  getProductById,
  createPurchase,
  getPurchasesByUser,
  // Si algún día necesitas cerrar la conexión manualmente:
  close: () => db.close()
};