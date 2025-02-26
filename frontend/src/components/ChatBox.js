import { Container, Button } from 'react-bootstrap';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';
import { ThemeContext } from '../App';
import ChatSidebar from './ChatSidebar';
import ChatArea from './ChatArea';
import './style.css';

function ChatBox() {
    const { darkMode, setDarkMode } = useContext(ThemeContext);
    const [messages, setMessages] = useState([]);
    const [chats, setChats] = useState({});
    const waitingReplyRef = useRef({});
    const activeThreadRef = useRef(null);

    const createThreadAsync = async () => {
        try {
            const response = await fetch('http://localhost:7151/api/CreateThread');
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
                selectChat(remainingThreads[0]);
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
        return () => { isMounted = false; };
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (activeThreadRef.current && messages.length > 0) {
            setChats(prevChats => ({
                ...prevChats,
                [activeThreadRef.current]: [...messages]
            }));
        }
    }, [messages]);

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

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <Container fluid className={darkMode ? 'dark-mode' : ''} style={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
                onClick={toggleDarkMode} 
                className="theme-toggle-button"
                variant={darkMode ? 'dark' : 'light'}
            >
                {darkMode ? <BsSunFill style={{ color: 'white' }}/> : <BsMoonFill />}
            </Button>

            <div className="chat-layout">
                <ChatSidebar 
                    chats={chats}
                    activeThreadId={activeThreadRef.current}
                    onCreateNewChat={createNewChatAsync}
                    onDeleteChat={deleteChatAsync}
                    onSelectChat={selectChat}
                />
                
                <ChatArea 
                    messages={messages}
                    setMessages={setMessages}
                    activeThreadId={activeThreadRef.current}
                    handleActionAsync={handleActionAsync}
                    isWaitingReply={waitingReplyRef.current[activeThreadRef.current]}
                    darkMode={darkMode}
                />
            </div>
        </Container>
    );
}

export default ChatBox;