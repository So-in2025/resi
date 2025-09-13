'use client';

import { useState, useEffect, useCallback, ChangeEvent, FormEvent, FC } from 'react';
import { useSession, signIn } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { 
    FaBullhorn, FaPlus, FaStar, FaStore, FaUsers, FaMapMarkedAlt, 
    FaShoppingBasket, FaCommentDots, FaExclamationTriangle, FaQrcode, 
    FaCoins, FaCamera, FaTimes, FaSpinner, FaReceipt
} from 'react-icons/fa';
import Modal from './Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { QrReader } from 'react-qr-reader';
import InfoTooltip from './InfoTooltip'; // Importar el componente de tooltip

// --- DEFINICIÓN DE TIPOS DE DATOS ---
interface CommunityPost { id: number; title: string; content: string; category: string; user_email: string; created_at: string; is_featured: boolean; }
interface CommunityEvent { id: number; name: string; description: string; event_type: string; location: string; event_date: string; }
interface MarketplaceItem { id: number; name: string; description: string; price: number; image_url: string | null; is_service: boolean; user_email: string; status: string; }
interface Transaction { id: number; item_id: number; amount: number; status: string; buyer_email: string; seller_email: string; confirmation_code: string; timestamp: string; }
type ActiveTab = 'posts' | 'market' | 'events' | 'transactions';


// --- SUB-COMPONENTES VISUALES REUTILIZABLES ---

/**
 * Guía rápida que explica el funcionamiento del mercado.
 */
const MarketplaceGuide: FC = () => (
    <div className="bg-gray-900/50 p-4 rounded-lg mb-6 border-l-4 border-blue-400 text-sm">
        <h3 className="font-bold text-white text-lg mb-2 flex items-center gap-2">
            <FaStore /> Guía Rápida del Mercado Resiliente
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
                <strong>Publicá:</strong> Llená el formulario para vender un producto o servicio. El precio es en <strong className="text-yellow-400">Monedas Resilientes</strong>.
            </li>
            <li>
                <strong>Comprá con Seguridad:</strong> Al comprar, tus monedas se retienen de forma segura. No se transferirán al vendedor hasta que ambos confirmen la entrega.
            </li>
            <li>
                <strong>Confirmá con el QR:</strong> Al encontrarte con la otra persona, el comprador muestra un código QR y el vendedor lo escanea para confirmar la entrega. ¡Este es el <strong className="text-green-400">Apretón de Manos Digital</strong> que libera el pago!
            </li>
        </ol>
    </div>
);

/**
 * Botón de Pestaña para la navegación principal del módulo.
 */
const TabButton: FC<{ isActive: boolean; onClick: () => void; icon: React.ElementType; label: string; }> = ({ isActive, onClick, icon: Icon, label }) => (
    <button onClick={onClick} className={`flex-1 px-3 py-3 flex items-center justify-center gap-2 transition-colors duration-200 rounded-t-lg text-sm md:text-base ${ isActive ? 'bg-gray-700 text-green-400 border-b-2 border-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'}`}>
        <Icon />
        <span className="font-semibold">{label}</span>
    </button>
);

/**
 * Tarjeta para mostrar una publicación en el Muro de la Comunidad.
 */
