import { Container, Row, Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaPaperPlane, FaTrash, FaPlus } from 'react-icons/fa';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';
import { ThemeContext } from '../App';
import { marked } from 'marked';
import './style.css';

function ChatBox() {
    const { darkMode, setDarkMode } = useContext(ThemeContext);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [chats, setChats] = useState({});
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const waitingReplyRef = useRef({});
    const activeThreadRef = useRef(null);

    const createThreadAsync = async () => {
        try {
            const response = await fetch(' http://localhost:7151/api/CreateThread');
            if (!response.ok) throw new Error(response.status + response.statusText);
            const data = await response.json();
            return data.threadId;
        } catch (error) {
            console.error('Failed to create thread:', error);
        }
    };

    const deleteThreadAsync = async (threadId) => {
        try {
            await fetch(`http://localhost:7151/api/DeleteThread`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "threadId": threadId, "prompt": "" })
            });
        } catch (error) {
            console.error('Failed to delete thread:', error);
        }
    };

    const createNewChatAsync = async () => {
        const threadId = await createThreadAsync();
        setChats(prevChats => ({
            ...prevChats,
            [threadId]: []
        }));
        selectChat(threadId);
    };

    const deleteChatAsync = async (threadId) => {
        setChats(prevChats => {
            const { [threadId]: removed, ...remaining } = prevChats;
            
            if (threadId === activeThreadRef.current) {
                const remainingThreads = Object.keys(remaining);
                activeThreadRef.current = remainingThreads[0];
                setTimeout(() => {
                    selectChat(remainingThreads[0]);
                }, 0);
            }
            
            return remaining;
        });

        await deleteThreadAsync(threadId);
    };

    const selectChat = (threadId) => {
        activeThreadRef.current = threadId;
        setMessages(chats[threadId] || []);
    };

    useEffect(() => {
        let isMounted = true;

        const initializeChat = async () => {
            if (Object.keys(chats).length === 0) {
                const threadId = await createThreadAsync();
                if (isMounted) {
                    setChats(prevChats => {
                        // Only create a new chat if there are no chats
                        if (Object.keys(prevChats).length === 0) {
                            const newChats = { [threadId]: [] };
                            activeThreadRef.current = threadId;
                
                            return newChats;
                        }
                        return prevChats;
                    });
                }
            }
        };

        initializeChat();

        return () => {
            isMounted = false;
        };
    });

    useEffect(() => {
        if (activeThreadRef.current && messages.length > 0) {
            setChats(prevChats => ({
                ...prevChats,
                [activeThreadRef.current]: [...messages]
            }));
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const scrollContainer = chatContainerRef.current.querySelector('.messages-container');
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const updateMessages = (newMessages, threadId) => {
        setChats(prevChats => {
            const targetChat = prevChats[threadId];

            if (!targetChat) {
                return prevChats;
            }
            
            const filteredMessages = targetChat.filter(msg => !msg.isLoading);
            
            return {
                ...prevChats,
                [threadId]: [...filteredMessages, ...newMessages]
            };
        });

        if (threadId === activeThreadRef.current) {
            setMessages(prevMessages => {
                const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
                return [...filteredMessages, ...newMessages];
            });
        }
    };

    const handleActionAsync = async (action, url, threadId) => {
        try {
            const tempMessage = { text: '', type: 'assistant', isLoading: true };
            setMessages(prev => [...prev, tempMessage]);

            waitingReplyRef.current[threadId] = true;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    threadId: threadId,
                    prompt: action 
                })
            });

            if (!response.ok) throw new Error(response.status + response.statusText);

            const data = await response.json();
            const responses = [];

            data.messages.forEach(message => {
                const isPending = message.startsWith('The following actions will be performed:');
                responses.push({ text: message, type: 'assistant', isPending: isPending });
            });

            updateMessages(responses, threadId);
        } catch (error) {
            updateMessages([{ 
                text: `An error occurred while processing your request: ${error}`, 
                type: 'assistant' 
            }], threadId);
        } finally {
            waitingReplyRef.current[threadId] = false;
        }
    };

    const handleSubmitAsync = async (event) => {
        event.preventDefault();
        const action = inputMessage.trim();
        if (action) {
            const threadId = activeThreadRef.current;
            const serverUrl = 'http://localhost:7151/api/InvokeAssistant';

            if (messages.length > 0 && messages[messages.length - 1].isPending) {
                messages[messages.length - 1].isPending = false;
                setMessages([...messages]);
            }
            
            setMessages([...messages, { text: inputMessage, type: 'user' }]);
            setInputMessage('');
            await handleActionAsync(action, serverUrl, threadId);
        }
    };

    const handleConfirmActionAsync = async (action) => {
        const threadId = activeThreadRef.current;
        const serverUrl = 'http://localhost:7151/api/ConfirmAction';

        messages[messages.length - 1].isPending = false;
        setMessages([...messages]);
        await handleActionAsync(action, serverUrl, threadId);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const scrollPosition = window.scrollY;
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
            if (window.scrollY !== scrollPosition) {
                window.scrollTo({ top: scrollPosition, behavior: 'instant' });
            }
        }
    }, [inputMessage]);

    const handleKeyDown = async (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !waitingReplyRef.current[activeThreadRef.current]) {
            event.preventDefault();
            await handleSubmitAsync(event);
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    const handleDeleteChat = (e, threadId) => {
        e.stopPropagation(); // Prevent chat selection when clicking delete
        deleteChatAsync(threadId);
    };

    return (
        <Container fluid className={darkMode ? 'dark-mode' : ''}>
            <Button 
                onClick={toggleDarkMode} 
                className="theme-toggle-button"
                variant={darkMode ? 'dark' : 'light'}
            >
                {darkMode ? <BsSunFill style={{ color: 'white' }}/> : <BsMoonFill />}
            </Button>

            <div className="chat-layout">
                <div className="chat-sidebar">
                    <button className="new-chat-btn" onClick={createNewChatAsync}>
                        <FaPlus style={{ marginRight: '8px' }} />
                        New Chat
                    </button>
                    <div className="chat-list">
                        {Object.entries(chats).map(([threadId, _]) => (
                            <div 
                                key={threadId} 
                                className={`chat-item ${threadId === activeThreadRef.current ? 'active' : ''}`}
                                onClick={() => selectChat(threadId)}
                            >
                                <span>Chat {threadId.substring(0, 8)}...</span>
                                {Object.keys(chats).length > 1 &&
                                    <div 
                                        className="delete-chat-btn" 
                                        onClick={(e) => handleDeleteChat(e, threadId)}
                                    >
                                        <FaTrash />
                                    </div>
                                }
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chat-container-main">
                    <Row className="justify-content-md-center" style={{ width: '85%', margin: 'auto 64px' }}>
                        <Container className="chat-box" ref={chatContainerRef}>
                            <div className="messages-container">
                                <ListGroup className='d-grid'>
                                    {messages.map((msg, index) => (
                                        <ListGroup.Item key={index} className={msg.type === 'user' ? 'user-message' : 'assistant-message'} style={{ borderRadius: '1.25em' }}>
                                            <strong>{msg.type === 'user' ? 'You: ' : 'Assistant: '}</strong>
                                            {msg.isLoading && <Spinner animation="border" size="sm" />}
                                            {msg.type === 'user' ? msg.text : !msg.isLoading && <div className='assistant-response' dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}></div>}
                                            {msg.type === 'assistant' && msg.isPending && (
                                                <Container className="d-flex mt-2">
                                                    <Button className='confirm-action-button' variant="primary" onClick={() => handleConfirmActionAsync('Yes')}>Yes</Button>
                                                    <Button className='confirm-action-button' variant="secondary" onClick={() => handleConfirmActionAsync('No')}>No</Button>
                                                </Container>
                                            )}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>
                            <div className="chat-input-container">
                                <Form onSubmit={handleSubmitAsync} className="d-flex justify-content-center">
                                    <InputGroup className="input-group-width">
                                        <Form.Control
                                            as="textarea"
                                            rows={1}
                                            name="prompt"
                                            placeholder="Enter your message here"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            ref={textareaRef}
                                            style={{ overflowY: 'auto' }}
                                            onKeyDown={handleKeyDown}
                                        />
                                        <Button type="submit" variant={darkMode ? 'light' : 'dark'} disabled={waitingReplyRef.current[activeThreadRef.current]}>
                                            <FaPaperPlane/>
                                        </Button>
                                    </InputGroup>
                                </Form>
                            </div>
                        </Container>
                    </Row>
                </div>
            </div>
        </Container>
    );
}

export default ChatBox;
