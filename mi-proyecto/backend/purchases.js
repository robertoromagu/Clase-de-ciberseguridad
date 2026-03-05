const { requireLogin } = require('../middleware/auth');

router.post('/checkout', requireLogin, async (req, res) => {  });

// src/routes/purchases.js
const express = require('express');
const router = express.Router();

const db = require('../db/sqlite');
const { requireLogin } = require('../middleware/auth');

// ────────────────────────────────────────────────
// POST /api/purchases/checkout
// Finaliza la compra: registra cada ítem en purchases y limpia carrito
// ────────────────────────────────────────────────
router.post('/checkout', requireLogin, async (req, res) => {
  try {
    // 1. Verificar que hay carrito y no está vacío
    if (!req.session.cart || req.session.cart.length === 0) {
      return res.status(400).json({
        error: 'El carrito está vacío',
        message: 'No hay productos para comprar'
      });
    }

    const userId = req.session.user.id;
    const productIds = req.session.cart; // array de IDs

    // 2. Obtener información actual de los productos (por si cambiaron precios, etc.)
    //    Usamos la misma helper que ya tienes en cart.js o la creamos aquí
    const cartItems = await getCartProducts(productIds);

    if (cartItems.length !== productIds.length) {
      return res.status(400).json({
        error: 'Algunos productos ya no están disponibles'
      });
    }

    // 3. Registrar cada compra en la tabla purchases
    const purchasePromises = cartItems.map(async (product) => {
      return db.createPurchase(userId, product.id);
    });

    await Promise.all(purchasePromises);

    // 4. Limpiar el carrito
    req.session.cart = [];

    // 5. Respuesta exitosa
    const total = cartItems
      .reduce((sum, item) => sum + parseFloat(item.price), 0)
      .toFixed(2);

    res.json({
      success: true,
      message: 'Compra realizada con éxito',
      purchasedItems: cartItems.length,
      totalAmount: total,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error en checkout:', err);
    res.status(500).json({
      error: 'Error al procesar la compra',
      message: err.message || 'Error interno del servidor'
    });
  }
});

// ────────────────────────────────────────────────
// Helper: obtener productos del carrito (similar al de cart.js)
// ────────────────────────────────────────────────
async function getCartProducts(cartIds) {
  if (!cartIds || cartIds.length === 0) return [];

  const placeholders = cartIds.map(() => '?').join(',');
  const query = `
    SELECT id, name, price
    FROM products
    WHERE id IN (${placeholders})
  `;

  const rows = await db.query(query, cartIds);

  // Mantener el orden original
  return cartIds
    .map(id => rows.find(r => r.id === parseInt(id)))
    .filter(Boolean)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price).toFixed(2)
    }));
}

module.exports = router;

// GET /api/purchases/my - Listado de compras del usuario actual
router.get('/my', requireLogin, async (req, res) => {
    try {
      const purchases = await db.getPurchasesByUser(req.session.user.id);
  
      const safePurchases = purchases.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price).toFixed(2),
        seller: p.seller,
        purchased_at: p.purchased_at
      }));
  
      res.json({
        purchases: safePurchases,
        count: safePurchases.length
      });
    } catch (err) {
      console.error('Error al obtener compras del usuario:', err);
      res.status(500).json({ error: 'Error al cargar el historial de compras' });
    }
  });