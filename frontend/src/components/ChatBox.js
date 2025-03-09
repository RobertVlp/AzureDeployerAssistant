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
    const [waitingReply, setWaitingReply] = useState({});
    const waitingFirstMessageRef = useRef(false);
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
                body: JSON.stringify({ "threadId": threadId, "prompt": "", "model": "" })
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

        delete waitingReply[threadId];
        await deleteThreadAsync(threadId);
    };

    const selectChat = (threadId) => {
        activeThreadRef.current = threadId;
        setMessages(chats[threadId] || []);
    };

    const initializeChat = async () => {
        activeThreadRef.current = await createThreadAsync();
    };

    const handleActionAsync = async (action, url, model) => {
        if (!activeThreadRef.current) {
            waitingFirstMessageRef.current = true;
            await initializeChat();
            waitingFirstMessageRef.current = false;
        }

        const threadId = activeThreadRef.current;
        setWaitingReply(prev => ({ ...prev, [threadId]: true }));

        const streamingMessage = { text: '', type: 'assistant', isLoading: true, isThinking: model === 'o3-mini' };
        setMessages(prev => [...prev, streamingMessage]);

        try {
            await handleChatResponseStream(url, threadId, action, streamingMessage, model);
        } catch (error) {
            streamingMessage.isLoading = false;
            streamingMessage.text = `An error occurred while processing your request: ${error}`;
            setMessages(prev => [...prev]);
        } finally {
            setWaitingReply(prev => ({ ...prev, [threadId]: false }));
        }
    };

    const handleChatResponseStream = async (url, threadId, action, streamingMessage, model) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                threadId: threadId,
                prompt: action,
                model: model
            })
        });

        if (!response.ok) throw new Error(response.status + response.statusText);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        streamingMessage.isLoading = false;
        setMessages(prev => [...prev]);

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            streamingMessage.text += chunk;

            setMessages(prev => [...prev]);
        }

        if (streamingMessage.text.includes('The following actions will be performed:')) {
            streamingMessage.isPending = true;
        }
    }

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    useEffect(() => {
        if (activeThreadRef.current && messages.length > 0) {
            setChats(prevChats => ({
                ...prevChats,
                [activeThreadRef.current]: [...messages]
            }));
        }
    }, [messages]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const response = await fetch('http://localhost:7151/api/GetChatHistory');
                if (!response.ok) throw new Error(response.status + response.statusText);
                const data = await response.json();
                
                if (Object.keys(data).length > 0) {
                    for (const [threadId, messages] of Object.entries(data)) {
                        const chatMessages = [];

                        for (const message of messages) {
                            chatMessages.push({
                                text: message.Message,
                                type: message.Role
                            });
                        }

                        setChats(prevChats => ({
                            ...prevChats,
                            [threadId]: chatMessages
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
            }
        };

        fetchChats();
    }, []);

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
                    handleActionAsync={handleActionAsync}
                    isWaitingReply={waitingReply[activeThreadRef.current] || waitingFirstMessageRef.current}
                    darkMode={darkMode}
                />
            </div>
        </Container>
    );
}

export default ChatBox;