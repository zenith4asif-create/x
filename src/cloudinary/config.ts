// Cloudinary credentials directly hardcoded as requested
export const cloudinaryConfig = {
  cloudName: "yuasb9xa",
  uploadPreset: "ml_default",
  apiKey: "331236418415425",
  uploadUrl: (cloudName: string, resourceType: 'image' | 'video' | 'auto' = 'auto') => 
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
};
