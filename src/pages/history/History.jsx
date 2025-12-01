import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Eye, AlertCircle, Crown, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { historyService } from '../../services/api/history.service';
import { planService } from '../../services/api/plan.service';
import HistorySearch from './HistorySearch';
import MeetDetail from './MeetDetail';

export default function History() {
  const navigate = useNavigate();
  const [meets, setMeets] = useState([]);
  const [filteredMeets, setFilteredMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [selectedMeet, setSelectedMeet] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    searchTerm: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    checkPremiumAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, meets]);

  const checkPremiumAndLoad = async () => {
    try {
      setLoading(true);
      const plan = await planService.getCurrentPlan().catch(() => null);
      const premium = plan?.planType === 'PREMIUM' && plan?.active;
      setIsPremium(true);

      // if (!premium) {
      //   toast.warning('Necesitas una cuenta Premium para acceder al historial');
      //   navigate('/plans');
      //   return;
      // }

      await loadHistory();
    } catch {
      toast.error('Error al verificar el plan');
      navigate('/plans');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      // Datos simulados para pruebas (comentar/descomentar según necesites)
      const mockData = [
        {
          id: 1,
          uuid: 'abc123-def456-ghi789',
          createdAt: '2024-11-26T10:30:00Z',
          endSessionTime: '2024-11-26T11:15:00Z',
          isActive: false,
          messageCount: 5,
          messages: [
            {
              id: 1,
              senderName: 'Juan Pérez',
              messageType: 'CHAT',
              content: 'Hola, ¿cómo están todos?',
              sentAt: '2024-11-26T10:31:00Z'
            },
            {
              id: 2,
              senderName: 'María López',
              messageType: 'SIGN',
              content: 'Buenos días, estoy usando lenguaje de señas',
              sentAt: '2024-11-26T10:32:00Z'
            },
            {
              id: 3,
              senderName: 'Sistema',
              messageType: 'SUBTITLE',
              content: 'Subtítulo generado automáticamente para esta reunión',
              sentAt: '2024-11-26T10:33:00Z'
            },
            {
              id: 4,
              senderName: 'Carlos Ruiz',
              messageType: 'CHAT',
              content: 'Perfecto, todos conectados',
              sentAt: '2024-11-26T10:35:00Z'
            },
            {
              id: 5,
              senderName: 'Juan Pérez',
              messageType: 'CHAT',
              content: 'Excelente, comencemos con la reunión',
              sentAt: '2024-11-26T10:36:00Z'
            }
          ]
        },
        {
          id: 2,
          uuid: 'xyz789-uvw456-rst123',
          createdAt: '2024-11-25T14:20:00Z',
          endSessionTime: '2024-11-25T15:45:00Z',
          isActive: false,
          messageCount: 3,
          messages: [
            {
              id: 6,
              senderName: 'Ana García',
              messageType: 'SIGN',
              content: 'Hola equipo, usando señas para comunicarme',
              sentAt: '2024-11-25T14:21:00Z'
            },
            {
              id: 7,
              senderName: 'Pedro Sánchez',
              messageType: 'CHAT',
              content: 'Entendido, gracias por la información',
              sentAt: '2024-11-25T14:25:00Z'
            },
            {
              id: 8,
              senderName: 'Sistema',
              messageType: 'SUBTITLE',
              content: 'Esta es una transcripción automática del audio',
              sentAt: '2024-11-25T14:30:00Z'
            }
          ]
        },
        {
          id: 3,
          uuid: 'lmn456-opq789-abc012',
          createdAt: '2024-11-26T09:00:00Z',
          endSessionTime: null,
          isActive: true,
          messageCount: 7,
          messages: [
            {
              id: 9,
              senderName: 'Laura Martínez',
              messageType: 'CHAT',
              content: 'Buenos días a todos',
              sentAt: '2024-11-26T09:01:00Z'
            },
            {
              id: 10,
              senderName: 'Roberto Torres',
              messageType: 'SIGN',
              content: 'Saludos desde el lenguaje de señas',
              sentAt: '2024-11-26T09:02:00Z'
            },
            {
              id: 11,
              senderName: 'Sistema',
              messageType: 'SUBTITLE',
              content: 'Iniciando transcripción de audio en tiempo real',
              sentAt: '2024-11-26T09:03:00Z'
            },
            {
              id: 12,
              senderName: 'Laura Martínez',
              messageType: 'CHAT',
              content: 'Vamos a discutir los puntos del proyecto',
              sentAt: '2024-11-26T09:05:00Z'
            },
            {
              id: 13,
              senderName: 'Roberto Torres',
              messageType: 'CHAT',
              content: 'Perfecto, estoy listo para comenzar',
              sentAt: '2024-11-26T09:06:00Z'
            },
            {
              id: 14,
              senderName: 'Sofía Ramírez',
              messageType: 'SIGN',
              content: 'También estoy conectada por señas',
              sentAt: '2024-11-26T09:07:00Z'
            },
            {
              id: 15,
              senderName: 'Laura Martínez',
              messageType: 'CHAT',
              content: 'Excelente, todos presentes',
              sentAt: '2024-11-26T09:08:00Z'
            }
          ]
        }
      ];

      // Descomentar esta línea para usar datos reales del backend
      const data = await historyService.getHistory();
      
      // Usar datos simulados
      // const data = mockData;
      
      setMeets(data || []);
      setFilteredMeets(data || []);
    } catch {
      toast.error('Error al cargar el historial');
      setMeets([]);
      setFilteredMeets([]);
    }
  };

  // Aplicar todos los filtros combinados
  const applyFilters = () => {
    let filtered = [...meets];

    // Filtro por palabra clave
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((meet) => {
        const hasInMessages = meet.messages?.some(
          (msg) =>
            msg.content?.toLowerCase().includes(searchLower) ||
            msg.senderName?.toLowerCase().includes(searchLower)
        );
        return hasInMessages;
      });
    }

    // Filtro por fechas
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((meet) => {
        const meetDate = new Date(meet.createdAt);
        
        // Extraer solo la fecha (sin hora) del meet para comparar
        const meetDateOnly = new Date(meetDate.getFullYear(), meetDate.getMonth(), meetDate.getDate());
        
        let start = null;
        let end = null;
        
        if (filters.startDate) {
          // Crear fecha desde el string YYYY-MM-DD
          const [year, month, day] = filters.startDate.split('-').map(Number);
          start = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
        }
        
        if (filters.endDate) {
          const [year, month, day] = filters.endDate.split('-').map(Number);
          end = new Date(year, month - 1, day);
        }

        if (start && end) {
          return meetDateOnly >= start && meetDateOnly <= end;
        }
        if (start) {
          return meetDateOnly >= start;
        }
        if (end) {
          return meetDateOnly <= end;
        }
        return true;
      });
    }

    setFilteredMeets(filtered);
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const handleDateFilter = ({ startDate, endDate }) => {
    setFilters(prev => ({ ...prev, startDate, endDate }));
  };

  const handleViewMeet = (meetId) => {
    // Buscar el meet en el array local ya que no hay endpoint individual
    const meetData = meets.find(m => m.id === meetId);
    if (meetData) {
      setSelectedMeet(meetData);
    } else {
      toast.error('No se pudo encontrar el detalle del meet');
    }
  };

  const handleDeleteAllHistory = async () => {
    try {
      await historyService.deleteAllHistory();
      toast.success('Historial eliminado completamente');
      setShowDeleteConfirm(null);
      await loadHistory();
    } catch {
      toast.error('Error al eliminar el historial');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadHistory();
      toast.success('Historial actualizado');
    } catch {
      toast.error('Error al actualizar el historial');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    // Asegurar que la fecha tenga "Z" para indicar UTC
    const isoString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(isoString);
    // Ajustar a hora de Perú (UTC-5)
    const peruDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
    return peruDate.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
        <div className="card rounded-2xl shadow-md p-8 max-w-md text-center">
          <Crown className="text-orange-500 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-4">Función Premium</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            El historial de conversaciones solo está disponible para usuarios Premium.
          </p>
          <button
            onClick={() => navigate('/plans')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Ver Planes Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Historial de Conversaciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Revisa todas tus conversaciones anteriores
          </p>
        </div>

        <HistorySearch onSearch={handleSearch} onDateFilter={handleDateFilter} />

        {/* Indicador de filtros activos */}
        {(filters.searchTerm || filters.startDate || filters.endDate) && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <AlertCircle size={16} className="inline mr-1" />
              {filteredMeets.length} resultado(s) encontrado(s)
              {filters.searchTerm && ` con "${filters.searchTerm}"`}
              {filters.startDate && ` desde ${filters.startDate.split('-').reverse().join('/')}`}
              {filters.endDate && ` hasta ${filters.endDate.split('-').reverse().join('/')}`}
            </p>
          </div>
        )}

        {filteredMeets.length === 0 ? (
          <div className="card rounded-2xl shadow-md p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {meets.length === 0 
                ? 'Aún no tienes conversaciones guardadas'
                : 'No se encontraron resultados con los filtros aplicados'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {filteredMeets.length} conversación(es)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
                {meets.length > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm('all')}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <Trash2 size={16} />
                    Eliminar todo el historial
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMeets.map((meet) => (
                <div
                  key={meet.id}
                  className="card rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      📅 {formatDate(meet.createdAt)}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                        meet.isActive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {meet.isActive 
                          ? '🟢 Activa' 
                          : `⚫ Finalizada${meet.endSessionTime ? `: ${(() => {
                              const isoString = meet.endSessionTime.endsWith('Z') ? meet.endSessionTime : meet.endSessionTime + 'Z';
                              const date = new Date(isoString);
                              const peruDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
                              return peruDate.toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'UTC'
                              });
                            })()}` : ''}`
                        }
                        {meet.isActive && (
                          <button
                            onClick={() => window.open(`/meet/${meet.uuid}`, '_blank')}
                            className="hover:opacity-70 transition-opacity"
                            title="Abrir sala activa"
                          >
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    💬 {meet.messageCount} mensaje(s)
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewMeet(meet.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      <Eye size={16} />
                      Ver detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedMeet && (
          <MeetDetail meet={selectedMeet} onClose={() => setSelectedMeet(null)} />
        )}

        {showDeleteConfirm === 'all' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <AlertCircle size={24} />
                <h3 className="text-xl font-bold">Confirmar eliminación</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                ¿Estás seguro de que deseas eliminar <strong>TODO</strong> tu historial de conversaciones? 
                Esta acción no se puede deshacer y perderás todas tus conversaciones guardadas.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAllHistory}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Sí, eliminar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}