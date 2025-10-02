
import type { User, Equipment, Log, Settings, Category } from '../types';
import { KEY_USERS, KEY_EQUIP, KEY_LOGS, KEY_SETTINGS, svgBall, svgRacket, svgEquip } from '../constants';

// --- Password Hashing ---
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}


// --- Generic LocalStorage Helpers ---
const getItem = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading ${key} from localStorage`, error);
        return defaultValue;
    }
};

const setItem = <T,>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing ${key} to localStorage`, error);
    }
};


// --- Data Accessors ---
export const getUsers = (): User[] => getItem<User[]>(KEY_USERS, []);
export const saveUsers = (users: User[]) => setItem<User[]>(KEY_USERS, users);

export const getEquipment = (): Equipment[] => getItem<Equipment[]>(KEY_EQUIP, []);
export const saveEquipment = (equipment: Equipment[]) => setItem<Equipment[]>(KEY_EQUIP, equipment);

export const getLogs = (): Log[] => getItem<Log[]>(KEY_LOGS, []);
export const saveLogs = (logs: Log[]) => setItem<Log[]>(KEY_LOGS, logs);

export const getSettings = (): Settings => getItem<Settings>(KEY_SETTINGS, {
    logoMode: 'icon',
    icon: '🏃',
    logoDataUrl: '',
    bgColor: '#7C3AED',
    textColor: '#FFFFFF',
    categories: [
        {id: 1, name: 'Basketball', defaultImage: svgBall},
        {id: 2, name: 'Soccer', defaultImage: svgBall},
        {id: 3, name: 'Badminton', defaultImage: svgRacket},
        {id: 4, name: 'Volleyball', defaultImage: svgBall},
        {id: 5, name: 'Table Tennis', defaultImage: svgRacket},
        {id: 6, name: 'General Equipment', defaultImage: svgEquip}
    ]
});
export const saveSettings = (settings: Settings) => setItem<Settings>(KEY_SETTINGS, settings);


// --- Business Logic ---
export const ensureInit = async () => {
  // Check if settings exist, if not, save default
  if (!localStorage.getItem(KEY_SETTINGS)) {
      saveSettings(getSettings()); // This will save the default object
  }

  // Migrate old plain-text passwords to hashes
  const users = getUsers();
  let needsMigration = false;
  const migrationPromises = users.map(async (user) => {
    // This is a trick to check for old user format
    if ((user as any).password && !user.passwordHash) {
      needsMigration = true;
      user.passwordHash = await hashPassword((user as any).password);
      delete (user as any).password;
    }
    return user;
  });
  
  if (needsMigration) {
      const migratedUsers = await Promise.all(migrationPromises);
      saveUsers(migratedUsers);
      console.log("User data migrated to hashed passwords.");
  }
};

export const borrowEquipment = (email: string, equipmentId: number, quantity: number, photo: string) => {
    const equipment = getEquipment();
    const item = equipment.find(e => e.id === equipmentId);
    if (!item || item.avail < quantity) {
        console.error("Cannot borrow: item not found or not available");
        return;
    }
    item.avail -= quantity;
    saveEquipment(equipment);

    const logs = getLogs();
    const newLog: Log = {
        id: Date.now(),
        email,
        equipmentId,
        name: item.name,
        quantity,
        borrowAt: new Date().toLocaleString(),
        returnAt: null,
        photo,
    };
    saveLogs([...logs, newLog]);
};

export const isAlreadyBorrowing = (email: string, equipmentId: number): boolean => {
    const logs = getLogs();
    return logs.some(l => l.email === email && l.equipmentId === equipmentId && l.returnAt === null);
};

export const returnEquipment = (email: string, equipmentId: number, returnPhoto: string) => {
    const logs = getLogs();
    const log = logs.find(l => l.email === email && l.equipmentId === equipmentId && l.returnAt === null);
    if (!log) {
        console.error("Cannot return: active log not found");
        return;
    }
    log.returnAt = new Date().toLocaleString();
    log.returnPhoto = returnPhoto;
    saveLogs(logs);

    const equipment = getEquipment();
    const item = equipment.find(e => e.id === equipmentId);
    if (item) {
        item.avail += log.quantity;
        if (item.avail > item.total) item.avail = item.total; // cap at total
        saveEquipment(equipment);
    }
};

export const isCategoryInUse = (categoryId: number): boolean => {
    const equipment = getEquipment();
    const settings = getSettings();
    const category = settings.categories.find(c => c.id === categoryId);
    if (!category) return false;
    return equipment.some(e => e.type === category.name);
};
