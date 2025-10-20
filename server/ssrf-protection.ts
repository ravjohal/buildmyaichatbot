import { promises as dns } from 'dns';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
    parts[0] >= 224 ||
    (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().split('%')[0];
  
  if (lower === '::1' || lower === '::') {
    return true;
  }
  
  if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) {
    return true;
  }
  
  if (lower.startsWith('fec0:') || lower.startsWith('fec0::')) {
    return true;
  }
  
  if (lower.startsWith('fc00:') || lower.startsWith('fd')) {
    return true;
  }
  
  if (lower.startsWith('ff00:') || lower.startsWith('ff')) {
    return true;
  }
  
  if (lower.startsWith('::ffff:')) {
    const ipv4Part = lower.split('::ffff:')[1];
    if (ipv4Part) {
      return isPrivateIPv4(ipv4Part);
    }
  }
  
  return false;
}

export async function validateUrl(urlString: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    if (url.port && url.port !== '80' && url.port !== '443' && url.port !== '') {
      return { valid: false, error: 'Only standard HTTP (80) and HTTPS (443) ports are allowed' };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    if (BLOCKED_HOSTS.has(hostname)) {
      return { valid: false, error: 'Localhost and loopback addresses are not allowed' };
    }
    
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    
    if (hostname.includes(':') && isPrivateIPv6(hostname)) {
      return { valid: false, error: 'Private IPv6 addresses are not allowed' };
    }
    
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
      return { valid: false, error: 'Metadata endpoints are not allowed' };
    }
    
    try {
      const ipv4Addresses = await dns.resolve4(hostname).catch(() => []);
      const ipv6Addresses = await dns.resolve6(hostname).catch(() => []);
      const allAddresses = [...ipv4Addresses, ...ipv6Addresses];
      
      if (allAddresses.length === 0) {
        return { valid: false, error: 'Failed to resolve hostname' };
      }
      
      for (const address of allAddresses) {
        if (isPrivateIPv4(address)) {
          return { 
            valid: false, 
            error: `DNS resolves to private/reserved IP: ${address}` 
          };
        }
        
        if (address.includes(':') && isPrivateIPv6(address)) {
          return { 
            valid: false, 
            error: `DNS resolves to private/reserved IPv6: ${address}` 
          };
        }
        
        if (address.startsWith('169.254.')) {
          return { 
            valid: false, 
            error: `DNS resolves to link-local address: ${address}` 
          };
        }
      }
    } catch (dnsError) {
      return { valid: false, error: 'Failed to resolve hostname' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function shouldBlockRequest(requestUrl: string): boolean {
  try {
    const url = new URL(requestUrl);
    const hostname = url.hostname.toLowerCase();
    
    if (BLOCKED_HOSTS.has(hostname)) {
      return true;
    }
    
    if (isPrivateIPv4(hostname)) {
      return true;
    }
    
    if (hostname.includes(':') && isPrivateIPv6(hostname)) {
      return true;
    }
    
    if (hostname.startsWith('169.254.') || hostname === '169.254.169.254') {
      return true;
    }
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return true;
    }
    
    return false;
  } catch {
    return true;
  }
}