// --- Modificar el componente PostCard ---
const PostCard: FC<{ post: CommunityPost; onFeature: (id: number) => void; onContact: (email: string) => void; onReport: (id: number) => void; onDelete: (id: number) => void; currentUserEmail?: string | null; isPremium: boolean; }> = ({ post, onFeature, onContact, onReport, onDelete, currentUserEmail, isPremium }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={`bg-gray-700 rounded-lg p-4 border-l-4 ${post.is_featured ? 'border-yellow-400' : 'border-gray-600'}`}>
        {/* ... (código existente del PostCard) ... */}
        <div className="mt-4 flex justify-between items-center">
            <span className="text-xs font-semibold bg-green-800 text-green-300 px-2 py-1 rounded-full">{post.category}</span>
            <div className="flex items-center gap-2">
                {/* --- LÓGICA PARA MOSTRAR EL BOTÓN DE BORRAR --- */}
                {currentUserEmail === post.user_email && (
                    <button onClick={() => onDelete(post.id)} className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1 transition-colors">
                        <FaTrashAlt /> Borrar
                    </button>
                )}
                {currentUserEmail === post.user_email && !post.is_featured && <button onClick={() => onFeature(post.id)} className="text-yellow-400 hover:text-yellow-300 text-xs font-bold flex items-center gap-1 transition-colors"><FaStar /> Destacar</button>}
                <button onClick={() => onContact(post.user_email)} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors"><FaCommentDots /> Contactar</button>
            </div>
        </div>
    </motion.div>
);
/**
 * Tarjeta para mostrar un Evento (Feria, Taller, Trueque).
 */
const EventCard: FC<{ event: CommunityEvent }> = ({ event }) => (
     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-400">
        <h4 className="font-bold text-white text-lg">{event.name}</h4>
        <p className="text-sm text-gray-400">{new Date(event.event_date).toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} hs</p>
        <p className="text-gray-300 mt-2 whitespace-pre-wrap">{event.description}</p>
        <div className="mt-3 flex justify-between items-center">
            <span className="text-xs font-semibold bg-blue-800 text-blue-300 px-2 py-1 rounded-full">{event.event_type}</span>
            <span className="text-xs text-gray-400 flex items-center gap-1"><FaMapMarkedAlt />{event.location}</span>
        </div>
    </motion.div>
);

/**
 * Tarjeta para mostrar un Producto o Servicio en el Mercado.
 */
