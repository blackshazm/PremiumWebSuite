import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// Listar produtos (público, mas com auth opcional para personalização)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 12, 
    category, 
    search, 
    sortBy = 'createdAt',
    sortOrder = 'desc',
    minPrice,
    maxPrice
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  
  // Construir filtros
  const where: any = {
    isActive: true,
  };

  if (category) {
    where.categoryId = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { ingredients: { has: search as string } },
    ];
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  // Buscar produtos
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy as string]: sortOrder },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        reviews: {
          select: {
            rating: true,
          }
        }
      }
    }),
    prisma.product.count({ where })
  ]);

  // Calcular média de avaliações
  const productsWithRating = products.map(product => {
    const ratings = product.reviews.map(r => r.rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;
    
    return {
      ...product,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: ratings.length,
      reviews: undefined, // Remove reviews da resposta
    };
  });

  res.json({
    success: true,
    data: {
      products: productsWithRating,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Obter produto por ID ou slug
router.get('/:identifier', optionalAuth, asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  
  // Tentar buscar por ID primeiro, depois por slug
  const where = identifier.length === 25 // CUID length
    ? { id: identifier }
    : { slug: identifier };

  const product = await prisma.product.findFirst({
    where: {
      ...where,
      isActive: true,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      images: {
        orderBy: { sortOrder: 'asc' }
      },
      reviews: {
        where: { isApproved: true },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!product) {
    throw createError('Produto não encontrado', 404);
  }

  // Calcular estatísticas de avaliações
  const ratings = product.reviews.map(r => r.rating);
  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
    : 0;

  const ratingDistribution = {
    5: ratings.filter(r => r === 5).length,
    4: ratings.filter(r => r === 4).length,
    3: ratings.filter(r => r === 3).length,
    2: ratings.filter(r => r === 2).length,
    1: ratings.filter(r => r === 1).length,
  };

  // Buscar produtos relacionados
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      isActive: true,
    },
    take: 4,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: {
        take: 1,
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  const productWithStats = {
    ...product,
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount: ratings.length,
    ratingDistribution,
    relatedProducts,
  };

  res.json({
    success: true,
    data: { product: productWithStats }
  });
}));

// Listar categorias
router.get('/categories/list', asyncHandler(async (req, res) => {
  const categories = await prisma.productCategory.findMany({
    where: { 
      isActive: true,
      parentId: null, // Apenas categorias principais
    },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      },
      _count: {
        select: {
          products: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });

  res.json({
    success: true,
    data: { categories }
  });
}));

// Buscar produtos (endpoint específico para busca)
router.get('/search/query', optionalAuth, asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || (q as string).length < 2) {
    return res.json({
      success: true,
      data: { products: [] }
    });
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { ingredients: { has: q as string } },
      ]
    },
    take: Number(limit),
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: {
        take: 1,
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  res.json({
    success: true,
    data: { products }
  });
}));

export default router;
