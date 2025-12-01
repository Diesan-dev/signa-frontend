import { MessageCircle, Hand, Subtitles, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * Componente para mostrar el detalle de un meet con sus mensajes
 */
export default function MeetDetail({ meet, onClose }) {
  if (!meet) return null;

  const getMessageIcon = (type) => {
    switch (type) {
      case 'SIGN':
      case 'seña':
        return <Hand size={16} className="text-orange-500" />;
      case 'SUBTITLE':
      case 'subtitulo':
        return <Subtitles size={16} className="text-blue-500" />;
      case 'CHAT':
      case 'chat':
      default:
        return <MessageCircle size={16} className="text-green-500" />;
    }
  };

  const getMessageTypeLabel = (type) => {
    switch (type) {
      case 'SIGN':
      case 'seña':
        return 'Seña';
      case 'SUBTITLE':
      case 'subtitulo':
        return 'Subtítulo';
      case 'CHAT':
      case 'chat':
      default:
        return 'Chat';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    // Asegurar que la fecha tenga "Z" para indicar UTC
    const isoString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(isoString);
    // Ajustar a hora de Perú (UTC-5)
    const peruDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
    return peruDate.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  const handleCopyUrl = async () => {
    const meetUrl = `${window.location.origin}/meet/${meet.uuid}`;
    try {
      await navigator.clipboard.writeText(meetUrl);
      toast.success('Enlace copiado al portapapeles', { toastId: 'history-url-copied' });
    } catch {
      toast.error('Error al copiar el enlace', { toastId: 'history-copy-error' });
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(meet.uuid);
      toast.success('ID copiado al portapapeles', { toastId: 'history-id-copied' });
    } catch {
      toast.error('Error al copiar el ID', { toastId: 'history-id-copy-error' });
    }
  };

  const handleOpenMeet = () => {
    window.open(`/meet/${meet.uuid}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-orange-500 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Detalle del Meet</h2>
              <p className="text-orange-100">{formatDateTime(meet.createdAt)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-orange-600 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ID de la sala */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-orange-100 text-sm font-medium">ID de la sala:</span>
              <span className="text-white font-mono text-sm">{meet.uuid}</span>
              <button
                onClick={handleCopyId}
                className="text-orange-100 hover:text-white transition-colors p-1"
                title="Copiar ID"
              >
                <Copy size={16} />
              </button>
            </div>

            {/* URL de la sala */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-orange-100 text-sm font-medium">URL:</span>
              <span className="text-white text-sm font-mono break-all">
                {window.location.origin}/meet/{meet.uuid}
              </span>
              <button
                onClick={handleCopyUrl}
                className="text-orange-100 hover:text-white transition-colors p-1"
                title="Copiar URL"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Estado */}
          <div className="mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1.5 ${
              meet.isActive 
                ? 'bg-green-400 text-white' 
                : 'bg-orange-200 text-orange-900'
            }`}>
              {meet.isActive 
                ? '🟢 Sesión Activa' 
                : `⚫ Sesión Finalizada a las ${meet.endSessionTime ? ` ${(() => {
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
                  onClick={handleOpenMeet}
                  className="hover:opacity-70 transition-opacity"
                  title="Abrir sala"
                >
                  <ExternalLink size={14} />
                </button>
              )}
            </span>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-6">
          {!meet.messages || meet.messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay mensajes en esta conversación
            </div>
          ) : (
            <div className="space-y-4">
              {meet.messages.map((message, idx) => (
                <div
                  key={message.id || idx}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {message.senderName || 'Usuario'}
                      </span>
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs text-black">
                        {getMessageIcon(message.messageType)}
                        <span>{getMessageTypeLabel(message.messageType)}</span>
                      </div>
                    </div>
                    {message.sentAt && (
                      <span className="text-xs text-gray-500">
                        {(() => {
                          const isoString = message.sentAt.endsWith('Z') ? message.sentAt : message.sentAt + 'Z';
                          const date = new Date(isoString);
                          const peruDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
                          return peruDate.toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC'
                          });
                        })()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap wrap-break-word">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
