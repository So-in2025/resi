'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { FaBullhorn, FaPlus, FaStar, FaStore, FaUsers } from 'react-icons/fa';

// --- Interfaces para los datos de la comunidad ---
interface CommunityPost {
  id: number;
  title: string;
  content: string;
  category: string;
  user_email: string;
  created_at: string;
  is_featured: boolean;
}

const TabButton = ({ isActive, onClick, icon: Icon, label }: { isActive: boolean; onClick: () => void; icon: React.ElementType; label: string; }) => (
    <button
        onClick={onClick}
        className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors duration-200 rounded-t-lg ${
            isActive 
                ? 'bg-gray-700 text-green-400 border-b-2 border-green-400' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'
        }`}
    >
        <Icon />
        <span className="font-semibold">{label}</span>
    </button>
);

const PostCard = ({ post }: { post: CommunityPost }) => (
    <div className={`bg-gray-700 rounded-lg p-4 border-2 ${post.is_featured ? 'border-yellow-400 shadow-lg' : 'border-transparent'}`}>
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-white text-lg">{post.title}</h4>
                <p className="text-xs text-gray-400">por {post.user_email.split('@')[0]} - {new Date(post.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            {post.is_featured && <FaStar className="text-yellow-400" title="Publicación Destacada" />}
        </div>
        <p className="text-gray-300 mt-2">{post.content}</p>
        <div className="mt-3">
            <span className="text-xs font-semibold bg-green-800 text-green-300 px-2 py-1 rounded-full">{post.category}</span>
        </div>
    </div>
);


export default function CommunityModule() {
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado para el formulario de nueva publicación
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostCategory, setNewPostCategory] = useState('General');

    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/community/posts');
            setPosts(response.data);
        } catch (error) {
            console.error("Error al cargar las publicaciones:", error);
            toast.error("No se pudieron cargar las publicaciones.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'posts') {
            fetchPosts();
        }
    }, [activeTab, fetchPosts]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) {
            toast.error("Debes iniciar sesión para publicar.");
            return;
        }
        if (!newPostTitle || !newPostContent) {
            toast.error("El título y el contenido no pueden estar vacíos.");
            return;
        }

        const toastId = toast.loading("Publicando...");
        try {
            await apiClient.post('/community/posts', {
                title: newPostTitle,
                content: newPostContent,
                category: newPostCategory,
            }, {
                headers: { 'Authorization': `Bearer ${session.user?.email}` }
            });
            toast.success("Publicación creada con éxito.", { id: toastId });
            setNewPostTitle('');
            setNewPostContent('');
            fetchPosts(); // Recargar las publicaciones
        } catch (error: any) {
            const detail = error.response?.data?.detail || "No se pudo crear la publicación.";
            toast.error(detail, { id: toastId });
        }
    };
    
    if (status === 'unauthenticated') {
        return (
            <div className="text-center p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Conectá con la Comunidad Resi</h3>
                <p className="text-gray-300 mb-6">Iniciá sesión para intercambiar productos, ofrecer tus servicios y participar en ferias locales.</p>
                <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
                    Ingresar para participar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-700">
                <TabButton isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={FaBullhorn} label="Publicaciones" />
                <TabButton isActive={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={FaStore} label="Ferias y Trueque" />
            </div>

            {activeTab === 'posts' && (
                <div>
                    <form onSubmit={handleCreatePost} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-3">
                        <h3 className="font-bold text-lg text-white">Crear una nueva publicación</h3>
                        <input 
                            type="text"
                            placeholder="Título de tu publicación"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                            className="w-full p-2 bg-gray-800 rounded-md border border-gray-600"
                        />
                        <textarea 
                            placeholder="¿Qué quieres ofrecer, buscar o promocionar?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            className="w-full p-2 bg-gray-800 rounded-md border border-gray-600 h-24"
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select value={newPostCategory} onChange={(e) => setNewPostCategory(e.target.value)} className="flex-1 p-2 bg-gray-800 rounded-md border border-gray-600">
                                <option>General</option>
                                <option>Cultivo</option>
                                <option>Emprendimiento</option>
                                <option>Trueque</option>
                                <option>Recetas</option>
                            </select>
                            <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2">
                                <FaPlus /> Publicar
                            </button>
                        </div>
                    </form>

                    {isLoading ? (
                        <p className="text-center">Cargando publicaciones...</p>
                    ) : (
                        <div className="space-y-4">
                            {posts.length > 0 ? (
                                posts.map(post => <PostCard key={post.id} post={post} />)
                            ) : (
                                <p className="text-center text-gray-400 py-8">Todavía no hay publicaciones. ¡Sé el primero!</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'events' && (
                <div className="text-center text-gray-400 py-16">
                    <FaUsers size={48} className="mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-bold text-white">Mapa de Ferias y Trueques</h3>
                    <p>Próximamente aquí podrás ver y registrar eventos en tu comunidad.</p>
                </div>
            )}
        </div>
    );
}