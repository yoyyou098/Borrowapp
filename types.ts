
export interface User {
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
  createdAt: number;
}

export interface Log {
  id: number;
  email: string;
  equipmentId: number;
  name: string;
  quantity: number;
  borrowAt: string;
  returnAt: string | null;
  photo: string;
  returnPhoto?: string;
}

export interface Category {
  id: number;
  name: string;
  defaultImage: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  total: number;
  avail: number;
  photo: string;
}

export interface Settings {
  logoMode: 'icon' | 'image';
  icon: string;
  logoDataUrl: string;
  bgColor: string;
  textColor: string;
  categories: Category[];
}

export interface ToastData {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
  undoCallback?: () => void;
}
