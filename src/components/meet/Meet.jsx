import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Realtime } from "ably";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Settings,
  MoreVertical,
  Hand // ⭐ Nuevo icono para Sign Recognition
} from 'lucide-react';
import Chat from "./Chat";
import { env } from '../../config/env';

// ⭐ NUEVO: Importar componentes de Sign Recognition
import { SignRecognitionEngine, ParticipantSignsDisplay } from '../signRecognition';
import { useSignRecognition } from '../../hooks/useSignRecognition';
import { ablySignService } from '../../services/signRecognition';

const APP_ID = "3807e6c8dfc4434faa3a57e3d67c6842";
const ABLY_KEY = "cCqgBQ.afR32Q:TlHR0hT_yKHMfHYCJU48MbRqlWkiGtmRdyGBYowc9cI";

export default function Meet({ meet }) {
    const navigate = useNavigate();
    const [joined, setJoined] = useState(false);
    const [name, setName] = useState("");
    const [uid, setUid] = useState("");
    const [remoteUsers, setRemoteUsers] = useState({});
    const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // ⭐ NUEVO: Estados para Sign Recognition
    const [signRecognitionEnabled, setSignRecognitionEnabled] = useState(false);
    const [ablySignChannel, setAblySignChannel] = useState(null);

    const localContainerRef = useRef(null);
    const clientRef = useRef(null);
    const isSafari =
        typeof navigator !== "undefined" &&
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // ⭐ NUEVO: Hook de Sign Recognition
    const {
        localSign,
        participantSigns,
        signHistory,
        stats,
        handleLocalSignDetected,
        clearHistory
    } = useSignRecognition({
        sessionId: meet?.uuid,
        userId: uid,
        ablyChannel: ablySignChannel
    });

    const waitForElement = async (selector, timeout = 3000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await new Promise((r) => requestAnimationFrame(r));
        }
        return null;
    };

    useEffect(() => {
        clientRef.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: isSafari ? "h264" : "vp8",
        });
        const client = clientRef.current;

        const syncRemoteUsers = () => {
            setRemoteUsers({ ...client.remoteUsers });
        };

        const onUserPublished = async (user, mediaType) => {
            try {
                await client.subscribe(user, mediaType);
            } catch (err) {
                console.error("subscribe error", err);
            }

            syncRemoteUsers();

            if (mediaType === "video") {
                const el = await waitForElement(`#video-slot-${user.uid}`);
                if (el && user.videoTrack) {
                    try {
                        user.videoTrack.play(el);
                    } catch (err) {
                        console.error("Error al reproducir video remoto:", err);
                    }
                }
            }

            if (mediaType === "audio" && user.audioTrack) {
                try {
                    user.audioTrack.play();
                } catch (err) {
                    console.error("Error al reproducir audio remoto:", err);
                }
            }
        };

        const onUserUnpublished = () => syncRemoteUsers();
        const onUserLeft = () => syncRemoteUsers();
        const onUserJoined = () => syncRemoteUsers();

        client.on("user-published", onUserPublished);
        client.on("user-unpublished", onUserUnpublished);
        client.on("user-left", onUserLeft);
        client.on("user-joined", onUserJoined);

        const poll = setInterval(() => syncRemoteUsers(), 2000);

        return () => {
            clearInterval(poll);
            client.removeAllListeners();
            (async () => {
                try {
                    const c = clientRef.current;
                    if (c) {
                        Object.values(c.remoteUsers || {}).forEach((u) => {
                            if (u.videoTrack) {
                                try {
                                    u.videoTrack.stop();
                                    u.videoTrack.close();
                                } catch (e) {
                                    console.error("Error closing video track", e);
                                }
                            }
                            if (u.audioTrack) {
                                try {
                                    u.audioTrack.stop();
                                    u.audioTrack.close();
                                } catch (e) {
                                    console.error("Error closing audio track", e);
                                }
                            }
                        });
                    }
                } catch (err) {
                    console.warn("cleanup error", err);
                }
            })();
        };
    }, [isSafari]);

    const waitForVisible = async (elRef, timeout = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = elRef.current;
            if (el && el.offsetParent !== null) return el;
            await new Promise((r) => requestAnimationFrame(r));
        }
        return elRef.current;
    };

    useEffect(() => {
        const tryPlayLocal = async () => {
            if (localTracks.video) {
                const el = await waitForVisible(localContainerRef, 2000);
                if (!el) return;
                try {
                    localTracks.video.play(el);
                } catch (err) {
                    console.error("Error reproducir track local:", err);
                }
            }
        };
        tryPlayLocal();
    }, [localTracks.video]);

    useEffect(() => {
        Object.values(remoteUsers).forEach(async (user) => {
            if (user.videoTrack) {
                const el = await waitForElement(`#video-slot-${user.uid}`);
                if (el) {
                    try {
                        user.videoTrack.play(el);
                    } catch (err) {
                        console.error("Reintento play remoto:", err);
                    }
                }
            }
        });
    }, [remoteUsers]);

    const joinMeet = async () => {
        if (!name.trim() && !uid.trim()) {
            alert("Por favor ingresa tu nombre");
            return;
        }

        const client = clientRef.current;

        if (!client) {
            alert("Client no inicializado");
            return;
        }

        setIsJoining(true);

        try {
            const tokenRequest = await fetch(env.API_URL_FRONTEND + `signa-token?channel=${meet.uuid}&uid=${uid}`);
            const tokenData = await tokenRequest.json();
            const rtcToken = tokenData.rtcToken;

            await client.join(APP_ID, meet.uuid, rtcToken, uid);

            let localAudioTrack = null;
            let localVideoTrack = null;

            try {
                [localAudioTrack, localVideoTrack] =
                    await AgoraRTC.createMicrophoneAndCameraTracks();
                setLocalTracks({ audio: localAudioTrack, video: localVideoTrack });
                await client.publish([localAudioTrack, localVideoTrack]);
            } catch (err) {
                console.warn("No se pudo crear cámara+mic:", err);
                localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                setLocalTracks({ audio: localAudioTrack, video: null });
                await client.publish([localAudioTrack]);
                alert("Entraste solo con audio (no se detectó cámara o denegaste permisos).");
            }

            setRemoteUsers({ ...client.remoteUsers });
            setJoined(true);
            
            // ⭐ NUEVO: Conectar Ably para Sign Recognition después de unirse
            try {
                const channel = await ablySignService.connect(ABLY_KEY, meet.uuid);
                setAblySignChannel(channel);
                console.log('✅ Ably Sign Recognition connected');
            } catch (err) {
                console.error('❌ Error connecting Ably for signs:', err);
            }
                
        } catch (err) {
            console.error("Error join:", err);
            alert("Error al unirse. Revisa consola.");
        } finally {
            setIsJoining(false);
        }
    };

    const leaveMeet = useCallback(async () => {
        const client = clientRef.current;

        try {
            if (!client) return;

            const toUnpub = [];
            if (localTracks.audio) toUnpub.push(localTracks.audio);
            if (localTracks.video) toUnpub.push(localTracks.video);
            if (toUnpub.length) await client.unpublish(toUnpub);

            if (localTracks.audio) {
                localTracks.audio.stop();
                localTracks.audio.close();
            }
            if (localTracks.video) {
                localTracks.video.stop();
                localTracks.video.close();
            }

            Object.values(client.remoteUsers || {}).forEach((u) => {
                if (u.audioTrack) u.audioTrack.stop();
                if (u.videoTrack) u.videoTrack.stop();
            });

            await client.leave();

            // ⭐ NUEVO: Desconectar Ably Sign Recognition
            ablySignService.disconnect();
            setAblySignChannel(null);

            setJoined(false);
            setRemoteUsers({});
            setLocalTracks({ audio: null, video: null });

            // Verificar si el usuario está autenticado (tiene token)
            const token = localStorage.getItem('token');
            if (token) {
                // Usuario autenticado (creador) - redirigir a Home
                navigate('/');
            }
            // Si no hay token, solo resetea el estado (vuelve a la pantalla de login)
        } catch (err) {
            console.error("leaveMeet error", err);
            // Si hay error, solo resetear estado (no redirigir)
            setJoined(false);
            setRemoteUsers({});
            setLocalTracks({ audio: null, video: null });
        }
    }, [localTracks, navigate]);

    // Suscripción a Ably para el chat (siempre activa cuando joined=true)
    useEffect(() => {
        if (!joined || !meet.uuid) return;

        let ablyClient = null;

        const initAbly = async () => {
            try {
                ablyClient = new Realtime({
                    key: ABLY_KEY,
                });

                const channel = ablyClient.channels.get(meet.uuid);

                const handleMessage = (msg) => {
                    let data;
                    try {
                        data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
                    } catch (error) {
                        console.error("Error parsing message:", error);
                        return;
                    }

                    // Si el mensaje no tiene tiempo, agregarlo
                    if (!data.time) {
                        data.time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    }

                    // Evitar duplicados
                    setMessages((prev) => {
                        // Verificar si ya existe un mensaje idéntico
                        const exists = prev.some(
                            m => m.uid === data.uid &&
                                 m.text === data.text &&
                                 m.time === data.time
                        );

                        if (exists) {
                            // Es duplicado, no hacer nada
                            return prev;
                        }

                        // Es un mensaje nuevo
                        // Marcar como no leído solo si NO es del usuario actual y el chat está cerrado
                        if (data.uid !== uid) {
                            setShowChat((currentShowChat) => {
                                if (!currentShowChat) {
                                    setHasUnread(true);
                                }
                                return currentShowChat;
                            });
                        }

                        return [...prev, data];
                    });
                };

                channel.subscribe("message", handleMessage);
            } catch (error) {
                console.error("Error al conectar con Ably:", error);
            }
        };

        initAbly();

        return () => {
            if (ablyClient) {
                const channel = ablyClient.channels.get(meet.uuid);
                channel.unsubscribe();
                ablyClient.close();
            }
        };
    }, [joined, meet.uuid, uid]);

    useEffect(() => {
        const handleBeforeUnload = async () => {
            try {
                await leaveMeet();
            } catch (e) {
                console.error(e);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [leaveMeet]);

    const toggleCamera = async () => {
        const { video } = localTracks;
        if (!video) {
            alert("No tienes cámara disponible o no se detectó.");
            return;
        }

        try {
            if (cameraEnabled) {
                await video.setEnabled(false);
            } else {
                await video.setEnabled(true);
            }
            setCameraEnabled(!cameraEnabled);
        } catch (err) {
            console.error("Error al alternar cámara:", err);
        }
    };

    const toggleMic = async () => {
        const { audio } = localTracks;
        if (!audio) {
            alert("No tienes micrófono disponible o no se detectó.");
            return;
        }

        try {
            if (micEnabled) {
                await audio.setEnabled(false);
            } else {
                await audio.setEnabled(true);
            }
            setMicEnabled(!micEnabled);
        } catch (err) {
            console.error("Error al alternar micrófono:", err);
        }
    };

    const toggleChat = () => {
        if (!showChat) {
            // Al abrir el chat, marcar todos como leídos
            setHasUnread(false);
        }
        setShowChat(!showChat);
    };

    // ⭐ NUEVO: Toggle para Sign Recognition
    const toggleSignRecognition = () => {
        if (!localTracks.video) {
            alert("Necesitas tener la cámara activa para usar reconocimiento de señas");
            return;
        }
        setSignRecognitionEnabled(!signRecognitionEnabled);
    };

    const handleLogin = async (name) => {
        const uid = String(Math.floor(Math.random() * 2032));
        setUid(uid);
        setName(name);
    };

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
            {!joined ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-96">
                        <h1 className="text-3xl font-bold text-orange-500 mb-6 text-center">
                            Unirse al Meet
                        </h1>
                        <input
                            type="text"
                            placeholder="Tu nombre"
                            value={name}
                            onChange={(e) => handleLogin(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isJoining && joinMeet()}
                            disabled={isJoining}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg mb-4 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={joinMeet}
                            disabled={isJoining}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isJoining ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Ingresando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="bg-gray-900 px-6 py-3 flex items-center justify-between border-b border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium">En vivo</span>
                            </div>
                            <span className="text-sm text-gray-400">{meet.uuid}</span>
                            {/* ⭐ NUEVO: Indicador de Sign Recognition */}
                            {signRecognitionEnabled && (
                                <div className="flex items-center gap-2 bg-green-600 px-3 py-1 rounded-full">
                                    <Hand size={14} />
                                    <span className="text-xs font-medium">IA Activa</span>
                                </div>
                            )}
                        </div>
                        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                            <MoreVertical size={20} />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Video Area */}
                        <div className="flex-1 relative p-4">
                            <div className="grid gap-4 w-full h-full" style={{
                                gridTemplateColumns: Object.keys(remoteUsers).length === 0 ? '1fr' :
                                                     Object.keys(remoteUsers).length === 1 ? 'repeat(2, 1fr)' :
                                                     'repeat(auto-fit, minmax(400px, 1fr))'
                            }}>
                                {/* Video local */}
                                <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                                    <div
                                        ref={localContainerRef}
                                        className="w-full h-full"
                                    >
                                        {!localTracks.video && (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-2xl font-bold">
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-gray-400">Cámara apagada</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ⭐ NUEVO: Sign Recognition Engine Overlay */}
                                    {signRecognitionEnabled && localTracks.video && (
                                        <SignRecognitionEngine
                                            videoTrack={localTracks.video}
                                            sessionId={meet.uuid}
                                            userId={uid}
                                            onSignDetected={handleLocalSignDetected}
                                            isEnabled={signRecognitionEnabled}
                                        />
                                    )}

                                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg flex items-center gap-2">
                                        <span className="text-sm font-medium">{name} (Tú)</span>
                                        {!micEnabled && <MicOff size={16} className="text-red-500" />}
                                    </div>
                                </div>

                                {/* Videos remotos */}
                                {Object.values(remoteUsers).map((user) => (
                                    <div
                                        key={user.uid}
                                        className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
                                    >
                                        <div
                                            id={`video-slot-${user.uid}`}
                                            className="w-full h-full"
                                        >
                                            {!user.videoTrack && (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-2xl font-bold">
                                                            U
                                                        </div>
                                                        <span className="text-gray-400">Cámara apagada</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg">
                                            <span className="text-sm font-medium">Usuario {user.uid}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ⭐ NUEVO: Display de señas de participantes */}
                            <ParticipantSignsDisplay
                                participantSigns={participantSigns}
                                currentUserId={uid}
                            />
                        </div>

                        {/* Chat Sidebar */}
                        {showChat && (
                            <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
                                <Chat
                                    uid={uid}
                                    name={name}
                                    channel={meet.uuid}
                                    id={meet.id}
                                    messages={messages}
                                    onClose={() => setShowChat(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Bottom Controls */}
                    <div className="bg-gray-900 px-6 py-4 border-t border-gray-800">
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={toggleMic}
                                className={`p-4 rounded-full transition-all ${
                                    micEnabled
                                        ? 'bg-gray-800 hover:bg-gray-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                            </button>

                            <button
                                onClick={toggleCamera}
                                className={`p-4 rounded-full transition-all ${
                                    cameraEnabled
                                        ? 'bg-gray-800 hover:bg-gray-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {cameraEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                            </button>

                            <button
                                onClick={leaveMeet}
                                className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                            >
                                <PhoneOff size={24} />
                            </button>

                            <button
                                onClick={toggleChat}
                                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors relative"
                            >
                                <MessageSquare size={24} />
                                {hasUnread && !showChat && (
                                    <div className="absolute top-1 right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>     
                                )}
                            </button>

                            {/* ⭐ NUEVO: Botón de Sign Recognition */}
                            <button
                                onClick={toggleSignRecognition}
                                className={`p-4 rounded-full transition-all ${
                                    signRecognitionEnabled
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-gray-800 hover:bg-gray-700'
                                }`}
                                title={signRecognitionEnabled ? 'Desactivar reconocimiento de señas' : 'Activar reconocimiento de señas'}
                            >
                                <Hand size={24} />
                            </button>

                            <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                                <Settings size={24} />
                            </button>
                        </div>
                    </div>

                    <style>{`
                        [ref="localContainerRef"] video {
                            width: 100% !important;
                            height: 100% !important;
                            object-fit: cover;
                            transform: scaleX(-1);
                        }
                        [id^="video-slot-"] video {
                            width: 100% !important;
                            height: 100% !important;
                            object-fit: cover;
                        }
                    `}</style>
                </>
            )}
        </div>
    );
}