const MarketplaceItemCard: FC<{ item: MarketplaceItem; onBuy: (item: MarketplaceItem) => void; }> = ({ item, onBuy }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-gray-700 rounded-lg overflow-hidden flex flex-col">
        <img src={item.image_url || `https://placehold.co/600x400/1F2937/7C8A9E?text=${encodeURIComponent(item.name)}`} alt={item.name} className="w-full h-48 object-cover" />
        <div className="p-4 flex flex-col flex-grow">
            <h4 className="font-bold text-white text-lg">{item.name}</h4>
            <p className="text-xs text-gray-400 mb-2">Vendido por {item.user_email.split('@')[0]}</p>
            <p className="text-gray-300 text-sm flex-grow">{item.description}</p>
            <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-lg">
                    <FaCoins />
                    <span>{item.price}</span>
                </div>
                <button onClick={() => onBuy(item)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md text-sm">
                    Comprar
                </button>
            </div>
        </div>
    </motion.div>
);

/**
 * Modal para incentivar la suscripción a Premium.
 */
const PremiumModal: FC<{ isOpen: boolean; onClose: () => void; onSubscribe: () => void; }> = ({ isOpen, onClose, onSubscribe }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="¡Desbloqueá tu Potencial con Resi Premium!">
        <div className="text-center text-gray-300 space-y-4">
            <FaStar className="text-yellow-400 text-5xl mx-auto" />
            <p>¡Estás a un paso de llevar tu productividad al siguiente nivel!</p>
            <div className="text-left bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-white">Con Resi Premium obtenés:</h4>
                <ul className="list-disc list-inside mt-2 space-y-1 text-green-300">
                    <li>Publicaciones ilimitadas en la comunidad.</li>
                    <li>Posibilidad de destacar tus anuncios para máxima visibilidad.</li>
                    <li>Acceso anticipado a nuevas funcionalidades del mercado.</li>
                    <li>¡Y mucho más próximamente!</li>
                </ul>
            </div>
            <button onClick={onSubscribe} className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition-colors">
                Hacerme Premium (Simulación)
            </button>
        </div>
    </Modal>
);

/**
 * Modal para el flujo de transacción segura - Apretón de Manos Digital
 */
const TransactionModal: FC<{ isOpen: boolean; onClose: () => void; transaction: Transaction | null; role: 'buyer' | 'seller'; onConfirm?: (txId: number) => void; }> = ({ isOpen, onClose, transaction, role, onConfirm }) => {
    const [isScanning, setIsScanning] = useState(false);
    
    if (!transaction) return null;

    const handleScan = (result: any, error: any) => {
        if (!!result) {
            setIsScanning(false);
            const scannedCode = result?.text;
            if (scannedCode === transaction.confirmation_code) {
                toast.success("¡Código verificado! Confirmando entrega...");
                onConfirm?.(transaction.id);
            } else {
                toast.error("Código QR no válido para esta transacción.");
            }
        }
        if (!!error) {
            // console.info(error); // Opcional: para debuggear errores de la cámara
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Transacción #${transaction.id}`}>
            <div className="text-center text-gray-300 space-y-4">
                {role === 'buyer' && (
                    <>
                        <h3 className="text-xl font-bold text-white">Mostrá este QR al vendedor</h3>
                        <p>Para confirmar que recibiste el producto, el vendedor debe escanear este código.</p>
                        <div className="bg-white p-4 rounded-lg inline-block">
                            <QRCodeSVG value={transaction.confirmation_code} size={200} />
                        </div>
                    </>
                )}
                {role === 'seller' && (
                    <>
                         <h3 className="text-xl font-bold text-white">Confirmar la Entrega</h3>
                         <p>Para completar la venta y recibir tus monedas, escaneá el código QR que te mostrará el comprador.</p>
                         {isScanning ? (
                            <div>
                                <QrReader
                                    onResult={handleScan}
                                    constraints={{ facingMode: 'environment' }}
                                    containerStyle={{ width: '100%' }}
                                />
                                <button onClick={() => setIsScanning(false)} className="mt-4 bg-red-600 text-white font-bold py-2 px-4 rounded-lg w-full">Cancelar Escaneo</button>
                            </div>
                         ) : (
                            <button onClick={() => setIsScanning(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                                <FaQrcode /> Escanear Código QR
                            </button>
                         )}
                    </>
                )}
                <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg mt-2">Cerrar</button>
            </div>
        </Modal>
    );
};


// --- COMPONENTE PRINCIPAL DEL MÓDULO ---
export default function CommunityModule() {
    const { data: session, status } = useSession();
    const [isPremiumUser, setIsPremiumUser] = useState(false); // Estado real de la suscripción

    const [activeTab, setActiveTab] = useState<ActiveTab>('posts');
    const [isLoading, setIsLoading] = useState(true);
    
    // Estados para los datos
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
    const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
    
    // Estados para los modales
    const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
    const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [transactionRole, setTransactionRole] = useState<'buyer' | 'seller'>('buyer');

    // Estados para los formularios
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
    const [newEvent, setNewEvent] = useState({ name: '', description: '', event_type: 'Feria', location: '', event_date: '' });
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', is_service: false });
    const [itemImage, setItemImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // --- LÓGICA DE CARGA Y GESTIÓN DE DATOS ---
    const fetchData = useCallback(async (tab: ActiveTab) => {
        if (status !== 'authenticated' || !session?.user?.email) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const config = { headers: { 'Authorization': `Bearer ${session.user.email}` } };
            const actions = {
                posts: () => apiClient.get('/community/posts', config).then(res => setPosts(res.data)),
                events: () => apiClient.get('/community/events', config).then(res => setEvents(res.data)),
                market: () => apiClient.get('/market/items', config).then(res => setMarketplaceItems(res.data)),
                transactions: () => apiClient.get('/market/my-transactions', config).then(res => setMyTransactions(res.data)),
            };
            await actions[tab]();
        } catch (error) {
            console.error(`Error al cargar datos de ${tab}:`, error);
            toast.error(`No se pudieron cargar los datos de ${tab}.`);
        } finally {
            setIsLoading(false);
        }
    }, [session, status]);

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab, fetchData]);

    // --- MANEJADORES DE ACCIONES ---
    const handleCreatePost = async (e: FormEvent) => {
        e.preventDefault();
        if (!newPost.title || !newPost.content) { toast.error("El título y el contenido son obligatorios."); return; }
        const toastId = toast.loading("Publicando...");
        try {
            await apiClient.post('/community/posts', newPost, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
            toast.success("Publicación creada.", { id: toastId });
            setNewPost({ title: '', content: '', category: 'General' });
            fetchData('posts');
        } catch (error: any) {
            if (error.response?.status === 403) {
                setIsPremiumModalVisible(true);
                toast.error("Alcanzaste tu límite de publicaciones.", { id: toastId });
            } else {
                toast.error(error.response?.data?.detail || "No se pudo publicar.", { id: toastId });
            }
        }
    };
    
    const handleCreateEvent = async (e: FormEvent) => {
        e.preventDefault();
        if (!newEvent.name || !newEvent.location || !newEvent.event_date) { toast.error("Nombre, lugar y fecha son obligatorios."); return; }
        const toastId = toast.loading("Creando evento...");
        try {
            await apiClient.post('/community/events', newEvent, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
            toast.success("Evento creado.", { id: toastId });
            setNewEvent({ name: '', description: '', event_type: 'Feria', location: '', event_date: '' });
            fetchData('events');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "No se pudo crear el evento.", { id: toastId });
        }
    };
    
    const handleCreateMarketItem = async (e: FormEvent) => {
        e.preventDefault();
        if (!newItem.name || !newItem.price) { toast.error("Nombre y precio son obligatorios."); return; }
        const toastId = toast.loading("Publicando producto...");
        try {
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('description', newItem.description);
            formData.append('price', newItem.price);
            formData.append('is_service', String(newItem.is_service));
    
            if (itemImage) {
                formData.append('file', itemImage);
            }
    
            await apiClient.post('/market/items', formData, {
                headers: {
                    'Authorization': `Bearer ${session?.user?.email}`,
                }
            });
    
            toast.success("¡Producto publicado en el mercado!", { id: toastId });
            setNewItem({ name: '', description: '', price: '', is_service: false });
            setImagePreview(null);
            setItemImage(null);
            fetchData('market');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "No se pudo publicar el producto.", { id: toastId });
        }
    };
    
    const handleFeaturePost = async (id: number) => {
        if (!isPremiumUser) { setIsPremiumModalVisible(true); return; }
        const toastId = toast.loading("Destacando publicación...");
        try {
            await apiClient.post(`/community/posts/${id}/feature`, {}, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
            toast.success("Publicación destacada.", { id: toastId });
            fetchData('posts');
        } catch (error) {
            toast.error("No se pudo destacar la publicación.", { id: toastId });
        }
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setItemImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleBuyItem = async (item: MarketplaceItem) => {
        const toastId = toast.loading("Iniciando compra...");
        try {
            const response = await apiClient.post(`/market/items/${item.id}/buy`, {}, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
            toast.success("¡Reserva confirmada! Gestioná la entrega en 'Mis Transacciones'.", { id: toastId, duration: 5000 });
            setSelectedTransaction(response.data);
            setTransactionRole('buyer');
            setIsTransactionModalVisible(true);
            fetchData('market'); // Para actualizar el estado del item
            fetchData('transactions');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "No se pudo realizar la compra.", { id: toastId });
        }
    };

    const handleConfirmTransaction = async (txId: number) => {
        const toastId = toast.loading("Confirmando transacción...");
        try {
            await apiClient.post(`/market/transactions/${txId}/confirm`, {}, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
            toast.success("¡Transacción completada! Las monedas han sido transferidas.", { id: toastId });
            setIsTransactionModalVisible(false);
            fetchData('transactions');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "No se pudo confirmar.", { id: toastId });
        }
    };
    
    const handleSubscribe = async () => {
        const toastId = toast.loading("Procesando suscripción Premium...");
        try {
            await apiClient.post('/subscriptions/premium', {}, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
            toast.success("¡Bienvenido a Resi Premium!", { id: toastId });
            setIsPremiumUser(true);
            setIsPremiumModalVisible(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "No se pudo procesar la suscripción.", { id: toastId });
        }
    };

    if (status === 'loading') {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-green-400" /></div>;
    }

    if (status === 'unauthenticated') {
        return (
            <div className="text-center p-8"><h3 className="text-2xl font-bold text-white mb-4">Conectá con la Comunidad Resi</h3><p className="text-gray-300 mb-6">Iniciá sesión para intercambiar productos, ofrecer tus servicios y participar en ferias locales.</p><button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">Ingresar para participar</button></div>
        );
    }

    // --- AÑADE ESTA NUEVA FUNCIÓN DENTRO DEL COMPONENTE ---
    const handleDeletePost = async (id: number) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.")) {
            const toastId = toast.loading("Eliminando publicación...");
            try {
                await apiClient.delete(`/community/posts/${id}`, { headers: { 'Authorization': `Bearer ${session?.user?.email}` } });
                toast.success("Publicación eliminada.", { id: toastId });
                fetchData('posts'); // Refresca la lista de publicaciones
            } catch (error: any) {
                toast.error(error.response?.data?.detail || "No se pudo eliminar la publicación.", { id: toastId });
            }
        }
    };

    
    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <>
            <PremiumModal isOpen={isPremiumModalVisible} onClose={() => setIsPremiumModalVisible(false)} onSubscribe={handleSubscribe} />
            <TransactionModal isOpen={isTransactionModalVisible} onClose={() => setIsTransactionModalVisible(false)} transaction={selectedTransaction} role={transactionRole} onConfirm={handleConfirmTransaction} />

            <div className="space-y-6">
                <div className="flex border-b border-gray-700">
                    <TabButton isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={FaBullhorn} label="Publicaciones" />
                    <TabButton isActive={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={FaShoppingBasket} label="Mercado" />
                    <TabButton isActive={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={FaStore} label="Ferias" />
                    <TabButton isActive={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={FaReceipt} label="Mis Transacciones" />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                        {isLoading && <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-green-400" /></div>}

                        {!isLoading && activeTab === 'posts' && (
                            <div>
                                <form onSubmit={handleCreatePost} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-3">
                                    <h3 className="font-bold text-lg text-white">Crear Publicación</h3>
                                    <input type="text" placeholder="Título" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600" />
                                    <textarea placeholder="¿Qué quieres ofrecer, buscar o promocionar?" value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600 h-24" />
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <select value={newPost.category} onChange={(e) => setNewPost({ ...newPost, category: e.target.value })} className="flex-1 p-2 bg-gray-800 rounded-md border border-gray-600"><option>General</option><option>Cultivo</option><option>Emprendimiento</option><option>Trueque</option><option>Recetas</option></select>
                                        <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"><FaPlus /> Publicar</button>
                                    </div>
                                </form>
                                <div className="space-y-4">{posts.length > 0 ? posts.map(post => <PostCard key={post.id} post={post} onFeature={handleFeaturePost} onContact={(email) => toast(`Simulando chat con ${email}`)} onReport={(id) => toast.error(`Reportando post #${id}`)} currentUserEmail={session?.user?.email} isPremium={isPremiumUser} />) : <p className="text-center text-gray-400 py-8">Todavía no hay publicaciones. ¡Sé el primero!</p>}</div>
                            </div>
                        )}
                        
                        {!isLoading && activeTab === 'market' && (
                           <div>
                                <MarketplaceGuide />
                                <form onSubmit={handleCreateMarketItem} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-3">
                                    <h3 className="font-bold text-lg text-white">Vender en el Mercado</h3>
                                    <input type="text" placeholder="Nombre del Producto o Servicio" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600" />
                                    <textarea placeholder="Descripción detallada" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600 h-20" />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="relative">
                                            <div className="flex items-center">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-yellow-400"><FaCoins /></span>
                                                <input type="number" placeholder="Precio" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 pl-10 bg-gray-800 rounded-md border border-gray-600" />
                                                <InfoTooltip text="El precio se establece en Monedas Resilientes, la moneda interna de la comunidad." />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center bg-gray-800 rounded-md border border-gray-600 px-3">
                                            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={newItem.is_service} onChange={(e) => setNewItem({...newItem, is_service: e.target.checked})} className="form-checkbox h-5 w-5 text-green-500 bg-gray-900 border-gray-600 rounded" /> Es un Servicio</label>
                                            <InfoTooltip text="Marcá esta opción si no estás vendiendo un producto físico (ej: clases, reparaciones, etc.)." />
                                        </div>
                                        <label htmlFor="item-image-upload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"><FaCamera/> Subir Foto</label>
                                        <input id="item-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </div>
                                    {imagePreview && <div className="relative w-32 h-32 mx-auto"><img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover rounded-md" /><button type="button" onClick={() => { setItemImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><FaTimes /></button></div>}
                                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"><FaPlus /> Publicar en Mercado</button>
                                </form>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {marketplaceItems.length > 0 ? marketplaceItems.map(item => <MarketplaceItemCard key={item.id} item={item} onBuy={handleBuyItem} />) : <p className="text-center text-gray-400 py-8 col-span-full">El mercado está vacío. ¡Publica el primer artículo!</p>}
                                </div>
                           </div>
                        )}

                        {!isLoading && activeTab === 'events' && (
                             <div>
                                <form onSubmit={handleCreateEvent} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-3">
                                    <h3 className="font-bold text-lg text-white">Registrar un Evento</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input type="text" placeholder="Nombre del evento" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600" />
                                        <select value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })} className="p-2 bg-gray-800 rounded-md border border-gray-600"><option>Feria</option><option>Punto de Trueque</option><option>Taller</option></select>
                                    </div>
                                    <input type="text" placeholder="Lugar (ej: Plaza de Godoy Cruz)" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600" />
                                    <input type="datetime-local" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600" />
                                    <textarea placeholder="Breve descripción (opcional)" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600 h-20" />
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"><FaPlus /> Crear Evento</button>
                                </form>
                                <div className="space-y-4">{events.length > 0 ? events.map(event => <EventCard key={event.id} event={event} />) : <p className="text-center text-gray-400 py-8">Aún no hay eventos registrados.</p>}</div>
                             </div>
                        )}
                        
                        {!isLoading && activeTab === 'transactions' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                        Mis Compras
                                        <InfoTooltip text="Aquí ves los productos que reservaste. Muestra el QR al vendedor cuando recibas tu producto para completar la transacción." />
                                    </h3>
                                    <div className="space-y-2">
                                        {myTransactions.filter(t => t.buyer_email === session?.user?.email).map(tx => (
                                            <div key={tx.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                                <p>Compra de item #{tx.item_id} - <span className="font-bold capitalize">{tx.status}</span></p>
                                                {tx.status === 'pending' && <button onClick={() => { setSelectedTransaction(tx); setTransactionRole('buyer'); setIsTransactionModalVisible(true); }} className="bg-blue-500 text-white text-xs font-bold py-1 px-2 rounded">Ver QR</button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                        Mis Ventas
                                        <InfoTooltip text="Aquí ves los productos que vendiste. Para recibir tus monedas, haz clic en 'Confirmar Entrega' y escanea el QR del comprador cuando le entregues el producto." />
                                    </h3>
                                    <div className="space-y-2">
                                        {myTransactions.filter(t => t.seller_email === session?.user?.email).map(tx => (
                                            <div key={tx.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                                <p>Venta de item #{tx.item_id} - <span className="font-bold capitalize">{tx.status}</span></p>
                                                {tx.status === 'pending' && <button onClick={() => { setSelectedTransaction(tx); setTransactionRole('seller'); setIsTransactionModalVisible(true); }} className="bg-green-500 text-white text-xs font-bold py-1 px-2 rounded">Confirmar Entrega</button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    );
}