import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { wishlistBody } from '../schemas';
import { productInclude, toApiProduct } from '../lib/mappers';
import { WishlistResponse } from '../contract';

export const wishlistRouter = Router();

// Wishlist is always scoped to the authenticated user.
wishlistRouter.use(requireAuth);

async function currentWishlist(userId: string): Promise<WishlistResponse> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: productInclude } },
  });
  return { items: items.map((w) => toApiProduct(w.product)) };
}

// GET /wishlist — the authenticated user's saved products.
wishlistRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await currentWishlist(req.user!.id));
  })
);

// POST /wishlist { productId } — save a product; returns the updated wishlist.
wishlistRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId } = wishlistBody.parse(req.body);
    const userId = req.user!.id;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new HttpError(404, 'Product not found');
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    res.status(201).json(await currentWishlist(userId));
  })
);

// DELETE /wishlist/:productId — remove a product; returns the updated wishlist.
wishlistRouter.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    await prisma.wishlistItem.deleteMany({ where: { userId, productId: req.params.productId } });
    res.json(await currentWishlist(userId));
  })
);
