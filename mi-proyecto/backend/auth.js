// src/middleware/auth.js

/**
 * Middleware: Requiere que el usuario esté autenticado
 * Si no hay sesión → responde 401 y no continúa
 */
 function requireLogin(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Debes iniciar sesión para realizar esta acción'
    });
  }

  // Opcional: puedes refrescar datos del usuario desde la BD si lo necesitas
  // pero para rendimiento en hackathon, usamos lo que hay en sesión

  next();
}

/**
 * Middleware: Verifica que el producto pertenece al usuario logueado
 * Útil para editar/eliminar productos propios
 * 
 * Espera que el productId venga en:
 * - req.params.id     (ruta tipo /products/:id)
 * - req.body.productId (en POST/PUT)
 */
async function requireProductOwnership(req, res, next) {
  const productId = req.params.id || req.body.productId || req.body.id;

  if (!productId) {
    return res.status(400).json({ error: 'ID de producto requerido' });
  }

  try {
    const db = require('../db/sqlite');
    const product = await db.getProductById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (product.user_id !== req.session.user.id) {
      return res.status(403).json({
        error: 'No autorizado',
        message: 'Este producto no te pertenece'
      });
    }

    // Opcional: puedes adjuntar el producto al request para no volver a consultarlo
    req.product = product;

    next();
  } catch (err) {
    console.error('Error verificando ownership:', err);
    res.status(500).json({ error: 'Error interno al verificar autorización' });
  }
}

/**
 * Middleware: Verifica que la compra pertenece al usuario logueado
 * (útil si más adelante permites cancelar o ver detalle de compra propia)
 */
async function requirePurchaseOwnership(req, res, next) {
  const purchaseId = req.params.id || req.body.purchaseId;

  if (!purchaseId) {
    return res.status(400).json({ error: 'ID de compra requerido' });
  }

  try {
    const db = require('../db/sqlite');
    
    // Suponiendo que añadas una función getPurchaseById en sqlite.js
    // (si no la tienes, puedes implementarla o consultar directamente aquí)
    const purchase = await db.get('SELECT buyer_id FROM purchases WHERE id = ?', [purchaseId]);

    if (!purchase) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    if (purchase.buyer_id !== req.session.user.id) {
      return res.status(403).json({
        error: 'No autorizado',
        message: 'Esta compra no te pertenece'
      });
    }

    next();
  } catch (err) {
    console.error('Error verificando ownership de compra:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// Exportamos los middlewares más útiles para este proyecto
module.exports = {
  requireLogin,
  requireProductOwnership,
  // requirePurchaseOwnership   ← descomenta si lo necesitas más adelante
};