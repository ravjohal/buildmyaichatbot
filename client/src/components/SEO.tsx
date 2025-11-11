import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  structuredData?: object;
}

export function SEO({
  title,
  description,
  keywords,
  ogImage = 'https://buildmychatbot.ai/og-image.png',
  ogType = 'website',
  noindex = false,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.content = content;
    };

    // Update basic meta tags
    updateMetaTag('description', description);
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }

    // Update robots meta tag
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Update Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:site_name', 'BuildMyChatbot.Ai', true);

    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href.split('?')[0]; // Remove query params for canonical

    // Add structured data if provided
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]#seo-structured-data') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'seo-structured-data';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function - remove structured data when component unmounts
    return () => {
      if (structuredData) {
        const script = document.querySelector('script[type="application/ld+json"]#seo-structured-data');
        if (script) {
          script.remove();
        }
      }
    };
  }, [title, description, keywords, ogImage, ogType, noindex, structuredData]);

  return null; // This component doesn't render anything
}
