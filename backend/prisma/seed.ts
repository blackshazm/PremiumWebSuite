import { PrismaClient } from '@prisma/client';
import { hashPassword, generateReferralCode, generateSlug } from '../src/utils/helpers';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar planos de assinatura
  console.log('📋 Criando planos de assinatura...');
  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'basic-plan' },
    update: {},
    create: {
      id: 'basic-plan',
      name: 'Plano Básico',
      description: 'Acesso completo aos produtos naturais com desconto especial',
      price: 49.90,
      billingCycle: 'MONTHLY',
      benefits: [
        'Desconto de 15% em todos os produtos',
        'Frete grátis em compras acima de R$ 100',
        'Acesso ao sistema de indicações',
        'Suporte prioritário'
      ],
      isActive: true,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'premium-plan' },
    update: {},
    create: {
      id: 'premium-plan',
      name: 'Plano Premium',
      description: 'Máximo desconto e benefícios exclusivos',
      price: 89.90,
      billingCycle: 'MONTHLY',
      benefits: [
        'Desconto de 25% em todos os produtos',
        'Frete grátis em todas as compras',
        'Comissões maiores no sistema de indicações',
        'Produtos exclusivos',
        'Suporte VIP'
      ],
      isActive: true,
    },
  });

  // Criar categorias de produtos
  console.log('🏷️ Criando categorias de produtos...');
  const categories = [
    {
      name: 'Emagrecimento',
      slug: 'emagrecimento',
      description: 'Produtos naturais para auxiliar na perda de peso',
    },
    {
      name: 'Energia e Disposição',
      slug: 'energia-disposicao',
      description: 'Suplementos para aumentar energia e disposição',
    },
    {
      name: 'Sono e Relaxamento',
      slug: 'sono-relaxamento',
      description: 'Produtos para melhorar a qualidade do sono',
    },
    {
      name: 'Imunidade',
      slug: 'imunidade',
      description: 'Fortalecimento do sistema imunológico',
    },
    {
      name: 'Beleza e Pele',
      slug: 'beleza-pele',
      description: 'Cuidados naturais para pele e cabelo',
    },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const created = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    createdCategories.push(created);
  }

  // Criar produtos
  console.log('🛍️ Criando produtos...');
  const products = [
    {
      name: 'Termogênico Natural Premium',
      slug: 'termogenico-natural-premium',
      description: 'Acelere seu metabolismo de forma natural com nossa fórmula exclusiva de termogênico. Contém cafeína natural, chá verde e pimenta caiena para máxima eficácia.',
      shortDescription: 'Termogênico natural para acelerar o metabolismo',
      price: 89.90,
      compareAtPrice: 129.90,
      stock: 100,
      categoryId: createdCategories.find(c => c.slug === 'emagrecimento')!.id,
      ingredients: ['Cafeína Natural', 'Chá Verde', 'Pimenta Caiena', 'Guaraná', 'Gengibre'],
      benefits: [
        'Acelera o metabolismo',
        'Aumenta a queima de gordura',
        'Fornece energia natural',
        'Reduz o apetite'
      ],
      usage: 'Tomar 2 cápsulas pela manhã, 30 minutos antes do café da manhã.',
      warnings: 'Não recomendado para gestantes, lactantes e crianças. Contém cafeína.',
      isFeatured: true,
    },
    {
      name: 'Complexo Vitamínico Energia',
      slug: 'complexo-vitaminico-energia',
      description: 'Fórmula completa com vitaminas do complexo B, vitamina C e minerais essenciais para combater o cansaço e aumentar a disposição.',
      shortDescription: 'Vitaminas para energia e disposição',
      price: 59.90,
      compareAtPrice: 79.90,
      stock: 150,
      categoryId: createdCategories.find(c => c.slug === 'energia-disposicao')!.id,
      ingredients: ['Vitamina B12', 'Vitamina C', 'Ferro', 'Magnésio', 'Zinco'],
      benefits: [
        'Combate o cansaço',
        'Aumenta a disposição',
        'Fortalece o sistema imunológico',
        'Melhora o humor'
      ],
      usage: 'Tomar 1 cápsula pela manhã com água.',
      warnings: 'Manter fora do alcance de crianças.',
      isFeatured: true,
    },
    {
      name: 'Melatonina Natural',
      slug: 'melatonina-natural',
      description: 'Melatonina de origem natural para regular o ciclo do sono e proporcionar noites mais tranquilas e reparadoras.',
      shortDescription: 'Regulador natural do sono',
      price: 39.90,
      compareAtPrice: 59.90,
      stock: 200,
      categoryId: createdCategories.find(c => c.slug === 'sono-relaxamento')!.id,
      ingredients: ['Melatonina', 'Camomila', 'Valeriana', 'Passiflora'],
      benefits: [
        'Regula o ciclo do sono',
        'Melhora a qualidade do sono',
        'Reduz a ansiedade',
        'Promove relaxamento'
      ],
      usage: 'Tomar 1 cápsula 30 minutos antes de dormir.',
      warnings: 'Pode causar sonolência. Não dirigir após o uso.',
      isFeatured: false,
    },
    {
      name: 'Imuno Forte',
      slug: 'imuno-forte',
      description: 'Poderoso complexo de vitaminas e minerais para fortalecer o sistema imunológico e proteger contra gripes e resfriados.',
      shortDescription: 'Fortalecedor do sistema imunológico',
      price: 69.90,
      compareAtPrice: 89.90,
      stock: 120,
      categoryId: createdCategories.find(c => c.slug === 'imunidade')!.id,
      ingredients: ['Vitamina C', 'Vitamina D', 'Zinco', 'Própolis', 'Equinácea'],
      benefits: [
        'Fortalece a imunidade',
        'Previne gripes e resfriados',
        'Acelera a recuperação',
        'Antioxidante natural'
      ],
      usage: 'Tomar 2 cápsulas ao dia, preferencialmente com as refeições.',
      warnings: 'Consulte um médico antes de usar se estiver grávida ou amamentando.',
      isFeatured: true,
    },
    {
      name: 'Colágeno Hidrolisado Premium',
      slug: 'colageno-hidrolisado-premium',
      description: 'Colágeno hidrolisado de alta absorção com vitamina C e biotina para pele, cabelos e unhas mais saudáveis.',
      shortDescription: 'Colágeno para beleza e saúde da pele',
      price: 79.90,
      compareAtPrice: 99.90,
      stock: 80,
      categoryId: createdCategories.find(c => c.slug === 'beleza-pele')!.id,
      ingredients: ['Colágeno Hidrolisado', 'Vitamina C', 'Biotina', 'Ácido Hialurônico'],
      benefits: [
        'Melhora a elasticidade da pele',
        'Fortalece cabelos e unhas',
        'Reduz rugas e linhas de expressão',
        'Hidrata a pele'
      ],
      usage: 'Tomar 2 cápsulas ao dia com água.',
      warnings: 'Produto natural, pode apresentar variação de cor.',
      isFeatured: false,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  // Criar cupons de exemplo
  console.log('🎫 Criando cupons...');
  await prisma.coupon.upsert({
    where: { code: 'BEMVINDO10' },
    update: {},
    create: {
      code: 'BEMVINDO10',
      name: 'Desconto de Boas-vindas',
      description: 'Desconto especial para novos clientes',
      type: 'PERCENTAGE',
      value: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      usageLimit: 1000,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FRETEGRATIS' },
    update: {},
    create: {
      code: 'FRETEGRATIS',
      name: 'Frete Grátis',
      description: 'Frete grátis em compras acima de R$ 100',
      type: 'FIXED_AMOUNT',
      value: 15.90,
      minimumAmount: 100,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      isActive: true,
    },
  });

  // Criar usuário admin de exemplo
  console.log('👤 Criando usuário administrador...');
  const adminPassword = await hashPassword('Admin123!');
  const adminReferralCode = generateReferralCode();

  await prisma.user.upsert({
    where: { email: 'admin@bioclubplus.com' },
    update: {},
    create: {
      email: 'admin@bioclubplus.com',
      cpf: '00000000000',
      firstName: 'Admin',
      lastName: 'BioClub+',
      password: adminPassword,
      referralCode: adminReferralCode,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('📧 Admin criado: admin@bioclubplus.com / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
