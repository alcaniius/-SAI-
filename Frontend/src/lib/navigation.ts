import {
  LayoutDashboard,
  FileText,
  Leaf,
  ShieldCheck,
  GraduationCap,
  BarChart3,
  LucideIcon,
} from 'lucide-react';

export enum Role {
  USER = 'USER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  AUDITOR = 'AUDITOR',
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
}

export const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: [Role.USER, Role.MANAGER, Role.ADMIN, Role.AUDITOR] },
  { name: 'Documentos', href: '/dashboard/documents', icon: FileText, roles: [Role.USER, Role.MANAGER, Role.ADMIN, Role.AUDITOR] },
  { name: 'Ambiental', href: '/dashboard/environmental', icon: Leaf, roles: [Role.USER, Role.MANAGER, Role.ADMIN, Role.AUDITOR] },
  { name: 'Calidad', href: '/dashboard/quality', icon: ShieldCheck, roles: [Role.MANAGER, Role.ADMIN, Role.AUDITOR] },
  { name: 'Educativo', href: '/dashboard/education', icon: GraduationCap, roles: [Role.MANAGER, Role.ADMIN, Role.AUDITOR] },
  { name: 'Indicadores', href: '/dashboard/indicators', icon: BarChart3, roles: [Role.MANAGER, Role.ADMIN, Role.AUDITOR] },
];

export function filterNavigationByRole(items: NavigationItem[], role?: Role): NavigationItem[] {
  if (!role) return [];
  return items.filter((item) => item.roles.includes(role));
}
