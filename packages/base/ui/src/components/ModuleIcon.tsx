import { memo } from 'react';
import * as LucideIcons from 'lucide-react';

interface ModuleIconProps {
  logoUrl?: string;
  className?: string;
  fallbackIcon?: keyof typeof LucideIcons;
}

/**
 * Renders a module icon from either:
 * - A Lucide icon reference: "lucide:IconName" (e.g., "lucide:Database")
 * - An image URL: "https://..." or any other string
 * 
 * @example
 * <ModuleIcon logoUrl="lucide:Database" className="w-4 h-4" />
 * <ModuleIcon logoUrl="https://example.com/icon.png" className="w-4 h-4" />
 */
function ModuleIcon({ logoUrl, className = 'w-4 h-4', fallbackIcon = 'Package' }: ModuleIconProps) {
  if (!logoUrl) {
    const FallbackIcon = LucideIcons[fallbackIcon] as React.ComponentType<{ className?: string }>;
    return FallbackIcon ? <FallbackIcon className={className} /> : null;
  }

  // Handle Lucide icon format: "lucide:IconName"
  if (logoUrl.startsWith('lucide:')) {
    const iconName = logoUrl.replace('lucide:', '') as keyof typeof LucideIcons;
    const IconComponent = LucideIcons[iconName] as React.ComponentType<{ className?: string }>;
    
    if (IconComponent) {
      return <IconComponent className={className} />;
    }
    
    // Fallback if icon not found
    console.warn(`Lucide icon "${iconName}" not found, using fallback`);
    const FallbackIcon = LucideIcons[fallbackIcon] as React.ComponentType<{ className?: string }>;
    return FallbackIcon ? <FallbackIcon className={className} /> : null;
  }

  // Handle image URLs
  return (
    <img 
      src={logoUrl} 
      alt="" 
      className={className}
      onError={(e) => {
        // Hide broken images
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export default memo(ModuleIcon);

/**
 * Get a Lucide icon component by name
 * Useful when you need the component directly instead of rendering
 */
export function getLucideIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  if (iconName.startsWith('lucide:')) {
    iconName = iconName.replace('lucide:', '');
  }
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  return IconComponent || null;
}

/**
 * Check if a logoUrl is a Lucide icon reference
 */
export function isLucideIcon(logoUrl?: string): boolean {
  return !!logoUrl?.startsWith('lucide:');
}
