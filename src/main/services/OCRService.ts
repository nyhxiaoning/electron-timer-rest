import { OCRResult } from '../../shared/types/notes';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs/promises';


export interface OCROptions {
  language?: string;
  whitelist?: string;
  blacklist?: string;
  oem?: number;
  psm?: number;
  preserveInterwordSpaces?: boolean;
}

export interface OCRServiceConfig {
  defaultLanguage?: string;
  workerPath?: string;
  cachePath?: string;
  maxWorkers?: number;
}

export class OCRService {
  private workers: any[] = [];
  private config: OCRServiceConfig;
  private initialized: boolean = false;

  constructor(config: OCRServiceConfig = {}) {
    this.config = {
      defaultLanguage: config.defaultLanguage || 'chi_sim+eng',
      workerPath: config.workerPath,
      cachePath: config.cachePath,
      maxWorkers: config.maxWorkers || 2
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      for (let i = 0; i < (this.config.maxWorkers || 1); i++) {
        const worker = await createWorker(this.config.defaultLanguage!);
        this.workers.push(worker);
      }
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OCR service: ${error}`);
    }
  }

  async recognizeImage(imagePath: string, options: OCROptions = {}): Promise<OCRResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const worker = this.getAvailableWorker();
      
      if (!worker) {
        throw new Error('No available OCR workers');
      }

      const result = await worker.recognize(imageBuffer, {
        tessedit_char_whitelist: options.whitelist,
        tessedit_char_blacklist: options.blacklist,
        preserve_interword_spaces: options.preserveInterwordSpaces ? '1' : '0'
      });

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        coordinates: result.data.words.length > 0 ? {
          x: result.data.words[0].bbox.x0,
          y: result.data.words[0].bbox.y0,
          width: result.data.words[0].bbox.x1 - result.data.words[0].bbox.x0,
          height: result.data.words[0].bbox.y1 - result.data.words[0].bbox.y0
        } : undefined
      };
    } catch (error) {
      throw new Error(`OCR recognition failed: ${error}`);
    }
  }

  async recognizeTextRegions(imagePath: string, options: OCROptions = {}): Promise<OCRResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const worker = this.getAvailableWorker();
      
      if (!worker) {
        throw new Error('No available OCR workers');
      }

      const result = await worker.recognize(imageBuffer, {
        tessedit_char_whitelist: options.whitelist,
        tessedit_char_blacklist: options.blacklist,
        preserve_interword_spaces: options.preserveInterwordSpaces ? '1' : '0'
      });

      return result.data.words.map(word => ({
        text: word.text,
        confidence: word.confidence,
        coordinates: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0
        }
      }));
    } catch (error) {
      throw new Error(`OCR text region recognition failed: ${error}`);
    }
  }

  async recognizeFromBuffer(imageBuffer: Buffer, options: OCROptions = {}): Promise<OCRResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const worker = this.getAvailableWorker();
      
      if (!worker) {
        throw new Error('No available OCR workers');
      }

      const result = await worker.recognize(imageBuffer, {
        tessedit_char_whitelist: options.whitelist,
        tessedit_char_blacklist: options.blacklist,
        preserve_interword_spaces: options.preserveInterwordSpaces ? '1' : '0'
      });

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
        coordinates: result.data.words.length > 0 ? {
          x: result.data.words[0].bbox.x0,
          y: result.data.words[0].bbox.y0,
          width: result.data.words[0].bbox.x1 - result.data.words[0].bbox.x0,
          height: result.data.words[0].bbox.y1 - result.data.words[0].bbox.y0
        } : undefined
      };
    } catch (error) {
      throw new Error(`OCR recognition from buffer failed: ${error}`);
    }
  }

  async detectTextRegions(imagePath: string): Promise<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const worker = this.getAvailableWorker();
      
      if (!worker) {
        throw new Error('No available OCR workers');
      }

      const result = await worker.detect(imageBuffer);
      
      return result.data.blocks.map(block => ({
        x: block.bbox.x0,
        y: block.bbox.y0,
        width: block.bbox.x1 - block.bbox.x0,
        height: block.bbox.y1 - block.bbox.y0,
        confidence: block.confidence
      }));
    } catch (error) {
      throw new Error(`Text region detection failed: ${error}`);
    }
  }

  async processBookScan(imagePath: string, options: OCROptions = {}): Promise<{
    fullText: string;
    regions: OCRResult[];
    confidence: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const [fullResult, regions] = await Promise.all([
        this.recognizeImage(imagePath, options),
        this.recognizeTextRegions(imagePath, options)
      ]);

      const avgConfidence = regions.length > 0 
        ? regions.reduce((sum, region) => sum + region.confidence, 0) / regions.length 
        : 0;

      return {
        fullText: fullResult.text,
        regions: regions.filter(region => region.confidence > 30),
        confidence: avgConfidence
      };
    } catch (error) {
      throw new Error(`Book scan processing failed: ${error}`);
    }
  }

  async optimizeImageForOCR(imagePath: string): Promise<Buffer> {
    try {
      const sharp = require('sharp');
      
      const buffer = await sharp(imagePath)
        .grayscale()
        .normalize()
        .threshold(128)
        .resize(1200, undefined, { 
          withoutEnlargement: true,
          fit: 'inside' 
        })
        .sharpen()
        .toBuffer();

      return buffer;
    } catch (error) {
      console.warn('Image optimization failed, using original image:', error);
      return await fs.readFile(imagePath);
    }
  }

  async batchProcessImages(imagePaths: string[], options: OCROptions = {}): Promise<OCRResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: OCRResult[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const optimizedImage = await this.optimizeImageForOCR(imagePath);
        const result = await this.recognizeFromBuffer(optimizedImage, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process image ${imagePath}:`, error);
        results.push({
          text: '',
          confidence: 0
        });
      }
    }

    return results;
  }

  private getAvailableWorker(): any {
    return this.workers.find(worker => !worker.busy) || this.workers[0];
  }

  async terminate(): Promise<void> {
    try {
      await Promise.all(this.workers.map(worker => worker.terminate()));
      this.workers = [];
      this.initialized = false;
    } catch (error) {
      console.error('Failed to terminate OCR workers:', error);
    }
  }

  getSupportedLanguages(): string[] {
    return [
      'chi_sim',      // 简体中文
      'chi_tra',      // 繁体中文
      'eng',          // 英文
      'jpn',          // 日文
      'kor',          // 韩文
      'deu',          // 德文
      'fra',          // 法文
      'spa',          // 西班牙文
      'chi_sim+eng',  // 中文+英文
      'chi_tra+eng'   // 繁体中文+英文
    ];
  }

  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language);
  }
}