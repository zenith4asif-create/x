import { cloudinaryConfig } from './config';

export interface CloudinaryUploadResponse {
  asset_id: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  resource_type: 'image' | 'video' | 'raw';
  created_at: string;
  bytes: number;
  secure_url: string;
  duration?: number;
}

export interface UploadMediaResult {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  publicId: string;
  width: number;
  height: number;
  duration?: number;
  bytes: number;
}

/**
 * Uploads a file directly to Cloudinary using the unsigned upload preset.
 * Supports progress tracking.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadMediaResult> {
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';
  const url = cloudinaryConfig.uploadUrl(cloudinaryConfig.cloudName, resourceType);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  formData.append('api_key', cloudinaryConfig.apiKey);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
          const type = response.resource_type === 'video' ? 'video' : 'image';
          
          let thumbnailUrl = response.secure_url;
          if (type === 'video') {
            // Cloudinary video thumbnail trick: change extension to .jpg
            thumbnailUrl = response.secure_url.replace(/\.[^/.]+$/, '.jpg');
          } else {
            // Optimized thumbnail
            thumbnailUrl = getOptimizedImageUrl(response.secure_url, { width: 400, quality: 'auto' });
          }

          const result: UploadMediaResult = {
            id: response.public_id,
            type,
            url: response.secure_url,
            thumbnailUrl,
            publicId: response.public_id,
            width: response.width || 800,
            height: response.height || 600,
            bytes: response.bytes || 0
          };
          if (typeof response.duration === 'number') {
            result.duration = response.duration;
          }

          resolve(result);
        } catch (err) {
          reject(new Error('Invalid response from Cloudinary server'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData?.error?.message || `Cloudinary upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload to Cloudinary. Please check connection.'));
    };

    xhr.send(formData);
  });
}

/**
 * Transforms a Cloudinary image URL with width, height, crop, format, and quality auto.
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'thumb' | 'limit';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
  } = {}
): string {
  if (!url || !url.includes('cloudinary.com')) return url;

  const transformations: string[] = [];
  if (options.quality) {
    transformations.push(`q_${options.quality}`);
  } else {
    transformations.push('q_auto');
  }

  if (options.format) {
    transformations.push(`f_${options.format}`);
  } else {
    transformations.push('f_auto');
  }

  if (options.crop) {
    transformations.push(`c_${options.crop}`);
  }

  if (options.width) {
    transformations.push(`w_${options.width}`);
  }

  if (options.height) {
    transformations.push(`h_${options.height}`);
  }

  const transformString = transformations.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
}
