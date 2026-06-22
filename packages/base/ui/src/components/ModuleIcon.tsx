import { memo, useEffect, useState, type ComponentType } from 'react';
import {
  Bot,
  Brain,
  Cookie,
  Database,
  FolderOpen,
  GitBranch,
  Github,
  Globe,
  Hand,
  Inbox,
  Key,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Play,
  Repeat,
  Send,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Type,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

interface ModuleIconProps {
  logoUrl?: string;
  className?: string;
  fallbackIcon?: string;
}

/** Icons referenced by bits-catalog and common module metadata — kept as static imports. */
const STATIC_ICONS: Record<string, LucideIcon> = {
  Bot,
  Brain,
  Cookie,
  Database,
  FolderOpen,
  GitBranch,
  Github,
  Globe,
  Hand,
  Inbox,
  Key,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Play,
  Repeat,
  Send,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Type,
  Users,
  Zap,
};

function resolveIconName(logoUrl: string): string {
  return logoUrl.startsWith('lucide:') ? logoUrl.slice('lucide:'.length) : logoUrl;
}

function DynamicLucideIcon({
  name,
  className,
  fallbackName = 'Package',
}: {
  name: string;
  className?: string;
  fallbackName?: string;
}) {
  const [Icon, setIcon] = useState<LucideIcon | null>(STATIC_ICONS[name] ?? null);

  useEffect(() => {
    if (STATIC_ICONS[name]) {
      setIcon(STATIC_ICONS[name]);
      return;
    }

    const importer = dynamicIconImports[name as keyof typeof dynamicIconImports];
    if (!importer) {
      setIcon(STATIC_ICONS[fallbackName] ?? Package);
      return;
    }

    let cancelled = false;
    importer()
      .then((mod) => {
        if (!cancelled) setIcon(() => mod.default);
      })
      .catch(() => {
        if (!cancelled) setIcon(STATIC_ICONS[fallbackName] ?? Package);
      });

    return () => {
      cancelled = true;
    };
  }, [name, fallbackName]);

  const Resolved = Icon ?? STATIC_ICONS[fallbackName] ?? Package;
  return <Resolved className={className} />;
}

/**
 * Renders a module icon from either:
 * - A Lucide icon reference: "lucide:IconName" (e.g., "lucide:Database")
 * - An image URL: "https://..." or any other string
 */
function ModuleIcon({ logoUrl, className = 'w-4 h-4', fallbackIcon = 'Package' }: ModuleIconProps) {
  if (!logoUrl) {
    const Fallback = STATIC_ICONS[fallbackIcon] ?? Package;
    return <Fallback className={className} />;
  }

  if (logoUrl.startsWith('lucide:')) {
    const iconName = resolveIconName(logoUrl);
    return <DynamicLucideIcon name={iconName} className={className} fallbackName={fallbackIcon} />;
  }

  return (
    <img
      src={logoUrl}
      alt=""
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export default memo(ModuleIcon);

/** Resolve a Lucide icon component by name (loads on demand for unknown icons). */
export function getLucideIcon(iconName: string): ComponentType<{ className?: string }> | null {
  const name = resolveIconName(iconName);
  return STATIC_ICONS[name] ?? null;
}

export function isLucideIcon(logoUrl?: string): boolean {
  return !!logoUrl?.startsWith('lucide:');
}
