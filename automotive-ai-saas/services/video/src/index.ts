import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import type { 
  UUID, 
  ISODateString, 
  VideoJob,
  VideoJobStatus,
  VideoType,
  AspectRatio,
  VideoInput,
  VideoOutput,
} from '@automotive/types';
import { and, eq, desc } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  VIDEO_QUEUE: Queue;
  AI: Ai;
}

export class VideoService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private env: Env;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.env = env;
  }

  // Job Management
  async createJob(data: {
    vehicleId?: UUID;
    campaignId?: UUID;
    type: VideoType;
    input: VideoInput;
    priority?: number;
    organizationId: UUID;
    userId?: UUID;
  }): Promise<VideoJob> {
    const jobId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const job: VideoJob = {
      id: jobId,
      organizationId: data.organizationId,
      vehicleId: data.vehicleId,
      campaignId: data.campaignId,
      type: data.type,
      status: 'PENDING',
      priority: data.priority || 0,
      input: data.input,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.videoJobs).values(job as any);
    
    // Queue for processing
    await this.env.VIDEO_QUEUE.send({
      jobId,
      organizationId: data.organizationId,
      type: 'process_video',
      priority: data.priority || 0,
    });

    await this.eventBus.publish({
      type: 'video.requested',
      payload: job,
      organizationId: data.organizationId,
      userId: data.userId,
    });

    return job;
  }

  async getJob(jobId: UUID, organizationId: UUID): Promise<VideoJob | null> {
    return this.db
      .select()
      .from(schema.videoJobs)
      .where(and(eq(schema.videoJobs.id, jobId), eq(schema.videoJobs.organizationId, organizationId)))
      .get() as any;
  }

  async listJobs(organizationId: UUID, params: { 
    page?: number; 
    limit?: number; 
    status?: VideoJobStatus;
    vehicleId?: UUID;
    campaignId?: UUID;
  }): Promise<{ data: VideoJob[]; meta: any }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = this.db
      .select()
      .from(schema.videoJobs)
      .where(and(
        eq(schema.videoJobs.organizationId, organizationId),
        eq(schema.videoJobs.deletedAt, null)
      ));

    if (params.status) query = query.where(eq(schema.videoJobs.status, params.status));
    if (params.vehicleId) query = query.where(eq(schema.videoJobs.vehicleId, params.vehicleId));
    if (params.campaignId) query = query.where(eq(schema.videoJobs.campaignId, params.campaignId));

    const [jobs, totalResult] = await Promise.all([
      query.orderBy(desc(schema.videoJobs.createdAt)).limit(limit).offset(offset).all(),
      this.db.select({ count: count() }).from(schema.videoJobs).where(
        and(eq(schema.videoJobs.organizationId, organizationId), eq(schema.videoJobs.deletedAt, null))
      ).get(),
    ]);

    const total = totalResult?.count || 0;
    return {
      data: jobs as any[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async updateJobStatus(
    jobId: UUID, 
    organizationId: UUID, 
    status: VideoJobStatus, 
    progress?: number,
    output?: VideoOutput,
    error?: string,
    workerId?: string
  ): Promise<VideoJob | null> {
    const updates: any = { 
      status, 
      updatedAt: new Date().toISOString(),
    };

    if (progress !== undefined) updates.progress = progress;
    if (output) updates.output = output;
    if (error) updates.error = error;
    if (workerId) updates.workerId = workerId;
    if (status === 'PROCESSING' || status === 'RENDERING') updates.startedAt = new Date().toISOString();
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') updates.completedAt = new Date().toISOString();

    await this.db.update(schema.videoJobs).set(updates).where(and(eq(schema.videoJobs.id, jobId), eq(schema.videoJobs.organizationId, organizationId)));

    const job = await this.getJob(jobId, organizationId);

    // Publish events
    if (status === 'COMPLETED') {
      await this.eventBus.publish({
        type: 'video.completed',
        payload: job,
        organizationId,
      });
    } else if (status === 'FAILED') {
      await this.eventBus.publish({
        type: 'video.failed',
        payload: { jobId, error },
        organizationId,
      });
    }

    return job;
  }

  async cancelJob(jobId: UUID, organizationId: UUID): Promise<boolean> {
    const job = await this.getJob(jobId, organizationId);
    if (!job || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) return false;

    await this.updateJobStatus(jobId, organizationId, 'CANCELLED');
    return true;
  }

  // Video Generation (Worker)
  async processVideoJob(jobId: UUID, organizationId: UUID): Promise<void> {
    const job = await this.getJob(jobId, organizationId);
    if (!job) throw new Error('Job not found');

    await this.updateJobStatus(jobId, organizationId, 'QUEUED', 5);
    await this.updateJobStatus(jobId, organizationId, 'PROCESSING', 10);

    try {
      // Step 1: Generate script if not provided
      if (!job.input.script || job.input.script.trim() === '') {
        job.input.script = await this.generateScript(job);
        await this.updateJobStatus(jobId, organizationId, 'PROCESSING', 20);
      }

      // Step 2: Prepare assets (images, video clips)
      const assets = await this.prepareAssets(job);
      await this.updateJobStatus(jobId, organizationId, 'PROCESSING', 30);

      // Step 3: Generate voiceover
      let voiceoverUrl: string | undefined;
      if (job.input.voiceover) {
        voiceoverUrl = await this.generateVoiceover(job.input.voiceover);
        await this.updateJobStatus(jobId, organizationId, 'PROCESSING', 40);
      }

      // Step 4: Render video using Wan2.1 or fallback
      const videoUrl = await this.renderVideo(job, assets, voiceoverUrl);
      await this.updateJobStatus(jobId, organizationId, 'RENDERING', 70);

      // Step 5: Upload to storage
      const storagePath = await this.uploadVideo(jobId, videoUrl);
      await this.updateJobStatus(jobId, organizationId, 'UPLOADING', 90);

      // Step 6: Generate thumbnail
      const thumbnailUrl = await this.generateThumbnail(videoUrl);

      // Complete
      const output: VideoOutput = {
        url: videoUrl,
        thumbnailUrl,
        duration: job.input.duration || 30,
        size: 0, // Would get from file
        format: 'mp4',
        resolution: '1920x1080',
        bitrate: 5000,
        codec: 'h264',
        storagePath,
      };

      await this.updateJobStatus(jobId, organizationId, 'COMPLETED', 100, output);

    } catch (error) {
      await this.updateJobStatus(jobId, organizationId, 'FAILED', 0, undefined, String(error));
      throw error;
    }
  }

  private async generateScript(job: VideoJob): Promise<string> {
    let vehicleInfo = '';
    if (job.vehicleId) {
      const vehicle = await this.db.select().from(schema.vehicles).where(eq(schema.vehicles.id, job.vehicleId)).get();
      if (vehicle) {
        vehicleInfo = `${vehicle.make} ${vehicle.model} ${vehicle.year}, ${vehicle.mileage.toLocaleString()} km, ${vehicle.price.toLocaleString()} ${vehicle.currency}`;
      }
    }

    const typePrompts: Record<VideoType, string> = {
      VEHICLE_SHOWCASE: `Crea un guión atractivo para mostrar el vehículo: ${vehicleInfo}. Destaca sus mejores características.`,
      WALKAROUND: `Guión para un walkaround completo del vehículo: ${vehicleInfo}. Exterior, interior, motor, detalles.`,
      FEATURE_HIGHLIGHT: `Destaca las características principales del vehículo: ${vehicleInfo}. Enfoque en tecnología, seguridad, confort.`,
      COMPARISON: `Compara este vehículo con alternativas del mercado: ${vehicleInfo}.`,
      TESTIMONIAL: `Guión para testimonio de cliente satisfecho con: ${vehicleInfo}.`,
      EDUCATIONAL: `Contenido educativo sobre: ${vehicleInfo}. Explica qué buscar al comprar este tipo de vehículo.`,
      SOCIAL_MEDIA_REEL: `Guión corto (15-30s) para Reels/TikTok del vehículo: ${vehicleInfo}. Dinámico, visual, con hook inicial.`,
      ADS: `Guión para anuncio publicitario del vehículo: ${vehicleInfo}. Persuasivo, con llamada a la acción clara.`,
      CUSTOM: job.input.script || `Video promocional para: ${vehicleInfo}.`,
    };

    const prompt = typePrompts[job.type] || typePrompts.CUSTOM;

    const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'Eres un guionista experto en videos automotrices. Crea guiones concisos, visuales y persuasivos.' },
        { role: 'user', content: `${prompt}\n\nFormato: Escena por escena con descripción visual y audio. Duración total: ${job.input.duration || 30} segundos. Aspecto: ${job.input.aspectRatio}.` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.response || `Video promocional para ${vehicleInfo}`;
  }

  private async prepareAssets(job: VideoJob): Promise<{ images: string[]; videos: string[] }> {
    const images = job.input.images || [];
    const videos = job.input.videoClips || [];

    // Download and optimize images if needed
    // In production, would download from URLs, resize, optimize
    
    return { images, videos };
  }

  private async generateVoiceover(config: VideoInput['voiceover']): Promise<string | undefined> {
    if (!config) return undefined;

    try {
      // Use Cloudflare Workers AI for TTS or external service
      // This is a placeholder - real implementation would call TTS API
      console.log('Generating voiceover:', config);
      
      // For now, return a placeholder URL
      return `https://storage.example.com/voiceovers/${crypto.randomUUID()}.mp3`;
    } catch {
      return undefined;
    }
  }

  private async renderVideo(job: VideoJob, assets: { images: string[]; videos: string[] }, voiceoverUrl?: string): Promise<string> {
    // This is where Wan2.1 would be called
    // In Cloudflare Workers, we'd typically:
    // 1. Send job to a GPU worker (separate service)
    // 2. Poll for completion
    // 3. Get result URL

    // For now, simulate video generation
    const aspectRatios: Record<AspectRatio, { width: number; height: number }> = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '4:3': { width: 1440, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
    };

    const resolution = aspectRatios[job.input.aspectRatio] || aspectRatios['16:9'];

    // In production, this would call the actual video generation service
    // For example, using a GPU worker that runs Wan2.1:
    /*
    const response = await fetch('https://video-worker.example.com/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: job.input.script,
        images: assets.images,
        videos: assets.videos,
        voiceover: voiceoverUrl,
        aspectRatio: job.input.aspectRatio,
        duration: job.input.duration,
        style: job.input.style,
        branding: job.input.branding,
        resolution,
      }),
    });
    const result = await response.json();
    return result.videoUrl;
    */

    // Placeholder - return a mock video URL
    return `https://storage.example.com/videos/${job.id}.mp4`;
  }

  private async uploadVideo(jobId: UUID, videoUrl: string): Promise<string> {
    // Download video and upload to R2
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    
    const storagePath = `videos/${jobId}/output.mp4`;
    await this.env.STORAGE.put(storagePath, blob);
    
    return storagePath;
  }

  private async generateThumbnail(videoUrl: string): Promise<string> {
    // Extract frame from video or generate thumbnail
    // Placeholder
    return `https://storage.example.com/thumbnails/${crypto.randomUUID()}.jpg`;
  }

  // Template-based generation
  async generateFromTemplate(
    templateId: string,
    vehicleId: UUID,
    organizationId: UUID,
    customizations?: Partial<VideoInput>
  ): Promise<VideoJob> {
    // Pre-defined templates for different video types
    const templates: Record<string, Partial<VideoInput>> = {
      'vehicle_showcase_standard': {
        type: 'VEHICLE_SHOWCASE',
        aspectRatio: '16:9',
        duration: 45,
        style: {
          theme: 'professional',
          transitions: ['fade', 'slide'],
          effects: ['zoom', 'pan'],
          textStyle: { font: 'Inter', color: '#ffffff', size: 48, position: 'lower_third', animation: 'fade_in' },
        },
        branding: {
          logoPosition: 'top-right',
          colors: { primary: '#1a1a2e', secondary: '#16213e', accent: '#e94560' },
          fonts: { heading: 'Inter Bold', body: 'Inter Regular' },
        },
      },
      'social_reel_vertical': {
        type: 'SOCIAL_MEDIA_REEL',
        aspectRatio: '9:16',
        duration: 30,
        style: {
          theme: 'dynamic',
          transitions: ['cut', 'whip', 'zoom'],
          effects: ['speed_ramp', 'color_grade'],
          textStyle: { font: 'Inter', color: '#ffffff', size: 56, position: 'center', animation: 'pop_in' },
        },
        branding: {
          logoPosition: 'bottom-right',
          watermark: '@dealership',
          colors: { primary: '#000000', secondary: '#ffffff', accent: '#ff6b35' },
          fonts: { heading: 'Inter Bold', body: 'Inter Regular' },
        },
      },
      'walkaround_detailed': {
        type: 'WALKAROUND',
        aspectRatio: '16:9',
        duration: 90,
        style: {
          theme: 'cinematic',
          transitions: ['smooth_cut', 'dissolve'],
          effects: ['depth_of_field', 'color_grade'],
          textStyle: { font: 'Inter', color: '#ffffff', size: 42, position: 'lower_third', animation: 'slide_up' },
        },
        branding: {
          logoPosition: 'top-left',
          colors: { primary: '#0f0f23', secondary: '#1a1a2e', accent: '#00d4aa' },
          fonts: { heading: 'Inter Bold', body: 'Inter Regular' },
        },
      },
    };

    const template = templates[templateId];
    if (!template) throw new Error(`Template not found: ${templateId}`);

    // Get vehicle images
    const vehicle = await this.db.select().from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId)).get();
    if (!vehicle) throw new Error('Vehicle not found');

    const input: VideoInput = {
      ...template,
      script: '',
      images: vehicle.photos?.map(p => p.url) || [],
      ...customizations,
    } as VideoInput;

    return this.createJob({
      vehicleId,
      type: template.type!,
      input,
      organizationId,
    });
  }

  // Batch generation
  async generateBatch(jobs: Array<{ vehicleId: UUID; templateId: string; customizations?: Partial<VideoInput> }>, organizationId: UUID): Promise<VideoJob[]> {
    const results: VideoJob[] = [];
    
    for (const job of jobs) {
      try {
        const videoJob = await this.generateFromTemplate(job.templateId, job.vehicleId, organizationId, job.customizations);
        results.push(videoJob);
      } catch (error) {
        console.error(`Failed to create job for vehicle ${job.vehicleId}:`, error);
      }
    }

    return results;
  }

  // Analytics
  async getVideoStats(organizationId: UUID): Promise<{
    totalJobs: number;
    completed: number;
    failed: number;
    processing: number;
    avgDuration: number;
    totalMinutes: number;
    byType: Record<VideoType, number>;
    byStatus: Record<VideoJobStatus, number>;
  }> {
    const jobs = await this.db
      .select()
      .from(schema.videoJobs)
      .where(and(eq(schema.videoJobs.organizationId, organizationId), eq(schema.videoJobs.deletedAt, null)))
      .all();

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalMinutes = 0;

    for (const job of jobs as any[]) {
      byType[job.type] = (byType[job.type] || 0) + 1;
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      if (job.output?.duration) totalMinutes += job.output.duration / 60;
    }

    return {
      totalJobs: jobs.length,
      completed: byStatus['COMPLETED'] || 0,
      failed: byStatus['FAILED'] || 0,
      processing: (byStatus['PROCESSING'] || 0) + (byStatus['RENDERING'] || 0) + (byStatus['QUEUED'] || 0),
      avgDuration: jobs.length > 0 ? totalMinutes / jobs.length : 0,
      totalMinutes,
      byType: byType as Record<VideoType, number>,
      byStatus: byStatus as Record<VideoJobStatus, number>,
    };
  }

  // Get video URL for playback
  async getVideoUrl(jobId: UUID, organizationId: UUID): Promise<string | null> {
    const job = await this.getJob(jobId, organizationId);
    if (!job || !job.output) return null;

    // Generate signed URL for R2 object
    // In production, use R2 presigned URLs
    return job.output.url;
  }
}

import { count } from 'drizzle-orm';

export function createVideoService(env: Env): VideoService {
  return new VideoService(env);
}