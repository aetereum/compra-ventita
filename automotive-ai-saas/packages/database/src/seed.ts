import { createDB } from './index';
import { schema } from './schema';
import { v4 as uuidv4 } from 'crypto';

interface SeedData {
  organizations: typeof schema.organizations.$inferInsert[];
  users: typeof schema.users.$inferInsert[];
  organizationMembers: typeof schema.organizationMembers.$inferInsert[];
}

export async function seed(db: ReturnType<typeof createDB>) {
  console.log('🌱 Starting database seed...');

  const orgId = uuidv4();
  const userId = uuidv4();

  const organizations = [{
    id: orgId,
    name: 'Demo Automotive',
    slug: 'demo-automotive',
    settings: {
      timezone: 'America/Santiago',
      currency: 'CLP',
      language: 'es',
      features: {
        radar: true,
        aiChat: true,
        videoGeneration: true,
        academy: true,
        marketingAutomation: true,
        whatsapp: true,
        instagram: true,
        multiLocation: false,
      },
      integrations: {},
    },
    plan: 'PRO' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];

  const users = [{
    id: userId,
    email: 'admin@demo.com',
    name: 'Admin Demo',
    passwordHash: '$2b$10$demo_hash_placeholder',
    emailVerified: true,
    status: 'ACTIVE' as const,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];

  const organizationMembers = [{
    userId,
    organizationId: orgId,
    role: 'OWNER' as const,
    permissions: ['*'],
    joinedAt: new Date().toISOString(),
  }];

  console.log('Inserting organizations...');
  await db.insert(schema.organizations).values(organizations).onConflictDoNothing();

  console.log('Inserting users...');
  await db.insert(schema.users).values(users).onConflictDoNothing();

  console.log('Inserting organization members...');
  await db.insert(schema.organizationMembers).values(organizationMembers).onConflictDoNothing();

  // Create default radar sources
  const radarSources = [
    {
      id: uuidv4(),
      organizationId: orgId,
      name: 'Car Deals Search',
      type: 'CAR_DEALS_SEARCH' as const,
      adapter: 'car-deals-search-mcp',
      config: { apiKey: '', baseUrl: 'https://api.car-deals.example.com' },
      enabled: true,
      healthStatus: 'UNKNOWN' as const,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        currentUsage: { minute: 0, hour: 0, day: 0 },
        resetAt: { minute: '', hour: '', day: '' },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      organizationId: orgId,
      name: 'Manual Entry',
      type: 'MANUAL' as const,
      adapter: 'manual',
      config: {},
      enabled: true,
      healthStatus: 'HEALTHY' as const,
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
        requestsPerDay: 100000,
        currentUsage: { minute: 0, hour: 0, day: 0 },
        resetAt: { minute: '', hour: '', day: '' },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  console.log('Inserting radar sources...');
  await db.insert(schema.radarSources).values(radarSources).onConflictDoNothing();

  // Create default radar rule
  const radarRules = [{
    id: uuidv4(),
    organizationId: orgId,
    name: 'Oportunidades SUV',
    description: 'Buscar SUVs con buen margen',
    filters: {
      makes: [],
      models: [],
      yearMin: 2018,
      yearMax: 2024,
      priceMin: 5000000,
      priceMax: 30000000,
      mileageMax: 100000,
      fuels: ['gasoline', 'hybrid'],
      transmissions: ['automatic'],
      minMargin: 15,
      minDealScore: 75,
    },
    notifications: {
      email: true,
      push: true,
      thresholdDealScore: 80,
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];

  console.log('Inserting radar rules...');
  await db.insert(schema.radarRules).values(radarRules).onConflictDoNothing();

  // Create sample vehicles
  const sampleVehicles = [
    {
      id: uuidv4(),
      organizationId: orgId,
      vin: '3N1AB7AP5JY123456',
      make: 'Nissan',
      model: 'Kicks',
      trim: 'SR',
      year: 2022,
      mileage: 25000,
      price: 14500000,
      currency: 'CLP',
      status: 'IN_INVENTORY' as const,
      source: 'CAR_DEALS_SEARCH' as const,
      sourceListingId: 'cds-001',
      sourceUrl: 'https://example.com/listing/001',
      location: { country: 'Chile', state: 'Región Metropolitana', city: 'Santiago', coordinates: { lat: -33.4489, lng: -70.6693 } },
      features: [
        { category: 'Safety', name: 'Frenos ABS', value: true },
        { category: 'Comfort', name: 'Aire acondicionado', value: true },
        { category: 'Tech', name: 'Pantalla táctil 8"', value: true },
        { category: 'Exterior', name: 'Color: Blanco Perlado', value: 'Blanco Perlado' },
      ],
      photos: [
        { id: uuidv4(), url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800', isPrimary: true, order: 0, uploadedAt: new Date().toISOString() },
      ],
      documents: [],
      priceHistory: [{ price: 14500000, date: new Date().toISOString(), source: 'CAR_DEALS_SEARCH' }],
      marketPrice: 16500000,
      estimatedMargin: 2000000,
      dealScore: 85,
      riskScore: 'LOW' as const,
      confidence: 0.92,
      listingData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      organizationId: orgId,
      vin: '4T1BF1FK0KU123456',
      make: 'Toyota',
      model: 'Corolla Cross',
      trim: 'XLE',
      year: 2023,
      mileage: 15000,
      price: 18900000,
      currency: 'CLP',
      status: 'IN_INVENTORY' as const,
      source: 'MANUAL' as const,
      location: { country: 'Chile', state: 'Región Metropolitana', city: 'Las Condes', coordinates: { lat: -33.4027, lng: -70.5537 } },
      features: [
        { category: 'Safety', name: 'Toyota Safety Sense', value: true },
        { category: 'Comfort', name: 'Asientos de cuero', value: true },
        { category: 'Tech', name: 'Carga inalámbrica', value: true },
        { category: 'Exterior', name: 'Color: Gris Magnetic', value: 'Gris Magnetic' },
      ],
      photos: [
        { id: uuidv4(), url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800', isPrimary: true, order: 0, uploadedAt: new Date().toISOString() },
      ],
      documents: [],
      priceHistory: [{ price: 18900000, date: new Date().toISOString(), source: 'MANUAL' }],
      marketPrice: 21500000,
      estimatedMargin: 2600000,
      dealScore: 78,
      riskScore: 'LOW' as const,
      confidence: 0.88,
      listingData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      organizationId: orgId,
      vin: '8AFBCKMA0JY123456',
      make: 'Hyundai',
      model: 'Tucson',
      trim: 'Limited',
      year: 2022,
      mileage: 35000,
      price: 16800000,
      currency: 'CLP',
      status: 'OPPORTUNITY' as const,
      source: 'CAR_DEALS_SEARCH' as const,
      sourceListingId: 'cds-002',
      sourceUrl: 'https://example.com/listing/002',
      location: { country: 'Chile', state: 'Valparaíso', city: 'Viña del Mar', coordinates: { lat: -33.0246, lng: -71.5518 } },
      features: [
        { category: 'Safety', name: 'SmartSense', value: true },
        { category: 'Comfort', name: 'Techo panorámico', value: true },
        { category: 'Tech', name: 'Tablero digital 12.3"', value: true },
        { category: 'Exterior', name: 'Color: Azul Phantom', value: 'Azul Phantom' },
      ],
      photos: [
        { id: uuidv4(), url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800', isPrimary: true, order: 0, uploadedAt: new Date().toISOString() },
      ],
      documents: [],
      priceHistory: [{ price: 16800000, date: new Date().toISOString(), source: 'CAR_DEALS_SEARCH' }],
      marketPrice: 19500000,
      estimatedMargin: 2700000,
      dealScore: 92,
      riskScore: 'LOW' as const,
      confidence: 0.95,
      listingData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  console.log('Inserting sample vehicles...');
  await db.insert(schema.vehicles).values(sampleVehicles).onConflictDoNothing();

  // Create sample lead
  const sampleLead = {
    id: uuidv4(),
    organizationId: orgId,
    source: 'RADAR' as const,
    sourceId: radarRules[0].id,
    vehicleId: sampleVehicles[2].id,
    status: 'NEW' as const,
    stage: 'LEAD' as const,
    score: 92,
    contact: {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      email: 'carlos.mendoza@email.com',
      phone: '+56912345678',
      whatsapp: '+56912345678',
      preferredContact: 'WHATSAPP' as const,
      bestTimeToContact: '18:00-20:00',
    },
    vehicleInterest: {
      make: 'Hyundai',
      model: 'Tucson',
      priceMax: 20000000,
    },
    qualification: {
      budget: { min: 15000000, max: 20000000 },
      timeline: '2 semanas',
      urgency: 'HIGH' as const,
    },
    activities: [],
    tags: ['radar', 'high-score'],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('Inserting sample lead...');
  await db.insert(schema.leads).values([sampleLead]).onConflictDoNothing();

  // Create sample campaign
  const sampleCampaign = {
    id: uuidv4(),
    organizationId: orgId,
    name: 'Lanzamiento Hyundai Tucson',
    description: 'Campaña de lanzamiento para el nuevo Tucson Limited',
    type: 'VEHICLE_LAUNCH' as const,
    status: 'DRAFT' as const,
    trigger: { type: 'VEHICLE_CREATED', config: { vehicleId: sampleVehicles[2].id } },
    audience: {
      segments: [{ name: 'Interesados en SUVs', filters: { vehicleInterest: { bodyType: 'SUV' } }, estimatedSize: 150 }],
    },
    content: {
      subject: '🚗 Nuevo Hyundai Tucson Limited - Oportunidad única',
      whatsappTemplate: 'Hola {{nombre}}, ¡Tenemos el Hyundai Tucson Limited que buscabas! 🎉',
      instagramCaption: '¡Llegó el Tucson Limited! 🔥 SWIPE para ver detalles #HyundaiTucson #SUV',
      cta: { text: 'Ver detalles', url: '/vehicles/{{vehicleId}}', type: 'BUTTON' as const },
      variables: { nombre: '{{contact.firstName}}' },
    },
    channels: ['EMAIL', 'WHATSAPP', 'INSTAGRAM'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('Inserting sample campaign...');
  await db.insert(schema.campaigns).values([sampleCampaign]).onConflictDoNothing();

  // Create sample course
  const sampleCourse = {
    id: uuidv4(),
    organizationId: orgId,
    title: 'Fundamentos de Compra-Venta de Vehículos',
    description: 'Aprende los fundamentos para comprar y vender vehículos de forma profesional.',
    shortDescription: 'Curso básico de compra-venta automotriz',
    instructorId: userId,
    category: 'Automotriz',
    level: 'BEGINNER' as const,
    language: 'es',
    price: 49900,
    currency: 'CLP',
    status: 'PUBLISHED' as const,
    modules: [
      {
        id: uuidv4(),
        courseId: '',
        title: 'Módulo 1: Introducción al Mercado Automotriz',
        description: 'Entender el mercado actual de vehículos',
        order: 1,
        lessons: [
          {
            id: uuidv4(),
            moduleId: '',
            title: 'Lección 1: Tipos de vehículos y segmentos',
            description: 'Clasificación de vehículos por segmento',
            order: 1,
            type: 'VIDEO' as const,
            content: { videoUrl: 'https://example.com/video1.mp4', videoDuration: 15 },
            durationMinutes: 15,
            isFree: true,
            isPublished: true,
            resources: [],
            quiz: {
              id: uuidv4(),
              title: 'Quiz: Segmentos de vehículos',
              questions: [
                {
                  id: uuidv4(),
                  type: 'SINGLE_CHOICE' as const,
                  question: '¿A qué segmento pertenece un SUV compacto?',
                  options: [
                    { id: uuidv4(), text: 'Segmento B', isCorrect: true },
                    { id: uuidv4(), text: 'Segmento C', isCorrect: false },
                    { id: uuidv4(), text: 'Segmento D', isCorrect: false },
                  ],
                  correctAnswer: 'Segmento B',
                  points: 10,
                  order: 1,
                },
              ],
              passingScore: 70,
              maxAttempts: 3,
              shuffleQuestions: true,
              showCorrectAnswers: true,
            },
            resources: [],
          },
        ],
        durationMinutes: 15,
        isPublished: true,
      },
    ],
    requirements: ['Interés en el sector automotriz'],
    learningOutcomes: ['Identificar segmentos de vehículos', 'Entender precios de mercado'],
    durationMinutes: 60,
    tags: ['automotriz', 'básico', 'compra-venta'],
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('Inserting sample course...');
  await db.insert(schema.courses).values([sampleCourse]).onConflictDoNothing();

  console.log('✅ Database seed completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Run directly
  const { D1Database } = await import('@cloudflare/workers-types');
  // This would need a real D1 database connection
  console.log('Run with: pnpm db:seed');
}