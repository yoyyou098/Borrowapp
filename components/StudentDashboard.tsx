
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import * as api from '../services/localApi';
import type { Equipment, Log } from '../types';
import Modal from './Modal';
import { MenuIcon, CameraIcon } from './Icons';

interface StudentDashboardProps {
  onSwitchToAdmin: () => void;
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

const EquipmentView: React.FC<{ onBorrow: (item: Equipment) => void, onReturn: (item: Equipment) => void }> = ({ onBorrow, onReturn }) => {
  const { currentUser } = useContext(AppContext);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    setEquipment(api.getEquipment());
    setLogs(api.getLogs());
  }, []);

  const userEmail = currentUser?.email || '';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Available Equipment</h2>
        <p className="text-white/80">Browse and borrow sports equipment.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map(item => {
          const isAvail = item.avail > 0;
          const userBorrowedItem = logs.some(l => l.equipmentId === item.id && l.email === userEmail && l.returnAt === null);

          return (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden fade-in">
              <img src={item.photo} alt={item.name} className="w-full h-48 object-cover" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.type}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.avail}/{item.total} available</p>
                    {userBorrowedItem && <p className="text-xs text-blue-600 mt-1">• You are borrowing this</p>}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${isAvail ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {isAvail ? 'Available' : 'Borrowed'}
                  </span>
                </div>
                <div className="mt-4">
                   <div className={`grid gap-2 ${userBorrowedItem && isAvail ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {userBorrowedItem && (
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm" onClick={() => onReturn(item)}>
                            Return
                        </button>
                    )}
                    {isAvail ? (
                        <button className="bg-primary hover:bg-primary-dark text-white rounded-lg py-2 text-sm" onClick={() => onBorrow(item)}>
                            {userBorrowedItem ? 'Borrow More' : 'Borrow'}
                        </button>
                    ) : !userBorrowedItem ? (
                         <button disabled className="w-full bg-gray-200 text-gray-500 rounded-lg py-2">Unavailable</button>
                    ) : null}
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const HistoryView: React.FC<{ onReturn: (item: Equipment) => void }> = ({ onReturn }) => {
  const { currentUser } = useContext(AppContext);
  const [myLogs, setMyLogs] = useState<Log[]>([]);

  useEffect(() => {
    const logs = api.getLogs().filter(l => l.email === currentUser?.email);
    setMyLogs(logs.reverse());
  }, [currentUser]);
  
  const findEquipment = (id: number) => api.getEquipment().find(e => e.id === id);

  if (myLogs.length === 0) {
    return <div className="p-8 text-center text-gray-500">No borrowing history yet.</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {myLogs.map(log => (
        <div key={log.id} className="p-4 border-b last:border-b-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-800">{log.name} ({log.quantity} pc(s))</p>
              <p className="text-sm text-gray-600">Borrowed: {log.borrowAt}</p>
              {log.returnAt ? (
                <p className="text-sm text-emerald-600">Returned: {log.returnAt}</p>
              ) : (
                <p className="text-sm text-red-600">Currently Borrowing</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
                 {log.photo && <img src={log.photo} className="w-16 h-16 object-cover rounded" alt="Borrow proof"/>}
                 {!log.returnAt ? (
                    <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs" onClick={() => {
                        const equip = findEquipment(log.equipmentId);
                        if(equip) onReturn(equip);
                    }}>Return</button>
                 ) : (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">Returned</span>
                 )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


const StatsView: React.FC = () => {
    const [stats, setStats] = useState({ total: 0, avail: 0, borrowed: 0 });
    const [equipment, setEquipment] = useState<Equipment[]>([]);

    useEffect(() => {
        const items = api.getEquipment();
        const total = items.reduce((sum, item) => sum + item.total, 0);
        const avail = items.reduce((sum, item) => sum + item.avail, 0);
        setStats({ total, avail, borrowed: total - avail });
        setEquipment(items);
    }, []);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow"><p className="text-sm text-gray-600">Total Equipment</p><p className="text-2xl font-bold text-gray-800">{stats.total}</p></div>
                <div className="bg-white p-6 rounded-lg shadow"><p className="text-sm text-gray-600">Available</p><p className="text-2xl font-bold text-green-600">{stats.avail}</p></div>
                <div className="bg-white p-6 rounded-lg shadow"><p className="text-sm text-gray-600">Borrowed</p><p className="text-2xl font-bold text-red-600">{stats.borrowed}</p></div>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b"><h3 className="text-lg font-semibold text-gray-800">Equipment Breakdown</h3></div>
                <div>
                    {equipment.map(item => (
                        <div key={item.id} className="p-4 border-b last:border-b-0 flex justify-between items-center">
                            <div><p className="font-semibold">{item.name}</p><p className="text-sm text-gray-500">{item.type}</p></div>
                            <div className="text-right text-sm"><p>Total: {item.total}</p><p className="text-green-600">Available: {item.avail}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

const BorrowReturnModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  action: 'borrow' | 'return';
  item: Equipment | null;
}> = ({ isOpen, onClose, action, item }) => {
    const { currentUser, showToast, refreshData } = useContext(AppContext);
    const [quantity, setQuantity] = useState(1);
    const [photo, setPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setPhoto(null);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setPhoto(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = () => {
        if (!item || !currentUser) return;
        if (!photo) {
            showToast('Photo Required', 'Please take a photo as proof.', 'error');
            return;
        }

        if (action === 'borrow') {
            api.borrowEquipment(currentUser.email, item.id, quantity, photo);
            showToast('Success', `${item.name} borrowed successfully.`, 'success');
        } else {
            api.returnEquipment(currentUser.email, item.id, photo);
            showToast('Success', `${item.name} returned successfully.`, 'success');
        }
        refreshData();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={action === 'borrow' ? `Borrow: ${item?.name}` : `Return: ${item?.name}`}>
            <div className="space-y-4">
                {action === 'borrow' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Borrow</label>
                        <input type="number" min="1" max={item?.avail} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                )}
                <div>
                    <p className="text-sm text-gray-600 mb-2">Take a photo for proof <span className="text-red-600">*</span></p>
                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100">
                        {photo ? (
                            <img src={photo} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <div className="text-center text-gray-500">
                                <CameraIcon />
                                <p>Tap to take a photo</p>
                            </div>
                        )}
                    </div>
                    {/* Fix: Changed capture="camera" to capture="environment" which is a valid value. */}
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-lg py-2">Confirm</button>
                </div>
            </div>
        </Modal>
    );
};


const StudentDashboard: React.FC<StudentDashboardProps> = ({ onSwitchToAdmin }) => {
  const { currentUser, logout } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('equip');
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [modalState, setModalState] = useState<{isOpen: boolean; action: 'borrow' | 'return'; item: Equipment | null}>({isOpen: false, action: 'borrow', item: null});

  const handleOpenModal = (action: 'borrow' | 'return', item: Equipment) => {
    if(action === 'borrow' && api.isAlreadyBorrowing(currentUser?.email || '', item.id)) {
        showToast('Already Borrowing', 'You are already borrowing this item. Please return it first before borrowing another one.', 'error');
        return;
    }
    setModalState({ isOpen: true, action, item });
  }
  const { showToast } = useContext(AppContext);

  const handleCloseModal = () => setModalState({ isOpen: false, action: 'borrow', item: null });

  const renderContent = () => {
    switch (activeTab) {
      case 'hist':
        return (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Borrowing History</h2>
            </div>
            <HistoryView onReturn={(item) => handleOpenModal('return', item)} />
          </section>
        );
      case 'stats':
        return (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6"><h2 className="text-2xl font-bold text-white">Statistics</h2></div>
            <StatsView />
          </section>
        );
      case 'equip':
      default:
        return <EquipmentView onBorrow={(item) => handleOpenModal('borrow', item)} onReturn={(item) => handleOpenModal('return', item)}/>;
    }
  };

  const menuItems = [
    { id: 'equip', label: 'Equipment' },
    { id: 'hist', label: 'History' },
    { id: 'stats', label: 'Statistics' },
  ];

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <LogoDisplay />
            <h1 className="ml-3 text-lg font-semibold text-gray-800">Equipment System</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="p-2 text-gray-600 hover:text-gray-800 md:hidden"><MenuIcon /></button>
            <button onClick={logout} className="hidden md:block px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">Logout</button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMenuOpen(false)}></div>}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Menu</h3>
            <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          <div className="space-y-2">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setMenuOpen(false); }} 
              className={`w-full text-left px-4 py-3 rounded-lg font-medium ${activeTab === item.id ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                {item.label}
              </button>
            ))}
            {currentUser?.role === 'admin' && (
              <div className="border-t pt-4 mt-4">
                <button onClick={() => { onSwitchToAdmin(); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-primary-app hover:bg-purple-50 font-medium">
                  Admin Panel
                </button>
              </div>
            )}
             <div className="border-t pt-4 mt-4">
                <button onClick={logout} className="w-full text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 font-medium">
                  Logout
                </button>
              </div>
          </div>
        </div>
      </div>
      
      <main>
        {renderContent()}
      </main>

      <BorrowReturnModal 
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        action={modalState.action}
        item={modalState.item}
      />
    </>
  );
};

export default StudentDashboard;
