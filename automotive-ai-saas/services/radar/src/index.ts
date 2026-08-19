import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import type { 
  UUID, 
  ISODateString, 
  VehicleListing,
  VehicleSource,
  RadarSource,
  RadarRule,
  RadarFilters,
  Vehicle,
} from '@automotive/types';
import { and, eq, desc, sql } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue;
  AI: Ai;
}

export interface SourceAdapter {
  search(filters: RadarFilters): Promise<VehicleListing[]>;
  fetchListing(sourceListingId: string): Promise<VehicleListing | null>;
  normalize(listing: any): VehicleListing;
  healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }>;
  getRateLimits(): Promise<{ requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number }>;
}

export class CarDealsSearchAdapter implements SourceAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  async search(filters: RadarFilters): Promise<VehicleListing[]> {
    // This would call the actual Car Deals Search MCP API
    // For now, return mock data
    console.log('Searching Car Deals Search with filters:', filters);
    return [];
  }

  async fetchListing(sourceListingId: string): Promise<VehicleListing | null> {
    // Fetch single listing by ID
    return null;
  }

  normalize(listing: any): VehicleListing {
    // Normalize raw API response to our VehicleListing format
    return {
      id: crypto.randomUUID() as UUID,
      organizationId: '' as UUID, // Set by caller
      vehicleId: undefined,
      source: 'CAR_DEALS_SEARCH',
      sourceListingId: listing.id,
      url: listing.url,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency || 'USD',
      mileage: listing.mileage,
      location: listing.location,
      seller: listing.seller,
      photos: listing.photos || [],
      features: listing.features || [],
      firstSeenAt: listing.firstSeenAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'ACTIVE',
      priceHistory: [{ price: listing.price, date: new Date().toISOString(), source: 'CAR_DEALS_SEARCH' }],
      rawData: listing,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      // Ping API
      await fetch(`${this.baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return { healthy: false, latency: Date.now() - start, error: String(error) };
    }
  }

  async getRateLimits(): Promise<{ requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number }> {
    return { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000 };
  }
}

export class ManualAdapter implements SourceAdapter {
  async search(filters: RadarFilters): Promise<VehicleListing[]> {
    // Manual source doesn't search automatically
    return [];
  }

  async fetchListing(sourceListingId: string): Promise<VehicleListing | null> {
    return null;
  }

  normalize(listing: any): VehicleListing {
    return listing;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    return { healthy: true, latency: 0 };
  }

  async getRateLimits(): Promise<{ requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number }> {
    return { requestsPerMinute: 1000, requestsPerHour: 10000, requestsPerDay: 100000 };
  }
}

export class RadarService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private env: Env;
  private adapters: Map<VehicleSource, SourceAdapter> = new Map();

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.env = env;
    this.initializeAdapters();
  }

  private async initializeAdapters(): Promise<void> {
    this.adapters.set('MANUAL', new ManualAdapter());
    // Other adapters would be initialized with config from database
  }

  private getAdapter(source: RadarSource): SourceAdapter {
    const adapter = this.adapters.get(source.type);
    if (!adapter) {
      throw new Error(`No adapter found for source type: ${source.type}`);
    }
    return adapter;
  }

  async syncSource(sourceId: UUID): Promise<{ success: boolean; listingsFound: number; listingsNew: number; listingsUpdated: number; error?: string }> {
    const source = await this.db
      .select()
      .from(schema.radarSources)
      .where(eq(schema.radarSources.id, sourceId))
      .get();

    if (!source || !source.enabled) {
      return { success: false, listingsFound: 0, listingsNew: 0, listingsUpdated: 0, error: 'Fuente no encontrada o deshabilitada' };
    }

    const adapter = this.getAdapter(source as any);
    const health = await adapter.healthCheck();
    
    await this.db
      .update(schema.radarSources)
      .set({ 
        healthStatus: health.healthy ? 'HEALTHY' : 'DOWN',
        lastSyncAt: new Date().toISOString(),
      })
      .where(eq(schema.radarSources.id, sourceId));

    if (!health.healthy) {
      return { success: false, listingsFound: 0, listingsNew: 0, listingsUpdated: 0, error: health.error };
    }

    // Get active rules for this organization
    const rules = await this.db
      .select()
      .from(schema.radarRules)
      .where(and(
        eq(schema.radarRules.organizationId, source.organizationId),
        eq(schema.radarRules.enabled, true)
      ))
      .all();

    let totalFound = 0;
    let totalNew = 0;
    let totalUpdated = 0;

    for (const rule of rules) {
      const result = await this.executeRule(source as any, rule as any, adapter);
      totalFound += result.found;
      totalNew += result.new;
      totalUpdated += result.updated;
    }

    return { success: true, listingsFound: totalFound, listingsNew: totalNew, listingsUpdated: totalUpdated };
  }

  private async executeRule(source: RadarSource, rule: RadarRule, adapter: SourceAdapter): Promise<{ found: number; new: number; updated: number }> {
    const listings = await adapter.search(rule.filters as RadarFilters);
    let found = 0, newListings = 0, updated = 0;

    for (const listing of listings) {
      found++;
      
      // Check if listing already exists
      const existing = await this.db
        .select()
        .from(schema.vehicleListings)
        .where(and(
          eq(schema.vehicleListings.source, listing.source),
          eq(schema.vehicleListings.sourceListingId, listing.sourceListingId),
          eq(schema.vehicleListings.organizationId, source.organizationId)
        ))
        .get();

      if (existing) {
        // Check for changes
        const hasPriceChange = existing.price !== listing.price;
        const hasMileageChange = existing.mileage !== listing.mileage;
        const hasSellerChange = JSON.stringify(existing.seller) !== JSON.stringify(listing.seller);

        if (hasPriceChange || hasMileageChange || hasSellerChange) {
          // Update listing
          const updates: any = { 
            lastSeenAt: listing.lastSeenAt,
            updatedAt: new Date().toISOString(),
            priceHistory: [...(existing.priceHistory as any[]), { price: listing.price, date: new Date().toISOString(), source: listing.source }],
          };

          if (hasPriceChange) {
            updates.price = listing.price;
            updates.status = 'PRICE_CHANGED';
          }
          if (hasMileageChange) {
            updates.mileage = listing.mileage;
            updates.status = 'MILEAGE_CHANGED';
          }
          if (hasSellerChange) {
            updates.seller = listing.seller;
            updates.status = 'SELLER_CHANGED';
          }

          await this.db.update(schema.vehicleListings).set(updates).where(eq(schema.vehicleListings.id, existing.id));
          
          // Emit events for changes
          if (hasPriceChange) {
            await this.eventBus.publish({
              type: 'listing.price_changed',
              payload: { listingId: existing.id, oldPrice: existing.price, newPrice: listing.price },
              organizationId: source.organizationId,
            });
          }

          updated++;
        } else {
          // Just update last seen
          await this.db
            .update(schema.vehicleListings)
            .set({ lastSeenAt: listing.lastSeenAt, updatedAt: new Date().toISOString() })
            .where(eq(schema.vehicleListings.id, existing.id));
        }
      } else {
        // New listing
        const listingId = crypto.randomUUID() as UUID;
        const now = new Date().toISOString() as ISODateString;

        await this.db.insert(schema.vehicleListings).values({
          id: listingId,
          organizationId: source.organizationId,
          ...listing,
          createdAt: now,
          updatedAt: now,
        } as any);

        await this.eventBus.publish({
          type: 'listing.discovered',
          payload: { ...listing, id: listingId },
          organizationId: source.organizationId,
        });

        newListings++;

        // Check if matches opportunity criteria
        await this.evaluateOpportunity(listingId, source.organizationId, rule);
      }
    }

    return { found, new: newListings, updated };
  }

  private async evaluateOpportunity(listingId: UUID, organizationId: UUID, rule: RadarRule): Promise<void> {
    const listing = await this.db
      .select()
      .from(schema.vehicleListings)
      .where(eq(schema.vehicleListings.id, listingId))
      .get();

    if (!listing) return;

    // Create or update vehicle record
    let vehicle = await this.db
      .select()
      .from(schema.vehicles)
      .where(and(
        eq(schema.vehicles.organizationId, organizationId),
        eq(schema.vehicles.source, listing.source),
        eq(schema.vehicles.sourceListingId, listing.sourceListingId)
      ))
      .get();

    if (!vehicle) {
      // Create new vehicle from listing
      const vehicleId = crypto.randomUUID() as UUID;
      const now = new Date().toISOString() as ISODateString;

      await this.db.insert(schema.vehicles).values({
        id: vehicleId,
        organizationId,
        make: listing.title.split(' ')[0] || 'Unknown', // Simplified
        model: listing.title.split(' ').slice(1).join(' ') || 'Unknown',
        year: new Date().getFullYear(), // Would extract from listing
        mileage: listing.mileage,
        price: listing.price,
        currency: listing.currency,
        status: 'DISCOVERED',
        source: listing.source,
        sourceListingId: listing.sourceListingId,
        sourceUrl: listing.url,
        location: listing.location,
        features: listing.features,
        photos: listing.photos.map(p => ({ id: crypto.randomUUID() as UUID, url: p, isPrimary: false, order: 0, uploadedAt: now })),
        documents: [],
        priceHistory: listing.priceHistory,
        listingData: listing.rawData,
        createdAt: now,
        updatedAt: now,
      } as any);

      vehicle = await this.db.select().from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId)).get();
    }

    // Run opportunity analysis
    await this.analyzeOpportunity(vehicle!.id, organizationId, rule);
  }

  async analyzeOpportunity(vehicleId: UUID, organizationId: UUID, rule?: RadarRule): Promise<void> {
    const vehicle = await this.db
      .select()
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.id, vehicleId), eq(schema.vehicles.organizationId, organizationId)))
      .get();

    if (!vehicle) return;

    // Simple opportunity analysis
    // In production, this would use ML models, market data, etc.
    const marketPrice = vehicle.price * 1.15; // Placeholder
    const estimatedMargin = marketPrice - vehicle.price;
    const marginPercent = (estimatedMargin / vehicle.price) * 100;
    const dealScore = Math.min(100, Math.max(0, Math.round(marginPercent * 5)));
    const riskScore = dealScore > 80 ? 'LOW' : dealScore > 60 ? 'MEDIUM' : 'HIGH';

    // Check against rule thresholds
    const minMargin = rule?.filters?.minMargin || 10;
    const minDealScore = rule?.filters?.minDealScore || 70;

    const isOpportunity = marginPercent >= minMargin && dealScore >= minDealScore;

    await this.db
      .update(schema.vehicles)
      .set({
        marketPrice,
        estimatedMargin,
        dealScore,
        riskScore,
        confidence: 0.8,
        status: isOpportunity ? 'OPPORTUNITY' : 'ANALYZING',
        aiAnalysis: {
          marketPrice,
          estimatedMargin,
          dealScore,
          riskScore,
          confidence: 0.8,
          reasoning: `Margen estimado: ${marginPercent.toFixed(1)}%, Score: ${dealScore}`,
          comparables: [],
          analyzedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.vehicles.id, vehicleId));

    if (isOpportunity) {
      await this.eventBus.publish({
        type: 'opportunity.detected',
        payload: { vehicleId, dealScore, marketPrice, estimatedMargin },
        organizationId,
      });

      // Check if should notify
      if (rule?.notifications?.thresholdDealScore && dealScore >= rule.notifications.thresholdDealScore) {
        await this.sendOpportunityNotification(vehicle!, rule, dealScore);
      }
    }
  }

  private async sendOpportunityNotification(vehicle: Vehicle, rule: RadarRule, dealScore: number): Promise<void> {
    // Create notifications for relevant users
    const members = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, vehicle.organizationId),
        sql`${schema.organizationMembers.role} IN ('OWNER', 'ADMIN', 'MANAGER', 'SALES')`
      ))
      .all();

    for (const member of members) {
      await this.db.insert(schema.notifications).values({
        id: crypto.randomUUID() as UUID,
        organizationId: vehicle.organizationId,
        userId: member.userId,
        type: 'VEHICLE_OPPORTUNITY',
        title: 'Nueva oportunidad detectada',
        message: `${vehicle.make} ${vehicle.model} ${vehicle.year} - Score: ${dealScore}/100`,
        priority: dealScore >= 90 ? 'URGENT' : 'HIGH',
        channels: ['IN_APP', 'EMAIL'],
        actionUrl: `/vehicles/${vehicle.id}`,
        actionLabel: 'Ver detalles',
        metadata: { vehicleId: vehicle.id, dealScore, ruleId: rule.id },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async runScheduledSync(): Promise<void> {
    const sources = await this.db
      .select()
      .from(schema.radarSources)
      .where(and(eq(schema.radarSources.enabled, true), eq(schema.radarSources.healthStatus, 'HEALTHY')))
      .all();

    for (const source of sources) {
      try {
        await this.syncSource(source.id);
      } catch (error) {
        console.error(`Error syncing source ${source.id}:`, error);
      }
    }
  }

  async getOpportunities(organizationId: UUID, params: { minScore?: number; limit?: number; offset?: number }): Promise<Vehicle[]> {
    let query = this.db
      .select()
      .from(schema.vehicles)
      .where(and(
        eq(schema.vehicles.organizationId, organizationId),
        eq(schema.vehicles.deletedAt, null),
        eq(schema.vehicles.status, 'OPPORTUNITY')
      ));

    if (params.minScore) {
      query = query.where(sql`${schema.vehicles.dealScore} >= ${params.minScore}`);
    }

    return query
      .orderBy(desc(schema.vehicles.dealScore))
      .limit(params.limit || 20)
      .offset(params.offset || 0)
      .all() as any;
  }

  async getStats(organizationId: UUID): Promise<{ totalSources: number; healthySources: number; totalListings: number; opportunities: number; lastSync: string | null }> {
    const [sources, listings, opportunities] = await Promise.all([
      this.db.select({ count: count() }).from(schema.radarSources).where(eq(schema.radarSources.organizationId, organizationId)).get(),
      this.db.select({ count: count() }).from(schema.vehicleListings).where(and(eq(schema.vehicleListings.organizationId, organizationId), eq(schema.vehicleListings.deletedAt, null))).get(),
      this.db.select({ count: count() }).from(schema.vehicles).where(and(eq(schema.vehicles.organizationId, organizationId), eq(schema.vehicles.status, 'OPPORTUNITY'), eq(schema.vehicles.deletedAt, null))).get(),
    ]);

    const lastSyncResult = await this.db
      .select({ lastSync: schema.radarSources.lastSyncAt })
      .from(schema.radarSources)
      .where(and(eq(schema.radarSources.organizationId, organizationId), sql`${schema.radarSources.lastSyncAt} IS NOT NULL`))
      .orderBy(desc(schema.radarSources.lastSyncAt))
      .limit(1)
      .get();

    return {
      totalSources: sources?.count || 0,
      healthySources: 0, // Would need separate query
      totalListings: listings?.count || 0,
      opportunities: opportunities?.count || 0,
      lastSync: lastSyncResult?.lastSync || null,
    };
  }
}

import { count } from 'drizzle-orm';

export function createRadarService(env: Env): RadarService {
  return new RadarService(env);
}