import { useState, useEffect, useRef, useContext } from 'react';
import { Form, Button, Card, Spinner, Badge } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

export default function ChatWindow({ bikeId }) {
    const { user, API_URL } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true); 
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    // --- 1. Fetch Chat History ---
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                // Ensure your backend route is set up to return populated messages
                const res = await axios.get(`${API_URL}/chat/history/${bikeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);
            } catch (err) {
                console.error("Failed to load chat history:", err);
            } finally {
                setLoading(false);
            }
        };

        if (bikeId && API_URL) {
            fetchHistory();
        }
    }, [bikeId, API_URL]);

    // --- 2. WebSocket Connection ---
    useEffect(() => {
        ws.current = new WebSocket('ws://localhost:4000');

        ws.current.onopen = () => {
            console.log('Connected to Chat');
            ws.current.send(JSON.stringify({ type: 'join_chat', bikeId }));
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                setMessages(prev => [...prev, message]);
            } catch (err) {
                console.error("Failed to parse message", err);
            }
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [bikeId]);

    // --- 3. Auto-scroll to bottom ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // --- 4. Send Message ---
    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Use the most robust ID available for the sender
        const senderId = user.id || user.userId || user._id || user.email;

        const msgData = {
            type: 'chat',
            bikeId,
            sender: senderId, 
            message: input,
            // We rely on the server to timestamp, but this helps instant UI if needed
        };

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msgData));
            setInput('');
        } else {
            console.error("Chat disconnected. Refresh page.");
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) => {
        return name && typeof name === 'string' ? name.charAt(0).toUpperCase() : '?';
    };

    return (
        <Card className="h-100 shadow border-0" style={{ overflow: 'hidden' }}>
            {/* HEADER */}
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-success rounded-circle border border-white" style={{ width: '10px', height: '10px' }}></div>
                    <span className="fw-bold">Live Chat</span>
                </div>
                <small className="opacity-75">Ref: {bikeId?.slice(-4).toUpperCase()}</small>
            </Card.Header>

            {/* BODY */}
            <Card.Body className="overflow-auto bg-light d-flex flex-column" style={{ height: '350px' }}>
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {messages.map((msg, i) => {
                            // Logic to extract Sender Name & ID safely
                            // msg.sender might be an object (populated) or a string (ID)
                            const senderObj = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender : {};
                            const senderId = senderObj._id || msg.sender;
                            const senderName = senderObj.username || 'User';

                            // Robust "Is Me" check against all possible user identifiers
                            const isMe = (senderId === user.id) || 
                                         (senderId === user.userId) || 
                                         (senderId === user._id) ||
                                         (senderId === user.email);

                            // SYSTEM MESSAGE
                            if (msg.system) {
                                return (
                                    <div key={i} className="text-center my-2">
                                        <Badge bg="secondary" className="fw-normal px-3 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                                            {msg.message}
                                        </Badge>
                                    </div>
                                );
                            }

                            // USER MESSAGE
                            return (
                                <div key={i} className={`d-flex w-100 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                    
                                    {/* Avatar (Left side, only for others) */}
                                    {!isMe && (
                                        <div className="me-2 d-flex align-items-end">
                                            <div 
                                                className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                                                style={{ width: '30px', height: '30px', fontSize: '0.8rem', flexShrink: 0 }}
                                            >
                                                {getInitials(senderName)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Message Bubble */}
                                    <div 
                                        className={`p-3 shadow-sm position-relative ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                                        style={{ 
                                            maxWidth: '75%', 
                                            borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0',
                                            minWidth: '100px',
                                            wordWrap: 'break-word'
                                        }}
                                    >
                                        {/* Sender Name (Only for others) */}
                                        {!isMe && (
                                            <div className="fw-bold text-primary mb-1" style={{ fontSize: '0.75rem' }}>
                                                {senderName}
                                            </div>
                                        )}

                                        <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.message}</div>
                                        
                                        <div className={`text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem' }}>
                                            {formatTime(msg.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </Card.Body>

            {/* FOOTER */}
            <Card.Footer className="bg-white border-top p-3">
                <Form onSubmit={sendMessage} className="d-flex gap-2 align-items-center">
                    <Form.Control 
                        type="text" 
                        placeholder="Type a message..." 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="rounded-pill bg-light border-0 px-3"
                        style={{ boxShadow: 'none' }}
                    />
                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '40px', height: '40px' }}
                        disabled={!input.trim()}
                    >
                        ➤
                    </Button>
                </Form>
            </Card.Footer>
        </Card>
    );
}