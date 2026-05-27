// js/env.js - Environment configuration
// These values are replaced by Vercel at build time or fetched at runtime

window.ENV = {
    MYSHOPSUPABASE_URL: 'https://zexxdoxuzvkovszfqcio.supabase.co',
    MYSHOPSUPABASE_ANON_KEY: 'sb_publishable_svIdBFlhG9fG8zlOsMcs-g_kqUWBT8W',
     CLOUDINARY_CLOUD_NAME: 'dwivufadw',
    CLOUDINARY_UPLOAD_PRESET: 'stockapp_logos'
};

// Add this helper function to upload any image
async function uploadToCloudinary(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'stockapp_logos');  // Your preset
    
    // Optional: You can override the folder per upload
    if (options.folder) {
        formData.append('folder', options.folder);
    }
    
    // Add public_id if you want custom naming
    if (options.publicId) {
        formData.append('public_id', options.publicId);
    }
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${window.ENV.CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }
        
        const result = await response.json();
        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

// For uploading multiple product images
async function uploadMultipleImages(files) {
    const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
    const results = await Promise.all(uploadPromises);
    return results.map(r => r.url);  // Return array of URLs
}
