// src/routes/products.js
const express = require('express');
const router = express.Router();

const db = require('../db/sqlite');
const { requireLogin, requireProductOwnership } = require('../middleware/auth');

// ────────────────────────────────────────────────
// GET /api/products
// Catálogo público - cualquiera puede verlo
// ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const products = await db.getAllProducts();

    // Formateamos la respuesta para no exponer datos sensibles
    const safeProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price).toFixed(2),
      created_at: p.created_at,
      seller: p.seller || 'Anónimo'   // email del vendedor (o username si lo cambias)
    }));

    res.json(safeProducts);
  } catch (err) {
    console.error('Error al obtener catálogo:', err);
    res.status(500).json({ error: 'Error al cargar los productos' });
  }
});

// ────────────────────────────────────────────────
// GET /api/products/my
// Solo productos del usuario autenticado
// ────────────────────────────────────────────────
router.get('/my', requireLogin, async (req, res) => {
  try {
    const products = await db.getProductsByUser(req.session.user.id);

    const safeProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price).toFixed(2),
      created_at: p.created_at
    }));

    res.json(safeProducts);
  } catch (err) {
    console.error('Error al obtener mis productos:', err);
    res.status(500).json({ error: 'Error al cargar tus productos' });
  }
});

// ────────────────────────────────────────────────
// POST /api/products
// Crear un nuevo producto (solo usuarios logueados)
// ────────────────────────────────────────────────
router.post('/', requireLogin, async (req, res) => {
  const { name, description, price } = req.body;

  // Validaciones
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
  }

  if (!price || isNaN(price) || Number(price) <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número mayor que 0' });
  }

  // Límites razonables para evitar abusos
  if (name.length > 100) {
    return res.status(400).json({ error: 'El nombre es demasiado largo (máx. 100 caracteres)' });
  }

  if (description && description.length > 1000) {
    return res.status(400).json({ error: 'La descripción es demasiado larga (máx. 1000 caracteres)' });
  }

  try {
    const newProduct = await db.createProduct(
      req.session.user.id,
      name.trim(),
      description ? description.trim() : null,
      Number(price)
    );

    res.status(201).json({
      message: 'Producto creado correctamente',
      product: {
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        price: Number(newProduct.price).toFixed(2),
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// ────────────────────────────────────────────────
// GET /api/products/:id
// Detalle de un producto (público)
// ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.getProductById(id);

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const seller = await db.getUserById(product.user_id);

    res.json({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price).toFixed(2),
      created_at: product.created_at,
      seller: seller ? seller.email : 'Desconocido'
    });
  } catch (err) {
    console.error('Error al obtener detalle del producto:', err);
    res.status(500).json({ error: 'Error al cargar el producto' });
  }
});

module.exports = router;