export function updateCanonicalLink(path: string) {
  // Get the base URL (can be obtained from environment variables or configuration)
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://viny-vue.ventuss.xyz';
  const canonicalUrl = `${baseUrl}${path}`;
  
  // Check if a canonical tag already exists
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!link) {
    // If it doesn't exist, create it
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  
  // Update the href attribute
  link.href = canonicalUrl;
}
