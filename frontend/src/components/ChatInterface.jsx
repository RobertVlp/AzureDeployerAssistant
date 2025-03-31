import ChatBox from "./ChatBox";
import { ThemeContext } from '../App';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';
import { Button } from 'react-bootstrap';
import React, { useState, useRef, useEffect, useContext } from 'react';
import ChatSidebar from './ChatSidebar';
import AssistantDropdown from './AssistantDropdown';

const ChatInterface = () => {
    const { darkMode, setDarkMode } = useContext(ThemeContext);
    const [selectedAssistant, setSelectedAssistant] = useState("Default");
    const [chats, setChats] = useState({});
    const [messages, setMessages] = useState([]);
    const apiUrl = `${import.meta.env.VITE_API_URL}` || '';
    const activeThreadRef = useRef(null);
    
    const initializeChat = async () => {
        activeThreadRef.current = await createThreadAsync();
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    const createThreadAsync = async () => {
        try {
            const response = await fetch(`${apiUrl}/CreateThread`);
            if (!response.ok) throw new Error(response.status + response.statusText);
            const data = await response.json();
            return data.threadId;
        } catch (error) {
            console.error('Failed to create thread:', error);
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

    const deleteThreadAsync = async (threadId) => {
        try {
            await fetch(`${apiUrl}/DeleteThread`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: threadId, prompt: "", model: "", assistant: "" })
            });
        } catch (error) {
            console.error('Failed to delete thread:', error);
        }
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
        const fetchChats = async () => {
            try {
                const response = await fetch(`${apiUrl}/GetChatHistory`);
                if (!response.ok) throw new Error(response.status + response.statusText);
                const data = await response.json();

                if (Object.keys(data).length > 0) {
                    for (const [threadId, messages] of Object.entries(data)) {
                        const chatMessages = [];

                        for (const message of messages) {
                            chatMessages.push({
                                text: message.Text,
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
        <div className="chat-interface">
            <div className="chat-container">
                <div className="chat-interface-header">
                    <h1 className="page-heading">Cloud Resource AI Bot</h1>
                    <Button 
                        onClick={toggleDarkMode}
                        className="theme-toggle-button"
                        variant={darkMode ? 'dark' : 'light'}
                    >
                        {darkMode ? <BsSunFill style={{ color: 'white' }}/> : <BsMoonFill />}
                    </Button>
                    <AssistantDropdown setSelectedAssistant={setSelectedAssistant}/>
                </div>
                <ChatBox
                    messages={messages}
                    setMessages={setMessages}
                    darkMode={darkMode}
                    setChats={setChats}
                    activeThreadRef={activeThreadRef}
                    initializeChat={initializeChat}
                    selectedAssistant={selectedAssistant}
                />
            </div>
            <ChatSidebar
                chats={chats}
                activeThreadId={activeThreadRef.current}
                onCreateNewChat={createNewChatAsync}
                onDeleteChat={deleteChatAsync}
                onSelectChat={selectChat}
            />
        </div>
    );
}

export default ChatInterface;
