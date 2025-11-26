import { useEffect, useState, useRef } from "react";
import { meetService } from '../../services/api/meet.service';
import { env } from '../../config/env';

export default function Chat({ uid, name, channel, id, messages, onClose }) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const currentTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Datos para Ably (tiempo real)
        const ablyMessageData = {
            uid,
            name,
            text: input,
            meet: channel,
            time: currentTime
        };

        // Datos para el backend (persistencia)
        const backendMessageData = {
            senderName: name,
            content: input,
            messageType: "CHAT"
        };

        // Limpiar input inmediatamente para mejor UX
        setInput("");

        try {
            // 1. Guardar en la base de datos usando el endpoint correcto
            await meetService.addMessage(id, backendMessageData);

            // 2. Enviar a Ably para notificación en tiempo real (opcional, depende de tu backend)
            // Si el backend ya publica a Ably, puedes comentar esta línea
            await fetch(env.API_URL_FRONTEND + "send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ablyMessageData),
            });
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            // Opcional: mostrar un toast de error
        }
    };

    return (
        <>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold">Chat</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${
                            msg.uid === uid ? 'ml-auto' : 'mr-auto'
                        } max-w-[80%]`}
                    >
                        <div className={`rounded-lg p-3 ${
                            msg.uid === uid 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-gray-800'
                        }`}>
                            <div className="text-xs opacity-75 mb-1">{msg.name}</div>
                            <div className="text-sm">{msg.text}</div>
                            <div className="text-xs opacity-50 mt-1">{msg.time}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-3 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                    />
                    <button
                        onClick={sendMessage}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </>
    );
}