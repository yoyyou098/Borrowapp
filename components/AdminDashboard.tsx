
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import * as api from '../services/localApi';
import type { Equipment, Log, Category, Settings } from '../types';
import Modal from './Modal';
import { CameraIcon } from './Icons';
// Fix: Import svgEquip directly from constants as it's not exported from the api module.
import { svgEquip } from '../constants';

interface AdminDashboardProps {
  onSwitchToStudent: () => void;
}

const LogoDisplay: React.FC = () => {
    const { settings } = useContext(AppContext);
    return (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
             {settings.logoMode === 'icon' ? (
                <span className="text-white text-lg">{settings.icon || '🏃'}</span>
            ) : (
                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
            )}
        </div>
    );
};


const ManageEquipment: React.FC = () => {
    const { refreshData, showToast } = useContext(AppContext);
    const [equipment, setEquipment] = useState<Equipment[]>(api.getEquipment());
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Equipment | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [lastDeleted, setLastDeleted] = useState<{single?: Equipment, bulk?: Equipment[]} | null>(null);

    useEffect(() => {
        setEquipment(api.getEquipment());
    }, []);

    const handleOpenModal = (item: Equipment | null = null) => {
        setEditingItem(item);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingItem(null);
    };

    const handleSave = (item: Equipment) => {
        api.saveEquipment(
            editingItem
                ? equipment.map(e => e.id === item.id ? item : e)
                : [...equipment, { ...item, id: Date.now() }]
        );
        refreshData();
        setEquipment(api.getEquipment());
        showToast('Success', `Equipment ${editingItem ? 'updated' : 'added'}.`, 'success');
        handleCloseModal();
    };

    const handleDelete = (id: number) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        const itemToDelete = equipment.find(e => e.id === id);
        if(!itemToDelete) return;
        
        const newEquipment = equipment.filter(e => e.id !== id);
        api.saveEquipment(newEquipment);
        setLastDeleted({ single: itemToDelete });
        
        showToast('Deleted', 'Item deleted.', 'error', () => {
            const currentEquip = api.getEquipment();
            api.saveEquipment([...currentEquip, itemToDelete]);
            refreshData();
            setEquipment(api.getEquipment());
            showToast('Restored', 'Item has been restored.', 'success');
        });
        
        refreshData();
        setEquipment(newEquipment);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0 || !window.confirm(`Delete ${selectedIds.size} selected items?`)) return;
        
        const itemsToDelete = equipment.filter(e => selectedIds.has(e.id));
        const newEquipment = equipment.filter(e => !selectedIds.has(e.id));
        
        api.saveEquipment(newEquipment);
        setLastDeleted({ bulk: itemsToDelete });
        
        showToast('Bulk Deleted', `${itemsToDelete.length} items deleted.`, 'error', () => {
             const currentEquip = api.getEquipment();
             api.saveEquipment([...currentEquip, ...itemsToDelete]);
             refreshData();
             setEquipment(api.getEquipment());
             showToast('Restored', 'Items have been restored.', 'success');
        });

        refreshData();
        setEquipment(newEquipment);
        setSelectedIds(new Set());
    };
    
    const toggleSelection = (id: number) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Manage Equipment</h2>
                    <p className="text-white/80">Add, edit, or delete equipment items.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">+ Add Equipment</button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {selectedIds.size > 0 && (
                    <div className="p-4 bg-red-50 border-b flex items-center justify-between">
                        <span className="text-sm text-red-700">{selectedIds.size} items selected</span>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
                            <button onClick={handleBulkDelete} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm">Delete Selected</button>
                        </div>
                    </div>
                )}
                {equipment.map(item => (
                    <div key={item.id} className={`p-4 border-b last:border-b-0 flex items-center gap-4 ${selectedIds.has(item.id) ? 'bg-red-50' : ''}`}>
                        <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                        <img src={item.photo} alt={item.name} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-800">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.type} | Available: {item.avail}/{item.total}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal(item)} className="px-3 py-1 text-primary-app hover:bg-purple-50 rounded">Edit</button>
                            <button onClick={() => handleDelete(item.id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            <AddEditEquipmentModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} item={editingItem} />
        </section>
    );
};

const AddEditEquipmentModal: React.FC<{isOpen: boolean; onClose: () => void; onSave: (item: Equipment) => void; item: Equipment | null;}> = ({isOpen, onClose, onSave, item}) => {
    const { settings } = useContext(AppContext);
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [total, setTotal] = useState(1);
    const [avail, setAvail] = useState(1);
    const [photo, setPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (item) {
            setName(item.name);
            setType(item.type);
            setTotal(item.total);
            setAvail(item.avail);
            setPhoto(item.photo);
        } else {
            setName('');
            setType(settings.categories[0]?.name || '');
            setTotal(1);
            setAvail(1);
            setPhoto(null);
        }
    }, [item, isOpen, settings.categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Fix: Use svgEquip imported from constants instead of from the api module.
        const newPhoto = photo || settings.categories.find(c => c.name === type)?.defaultImage || svgEquip;
        onSave({ id: item?.id || 0, name, type, total, avail, photo: newPhoto });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setPhoto(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Equipment' : 'Add Equipment'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                        {settings.categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                        <input type="number" min="1" value={total} onChange={e => setTotal(Math.max(1, Number(e.target.value)))} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available</label>
                        <input type="number" min="0" max={total} value={avail} onChange={e => setAvail(Math.min(total, Number(e.target.value)))} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100">
                        {photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover rounded-lg" /> : <div className="text-center text-gray-500"><CameraIcon /><p>Tap to upload</p></div>}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-lg py-2">Save</button>
                </div>
            </form>
        </Modal>
    );
};

const AllHistoryView: React.FC = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    useEffect(() => { setLogs(api.getLogs().slice().reverse()); }, []);
    
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6"><h2 className="text-2xl font-bold text-white">All Borrowing History</h2></div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="p-4 border-b last:border-b-0 flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-gray-800">{log.email}</p>
                            <p className="text-sm text-gray-600">{log.name} ({log.quantity} pc(s))</p>
                            <p className="text-xs text-gray-500">Borrowed: {log.borrowAt}{log.returnAt && ` | Returned: ${log.returnAt}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.photo && <img src={log.photo} alt="proof" className="w-12 h-12 object-cover rounded" />}
                           <span className={`px-2 py-1 rounded-full text-xs ${log.returnAt ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {log.returnAt ? 'Returned' : 'Borrowing'}
                            </span>
                        </div>
                    </div>
                )) : <div className="p-8 text-center text-gray-500">No history records found.</div>}
            </div>
      </section>
    );
};

const AdminStatsView: React.FC = () => {
    const [stats, setStats] = useState({ total: 0, avail: 0, borrowed: 0 });
    const [recentLogs, setRecentLogs] = useState<Log[]>([]);

    useEffect(() => {
        const items = api.getEquipment();
        const total = items.reduce((s, i) => s + i.total, 0);
        const avail = items.reduce((s, i) => s + i.avail, 0);
        setStats({ total, avail, borrowed: total - avail });
        setRecentLogs(api.getLogs().slice(-5).reverse());
    }, []);

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6"><h2 className="text-2xl font-bold text-white">Usage Statistics</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow"><p className="text-sm text-gray-600">Total Equipment</p><p className="text-2xl font-bold text-gray-800">{stats.total}</p></div>
                <div className="bg-white p-6 rounded-lg shadow"><p className="text-sm text-gray-600">Available</p><p className="text-2xl font-bold text-green-600">{stats.avail}</p></div>
                <div className="bg-white p-6 rounded-lg shadow"><p className="text-sm text-gray-600">Borrowed</p><p className="text-2xl font-bold text-red-600">{stats.borrowed}</p></div>
            </div>
            <div className="bg-white rounded-lg shadow"><div className="px-6 py-4 border-b"><h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3></div>
                {recentLogs.map(log => (
                    <div key={log.id} className="p-4 border-b last:border-b-0 flex justify-between items-center">
                        <div><p className="font-medium">{log.email}</p><p className="text-sm text-gray-500">{log.returnAt ? 'Returned' : 'Borrowed'} {log.name}</p></div>
                        <p className="text-xs text-gray-500">{log.returnAt || log.borrowAt}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

const AppSettingsView: React.FC = () => {
    const { settings, updateSettings, showToast } = useContext(AppContext);
    const logoFileInput = useRef<HTMLInputElement>(null);
    const catFileInput = useRef<HTMLInputElement>(null);
    const [newCatName, setNewCatName] = useState('');
    const [newCatImage, setNewCatImage] = useState<string | null>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            updateSettings({ ...settings, logoMode: 'image', logoDataUrl: ev.target?.result as string });
            showToast('Logo updated', 'Image logo has been set.', 'success');
        };
        reader.readAsDataURL(file);
    };

    const handleIconSelect = (icon: string) => {
        updateSettings({ ...settings, logoMode: 'icon', icon });
        showToast('Logo updated', 'Icon logo has been set.', 'success');
    };
    
    const handleColorChange = (type: 'bg' | 'text', color: string) => {
        updateSettings(type === 'bg' ? { ...settings, bgColor: color } : { ...settings, textColor: color });
    };
    
    const handleResetColors = () => {
        updateSettings({ ...settings, bgColor: '#7C3AED', textColor: '#FFFFFF' });
        showToast('Colors Reset', 'Theme colors have been reset to default.', 'info');
    };

    const handleAddCategory = () => {
        if (!newCatName) {
            showToast('Error', 'Category name cannot be empty.', 'error');
            return;
        }
        if(settings.categories.some(c => c.name.toLowerCase() === newCatName.toLowerCase())) {
            showToast('Error', 'Category name already exists.', 'error');
            return;
        }
        const newCategory: Category = {
            id: Date.now(),
            name: newCatName,
            // Fix: Use svgEquip imported from constants instead of from the api module.
            defaultImage: newCatImage || svgEquip
        };
        updateSettings({ ...settings, categories: [...settings.categories, newCategory] });
        setNewCatName('');
        setNewCatImage(null);
        showToast('Success', 'New category added.', 'success');
    };

    const handleDeleteCategory = (id: number) => {
        if(api.isCategoryInUse(id)) {
            showToast('Cannot Delete', 'This category is in use by some equipment.', 'error');
            return;
        }
        if(!window.confirm('Are you sure you want to delete this category?')) return;
        updateSettings({ ...settings, categories: settings.categories.filter(c => c.id !== id) });
        showToast('Success', 'Category deleted.', 'success');
    };

    const handleNewCatImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ev => setNewCatImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6"><h2 className="text-2xl font-bold text-white">App Settings</h2></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Logo & Color Settings */}
                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                   <div>
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">App Logo</h3>
                     <div className="flex items-center space-x-4">
                        <LogoDisplay />
                        <div className="flex gap-2">
                             <button onClick={() => logoFileInput.current?.click()} className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Upload Logo</button>
                             <input type="file" ref={logoFileInput} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                             <button onClick={() => handleIconSelect(prompt("Enter an emoji:", "⚽") || '🏃')} className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm">Pick Icon</button>
                        </div>
                     </div>
                   </div>
                   <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Theme Colors</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                <input type="color" value={settings.bgColor} onChange={e => handleColorChange('bg', e.target.value)} className="w-12 h-10 rounded border border-gray-300" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Text on Primary</label>
                                <input type="color" value={settings.textColor} onChange={e => handleColorChange('text', e.target.value)} className="w-12 h-10 rounded border border-gray-300" />
                            </div>
                            <button onClick={handleResetColors} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">Reset Colors</button>
                        </div>
                   </div>
                </div>
                 {/* Category Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Sports Categories</h3>
                    <div className="space-y-3 mb-6">
                        {settings.categories.map(cat => (
                            <div key={cat.id} className="p-3 border rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={cat.defaultImage} alt={cat.name} className="w-10 h-10 object-cover rounded" />
                                    <p className="font-medium">{cat.name}</p>
                                </div>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">Delete</button>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Add New Category</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category Name" className="border rounded-lg px-3 py-2 col-span-2" />
                            <button onClick={() => catFileInput.current?.click()} className="border rounded-lg py-2 hover:bg-gray-50">Default Image</button>
                            <input type="file" ref={catFileInput} onChange={handleNewCatImage} className="hidden" accept="image/*" />
                        </div>
                        {newCatImage && <img src={newCatImage} alt="preview" className="w-16 h-16 rounded mt-2" />}
                        <button onClick={handleAddCategory} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">+ Add</button>
                    </div>
                </div>
            </div>
        </section>
    );
};


const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSwitchToStudent }) => {
  const { logout } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('equip');

  const tabs = [
    { id: 'equip', label: 'Manage Equipment' },
    { id: 'history', label: 'All History' },
    { id: 'stats', label: 'Statistics' },
    { id: 'settings', label: 'App Settings' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'history': return <AllHistoryView />;
      case 'stats': return <AdminStatsView />;
      case 'settings': return <AppSettingsView />;
      case 'equip':
      default: return <ManageEquipment />;
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center">
                <LogoDisplay />
                <h1 className="ml-3 text-lg font-semibold text-gray-800">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onSwitchToStudent} className="text-primary-app hover:text-primary-dark-app text-sm font-medium">User Mode</button>
                <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">Logout</button>
            </div>
        </div>
      </header>
      <nav className="bg-white border-b">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-primary text-primary-app' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
         </div>
      </nav>
      <main>{renderContent()}</main>
    </>
  );
};

export default AdminDashboard;
