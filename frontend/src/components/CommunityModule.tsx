'use client';

import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useSession, signIn } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { 
    FaBullhorn, FaPlus, FaStar, FaStore, FaUsers, FaMapMarkedAlt, 
    FaShoppingBasket, FaCommentDots, FaExclamationTriangle, FaQrcode, 
    FaCoins, FaCamera, FaTimes, FaSpinner
} from 'react-icons/fa';
import Modal from './Modal';
import { motion, AnimatePresence } from 'framer-motion';

// --- DEFINICIÓN DE TIPOS DE DATOS ---
interface CommunityPost { id: number; title: string; content: string; category: string; user_email: string; created_at: string; is_featured: boolean; }
interface CommunityEvent { id: number; name: string; description: string; event_type: string; location: string; event_date: string; }
interface MarketplaceItem { id: number; name: string; description: string; price: number; image_url: string | null; is_service: boolean; user_email: string; }
type ActiveTab = 'posts' | 'market' | 'events';


// --- COMPONENTES VISUALES REUTILIZABLES (SUB-COMPONENTES) ---

/**
 * Botón de Pestaña para la navegación principal del módulo.
 */
const TabButton = ({ isActive, onClick, icon: Icon, label }: { isActive: boolean; onClick: () => void; icon: React.ElementType; label: string; }) => (
    <button onClick={onClick} className={`flex-1 px-3 py-3 flex items-center justify-center gap-2 transition-colors duration-200 rounded-t-lg text-sm md:text-base ${ isActive ? 'bg-gray-700 text-green-400 border-b-2 border-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'}`}>
        <Icon />
        <span className="font-semibold">{label}</span>
    </button>
);

/**
 * Tarjeta para mostrar una publicación en el Muro de la Comunidad.
 * Incluye lógica de acciones contextuales (destacar, contactar, reportar).
 */
