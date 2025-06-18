// Load configuration from environment file
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

// Alternative for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// R2 Configuration - these must be set in your .env file
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Local Paths
const RECORDS_DIR = path.join(__dirname, '../public/records');
const LIBRARY_FILE = path.join(RECORDS_DIR, 'records-library.json');

// Create S3 client (compatible with R2 API)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Validate Credentials and Bucket
async function validateCredentials() {
  try {
    console.log('Validating R2 credentials and bucket...');
    console.log(`- Account ID: ${R2_ACCOUNT_ID}`);
    console.log(`- Bucket Name: ${R2_BUCKET_NAME}`);
    console.log(`- Access Key ID: ${R2_ACCESS_KEY_ID.substring(0, 5)}...`);
    
    // Attempt to list all buckets to verify credentials
    const listCommand = new ListBucketsCommand({});
    const response = await s3Client.send(listCommand);
    
    console.log('Credentials validated successfully! Accessible buckets:');
    response.Buckets.forEach(bucket => {
      console.log(`- ${bucket.Name}`);
    });
    
    // Check if the target bucket exists
    const bucketExists = response.Buckets.some(bucket => bucket.Name === R2_BUCKET_NAME);
    if (!bucketExists) {
      console.error(`Error: Bucket "${R2_BUCKET_NAME}" does not exist. Please create it in your Cloudflare dashboard.`);
      return false;
    }
    
    console.log(`Bucket "${R2_BUCKET_NAME}" confirmed.`);
    return true;
  } catch (err) {
    console.error('Credential validation failed:', err);
    console.error('Please check if your R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are correct.');
    console.error('Ensure your API key has sufficient permissions.');
    return false;
  }
}

// Read library data
const libraryData = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));

// Object to store new path mappings
const pathMappings = {};

// Recursively scan directories for .m4a and image files
async function scanDirectory(dir, baseDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name);
    
    if (entry.isDirectory()) {
      await scanDirectory(fullPath, relativePath);
    } else if (entry.name.endsWith('.m4a')) {
      console.log(`Found music file: ${relativePath}`);
      await uploadFile(fullPath, relativePath);
    } else if (entry.name.endsWith('.jpg') || entry.name.endsWith('.png')) {
      console.log(`Found cover image: ${relativePath}`);
      await uploadFile(fullPath, relativePath);
    }
  }
}

// Upload a file to R2
async function uploadFile(filePath, relativePath) {
  const fileContent = fs.readFileSync(filePath);
  // Normalize path to use forward slashes for the R2 key
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  try {
    // Determine content type
    let contentType = 'application/octet-stream';
    if (filePath.endsWith('.m4a')) {
      contentType = 'audio/m4a';
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filePath.endsWith('.png')) {
      contentType = 'image/png';
    }
    
    console.log(`Uploading: ${normalizedPath} (${fileContent.length} bytes, ${contentType})`);
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: normalizedPath,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read',
    });
    
    await s3Client.send(putCommand);
    console.log(`Upload successful: ${normalizedPath}`);

    // Store path mapping for later update
    const oldPath = `/records/${normalizedPath}`;
    const newPath = `${R2_PUBLIC_URL}/${normalizedPath}`;
    pathMappings[oldPath] = newPath;
    
    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (err) {
    console.error(`Upload failed for ${normalizedPath}:`, err);
    console.error('Error details:', JSON.stringify(err, null, 2));
  }
}

// Update paths in the JSON library file
function updateLibraryPaths() {
  // Iterate over each album
  for (const album of libraryData.albums) {
    // Update cover image path
    if (pathMappings[album.coverSrc]) {
      album.coverSrc = pathMappings[album.coverSrc];
    }
    
    // Update each song's path
    for (const song of album.songs) {
      if (pathMappings[song.src]) {
        song.src = pathMappings[song.src];
      }
    }
  }
  
  // Save the updated JSON file
  const updatedContent = JSON.stringify(libraryData, null, 2);
  fs.writeFileSync(LIBRARY_FILE, updatedContent);
  console.log('Successfully updated paths in records-library.json');
}

// Main function
async function main() {
  try {
    // Validate environment variables
    const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
    const unsetVars = requiredEnvVars.filter(v => !process.env[v]);

    if (unsetVars.length > 0) {
      console.error('Error: The following required environment variables are not set:');
      console.error(unsetVars.join(', '));
      console.error('Please ensure your .env file contains all necessary configurations.');
      process.exit(1);
    }

    // Validate credentials and bucket
    const isValid = await validateCredentials();
    if (!isValid) {
      process.exit(1);
    }

    console.log('Scanning for media files...');
    await scanDirectory(RECORDS_DIR);
    
    console.log('Updating paths in JSON library file...');
    updateLibraryPaths();
    
    console.log('All tasks completed successfully!');
  } catch (err) {
    console.error('An unexpected error occurred:', err);
    process.exit(1);
  }
}

main(); 