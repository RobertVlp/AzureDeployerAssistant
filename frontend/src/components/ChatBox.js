import { Container, Row, Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import { marked } from 'marked';
import './style.css';

function ChatBox() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const waitingReplyRef = useRef(false);

    const handleAction = async (action, url) => {
        try {
            // Add a temporary message with a spinner
            const tempMessage = { text: '', type: 'assistant', isLoading: true };
            setMessages((prevMessages) => [...prevMessages, tempMessage]);

            waitingReplyRef.current = true;
    
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: action })
            });
    
            if (!response.ok) {
                throw new Error(response.status + response.statusText);
            }
    
            const data = await response.json();
    
            // Remove the temporary message
            setMessages((prevMessages) => {
                if (prevMessages[prevMessages.length - 1] === tempMessage) {
                    prevMessages.pop();
                }
                return [...prevMessages];
            });

            const assistantResponse = String(data['response'][0]);
            const isPending = assistantResponse.startsWith('The following actions will be performed:');
    
            // Add the new message from the assistant
            setMessages((prevMessages) => [...prevMessages, { text: assistantResponse, type: 'assistant', isPending: isPending }]);
            waitingReplyRef.current = false;
        } catch (error) {
            setMessages((prevMessages) => {
                prevMessages.push({ text: `An error occurred while processing your request: ${error}`, type: 'assistant' });
                return [...prevMessages];
            });
        }
    };
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        const action = inputMessage.trim();

        if (action) {
            const serverUrl = 'http://localhost:5000/send_message';

            // Check if the last message is pending and update it
            if (messages.length > 0 && messages[messages.length - 1].isPending) {
                messages[messages.length - 1].isPending = false;
                setMessages([...messages]);
            }

            setMessages([...messages, { text: inputMessage, type: 'user' }]);
            setInputMessage('');
            await handleAction(action, serverUrl);
        }
    };
    
    const handleConfirmAction = async (action) => {
        const serverUrl = 'http://localhost:5000/confirm_action';
        messages[messages.length - 1].isPending = false;
        
        setMessages([...messages]);
        await handleAction(action, serverUrl);
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
        }
    }, [inputMessage]);

    const handleKeyDown = async (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !waitingReplyRef.current) {
            event.preventDefault();
            await handleSubmit(event);
        }
    };

    return (
        <Container>
            <Row className="justify-content-md-center">
                <Container 
                    className="chat-box"
                    style={{ width: "60%", overflowY: "auto" }}
                    ref={chatContainerRef}
                >
                    <ListGroup className='d-grid'>
                        {messages.map((msg, index) => (
                            <ListGroup.Item key={index} className={msg.type === 'user' ? 'user-message' : 'assistant-message'} style={{ borderRadius: '1.25em' }}>
                                    <strong>{msg.type === 'user' ? 'You: ' : 'Assistant: '}</strong>
                                    {msg.isLoading && (
                                        <Spinner animation="border" size="sm"/>
                                    )}
                                    {msg.type === 'user' ? msg.text : !msg.isLoading && <div className='assistant-response' dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}></div>}
                                {msg.type === 'assistant' && msg.isPending && (
                                    <Container className="d-flex mt-2"> 
                                        <Button className='confirm-action-button'
                                            variant="primary" 
                                            onClick={() => handleConfirmAction('Yes')}
                                        >
                                            Yes
                                        </Button>
                                        <Button className='confirm-action-button'
                                            variant="secondary" 
                                            onClick={() => handleConfirmAction('No')}
                                        >
                                            No
                                        </Button>
                                    </Container>
                                )}

                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Container>
            </Row>
            <Row className="justify-content-md-center">
                <Form onSubmit={handleSubmit} className="d-flex justify-content-center">
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
                        <Button type="submit" variant="primary" disabled={waitingReplyRef.current}>
                            <FaPaperPlane />
                        </Button>
                    </InputGroup>
                </Form>
            </Row>
        </Container>
    );
}

export default ChatBox;
