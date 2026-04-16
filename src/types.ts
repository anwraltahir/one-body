import { Timestamp } from './firebase';

export type ProjectCategory = 'مياه وآبار' | 'مساجد' | 'زكاة مال' | 'زكاة فطر' | 'فدية صيام' | 'دعم التعليم' | 'الصحة';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'admin';
  createdAt: Timestamp;
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
  status: 'pending' | 'active' | 'completed' | 'rejected';
  createdAt: Timestamp;
  endDate?: Timestamp;
  donorCount: number;
}

export interface Donation {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  donorId?: string;
  donorName?: string;
  isAnonymous: boolean;
  createdAt: Timestamp;
  status: 'success' | 'pending' | 'failed';
}
