// src/modules/cloudinary/cloudinary.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly uploadPreset: string;

  constructor(private config: ConfigService) {
    this.cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME') || '';
    this.apiKey = this.config.get<string>('CLOUDINARY_API_KEY') || '';
    this.apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET') || '';
    this.uploadPreset =
      this.config.get<string>('CLOUDINARY_UPLOAD_PRESET') || '';
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('upload_preset', this.uploadPreset);

    try {
      const response = await axios.post(url, form, {
        auth: {
          username: this.apiKey,
          password: this.apiSecret,
        },
        headers: form.getHeaders(),
      });
      return response.data.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error', err);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }
}
