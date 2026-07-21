export type ProjectCategory =
  | 'مياه وآبار'
  | 'مساجد'
  | 'زكاة مال'
  | 'زكاة فطر'
  | 'فدية صيام'
  | 'دعم التعليم'
  | 'الصحة';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'admin';
  createdAt: string;
  phone?: string;
  isSuperuser?: boolean;
  isStaff?: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string;
  creatorId: string;
  creatorName: string;
  isPublic: boolean;
  status: 'pending' | 'active' | 'inactive' | 'completed' | 'rejected';
  createdAt: string;
  endDate?: string | null;
  donorCount: number;
}

export interface Donation {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  donorId?: string | null;
  donorName?: string;
  isAnonymous: boolean;
  createdAt: string;
  status: 'success' | 'pending' | 'failed';
}

/** Format ISO date string for Arabic UI */
export function formatDate(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch {
    return value;
  }
}