const PostCard = ({ post, onFeature, onContact, onReport, currentUserEmail, isPremium }: { post: CommunityPost, onFeature: (id: number) => void, onContact: (email: string) => void, onReport: (id: number) => void, currentUserEmail?: string | null, isPremium: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={`bg-gray-700 rounded-lg p-4 border-l-4 ${post.is_featured ? 'border-yellow-400' : 'border-gray-600'}`}>
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-white text-lg">{post.title}</h4>
                <p className="text-xs text-gray-400">por {post.user_email.split('@')[0]} - {new Date(post.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            {post.is_featured && <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-gray-800 px-2 py-1 rounded-full"><FaStar /><span>DESTACADO</span></div>}
        </div>
        <p className="text-gray-300 mt-2 whitespace-pre-wrap">{post.content}</p>
        <div className="mt-4 flex justify-between items-center">
            <span className="text-xs font-semibold bg-green-800 text-green-300 px-2 py-1 rounded-full">{post.category}</span>
            <div className="flex items-center gap-2">
                {currentUserEmail === post.user_email && !post.is_featured && <button onClick={() => onFeature(post.id)} className="text-yellow-400 hover:text-yellow-300 text-xs font-bold flex items-center gap-1 transition-colors"><FaStar /> Destacar</button>}
                <button onClick={() => onContact(post.user_email)} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors"><FaCommentDots /> Contactar</button>
                <button onClick={() => onReport(post.id)} className="text-red-500 hover:text-red-400 text-xs font-bold transition-colors"><FaExclamationTriangle /></button>
            </div>
        </div>
    </motion.div>
);

/**
 * Tarjeta para mostrar un Evento (Feria, Taller, Trueque).
 */
const EventCard = ({ event }: { event: CommunityEvent }) => (
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
const MarketplaceItemCard = ({ item, onBuy }: { item: MarketplaceItem, onBuy: (item: MarketplaceItem) => void }) => (
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
const PremiumModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
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
            <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition-colors">
                Quiero ser Premium (Próximamente)
            </button>
        </div>
    </Modal>
);

/**
 * Modal para el flujo de transacción segura ("Apretón de Manos Digital").
 */
const TransactionModal = ({ isOpen, onClose, item }: { isOpen: boolean, onClose: () => void, item: MarketplaceItem | null }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={`Comprar: ${item?.name}`}>
        {item && (
            <div className="text-center text-gray-300 space-y-4">
                <h3 className="text-2xl font-bold text-white">Confirmación de Compra</h3>
                <p>Estás por comprar <span className="font-bold text-green-400">{item.name}</span> por <span className="font-bold text-yellow-400">{item.price} Monedas Resilientes</span>.</p>
                <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="font-bold text-lg text-yellow-400 mb-2">¡Apretón de Manos Digital!</h4>
                    <p className="text-sm">Tus monedas serán retenidas de forma segura. Cuando te encuentres con el vendedor y recibas el producto, mostrale este código QR para confirmar la entrega y liberar el pago.</p>
                    <div className="mt-4 flex justify-center">
                        {/* Placeholder para el QR real */}
                        <div className="w-48 h-48 bg-white flex items-center justify-center rounded-lg">
                             <FaQrcode className="text-8xl text-gray-800" />
                        </div>
                    </div>
                </div>
                 <div className="flex gap-4 mt-4">
                    <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg">Cancelar</button>
                    <button onClick={() => {toast.success("¡Reserva confirmada! Contacta al vendedor."); onClose();}} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">Confirmar y Reservar</button>
                </div>
            </div>
        )}
    </Modal>
);


// --- COMPONENTE PRINCIPAL DEL MÓDULO ---
export default function CommunityModule() {
    const { data: session, status } = useSession();
    // Asumimos que obtendremos si el usuario es premium desde el session o un endpoint
    const isPremiumUser = true; // Placeholder - Cambiar a `session?.user?.is_premium` cuando esté disponible

    const [activeTab, setActiveTab] = useState<ActiveTab>('posts');
    const [isLoading, setIsLoading] = useState(true);
    
    // Estados para los datos de cada pestaña
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]); // Placeholder
    
    // Estados para los modales
    const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
    const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
    const [selectedMarketItem, setSelectedMarketItem] = useState<MarketplaceItem | null>(null);

    // Estados para los formularios
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
    const [newEvent, setNewEvent] = useState({ name: '', description: '', event_type: 'Feria', location: '', event_date: '' });
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', is_service: false });
    const [itemImage, setItemImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // --- Lógica de Carga de Datos ---
    const fetchData = useCallback(async (tab: ActiveTab) => {
        if (status !== 'authenticated') { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const config = { headers: { 'Authorization': `Bearer ${session?.user?.email}` } };
            let response;
            if (tab === 'posts') {
                response = await apiClient.get('/community/posts', config);
                setPosts(response.data);
            } else if (tab === 'events') {
                response = await apiClient.get('/community/events', config);
                setEvents(response.data);
            }
            // Lógica para cargar items del mercado
            if (tab === 'market') {
                // Placeholder: Reemplazar con la llamada a la API real cuando exista
                setMarketplaceItems([
                    {id: 1, name: "Miel Pura de Lavanda", description: "Frasco de 500gr de miel de lavanda de mi propia cosecha en Maipú.", price: 150, image_url: "https://images.unsplash.com/photo-1578916399995-ef0f7a3e8b49?q=80&w=2070&auto=format&fit=crop", is_service: false, user_email: "productor@resi.com"},
                    {id: 2, name: "Clase de Kokedama", description: "Te enseño a armar tu propia kokedama. Incluye materiales. Duración: 2 horas.", price: 300, image_url: "https://images.unsplash.com/photo-1614594632596-16382531e842?q=80&w=1974&auto=format&fit=crop", is_service: true, user_email: "artesana@resi.com"},
                ]);
            }
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
    
    // --- Handlers de Acciones ---
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
        toast.success("¡Producto publicado en el mercado! (Simulación)");
        // Aquí iría la lógica de subida de imagen y luego el post a la API
    };

    const handleFeaturePost = async (id: number) => {
        if (!isPremiumUser) {
            setIsPremiumModalVisible(true);
            return;
        }
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

    const handleBuyItem = (item: MarketplaceItem) => {
        setSelectedMarketItem(item);
        setIsTransactionModalVisible(true);
    };
    
    if (status === 'loading') {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-4xl text-green-400" /></div>;
    }

    if (status === 'unauthenticated') {
        return (
            <div className="text-center p-8"><h3 className="text-2xl font-bold text-white mb-4">Conectá con la Comunidad Resi</h3><p className="text-gray-300 mb-6">Iniciá sesión para intercambiar productos, ofrecer tus servicios y participar en ferias locales.</p><button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">Ingresar para participar</button></div>
        );
    }

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <>
            <PremiumModal isOpen={isPremiumModalVisible} onClose={() => setIsPremiumModalVisible(false)} />
            <TransactionModal isOpen={isTransactionModalVisible} onClose={() => setIsTransactionModalVisible(false)} item={selectedMarketItem} />

            <div className="space-y-6">
                <div className="flex border-b border-gray-700">
                    <TabButton isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={FaBullhorn} label="Publicaciones" />
                    <TabButton isActive={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={FaShoppingBasket} label="Mercado" />
                    <TabButton isActive={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={FaStore} label="Ferias" />
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
                                <div className="space-y-4">{posts.length > 0 ? posts.map(post => <PostCard key={post.id} post={post} onFeature={handleFeaturePost} onContact={(email) => toast(`Contactando a ${email}`)} onReport={(id) => toast.error(`Reportando post ${id}`)} currentUserEmail={session?.user?.email} isPremium={isPremiumUser} />) : <p className="text-center text-gray-400 py-8">Todavía no hay publicaciones. ¡Sé el primero!</p>}</div>
                            </div>
                        )}
                        
                        {!isLoading && activeTab === 'market' && (
                           <div>
                                <form onSubmit={handleCreateMarketItem} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-3">
                                    <h3 className="font-bold text-lg text-white">Vender en el Mercado</h3>
                                    <input type="text" placeholder="Nombre del Producto o Servicio" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600" />
                                    <textarea placeholder="Descripción detallada" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full p-2 bg-gray-800 rounded-md border border-gray-600 h-20" />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-yellow-400"><FaCoins /></span>
                                            <input type="number" placeholder="Precio" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 pl-10 bg-gray-800 rounded-md border border-gray-600" />
                                        </div>
                                        <div className="flex items-center justify-center bg-gray-800 rounded-md border border-gray-600 px-3">
                                            <label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" checked={newItem.is_service} onChange={(e) => setNewItem({...newItem, is_service: e.target.checked})} className="form-checkbox h-5 w-5 text-green-500 bg-gray-900 border-gray-600 rounded" /> Es un Servicio</label>
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
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    );
}

