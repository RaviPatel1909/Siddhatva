import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../lib/http';
import { wishlistBody } from '../schemas';
import { productInclude, toApiProduct } from '../lib/mappers';
import { WishlistResponse } from '../contract';

export const wishlistRouter = Router();

async function demoUserId(): Promise<string> {
  const user = await prisma.user.findFirst();
  if (!user) throw new HttpError(500, 'No user seeded');
  return user.id;
}

async function currentWishlist(userId: string): Promise<WishlistResponse> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: productInclude } },
  });
  return { items: items.map((w) => toApiProduct(w.product)) };
}

// GET /wishlist — the customer's saved products.
wishlistRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await currentWishlist(await demoUserId()));
  })
);

// POST /wishlist { productId } — save a product; returns the updated wishlist.
wishlistRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId } = wishlistBody.parse(req.body);
    const userId = await demoUserId();
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
    const userId = await demoUserId();
    await prisma.wishlistItem.deleteMany({ where: { userId, productId: req.params.productId } });
    res.json(await currentWishlist(userId));
  })
);
