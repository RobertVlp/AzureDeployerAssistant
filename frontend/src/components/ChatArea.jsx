import React from 'react';
import { Row, Container } from 'react-bootstrap';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

function ChatArea({ messages, setMessages, handleActionAsync, isWaitingReply, darkMode }) {
    const handleSubmitAsync = async (inputMessage, model) => {
        if (inputMessage) {
            const serverUrl = 'http://localhost:7151/api/InvokeAssistant';

            if (messages.length > 0 && messages[messages.length - 1].isPending) {
                messages[messages.length - 1].isPending = false;
                setMessages([...messages]);
            }
            
            setMessages([...messages, { text: inputMessage, type: 'user' }]);
            await handleActionAsync(inputMessage, serverUrl, model);
        }
    };

    const handleConfirmActionAsync = async (action) => {
        const serverUrl = 'http://localhost:7151/api/ConfirmAction';
        messages[messages.length - 1].isPending = false;
        setMessages([...messages]);
        await handleActionAsync(action, serverUrl, "");
    };

    return (
        <div className="chat-container-main">
            <Row className="justify-content-md-center" style={{ width: '75%', margin: 'auto 128px' }}>
                <Container className="chat-box">
                    <MessageList 
                        messages={messages}
                        onConfirmAction={handleConfirmActionAsync}
                    />
                    <ChatInput 
                        onSubmit={handleSubmitAsync}
                        isWaitingReply={isWaitingReply}
                        darkMode={darkMode}
                    />
                </Container>
            </Row>
        </div>
    );
}

export default ChatArea;