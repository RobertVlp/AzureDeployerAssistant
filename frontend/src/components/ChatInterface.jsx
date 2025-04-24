import ChatBox from "./ChatBox";
import React, { useState, useRef, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import AssistantDropdown from './AssistantDropdown';
import DarkModeButton from "./DarkModeButton";

const ChatInterface = () => {
    const [selectedAssistant, setSelectedAssistant] = useState("Default");
    const [chats, setChats] = useState({});
    const [messages, setMessages] = useState([]);
    const apiUrl = `${import.meta.env.VITE_API_URL}` || '';
    const activeThreadRef = useRef(null);
    
    const initializeChat = async () => {
        activeThreadRef.current = await createThreadAsync();
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
                    <AssistantDropdown setSelectedAssistant={setSelectedAssistant}/>
                    <h1 className="page-heading"><a href="/">Cloud Resource AI Bot</a></h1>
                    <DarkModeButton />
                </div>
                <ChatBox
                    messages={messages}
                    setMessages={setMessages}
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
