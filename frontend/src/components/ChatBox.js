import { Container, Row, Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import './style.css';

function ChatBox() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);

    // const handleSubmit = async (event) => {
    //     event.preventDefault();

    //     const newMessages = [...messages, { text: inputMessage, type: 'user' }];
    //     setMessages(newMessages);
    //     setInputMessage('');

    //     const tempMessages = [...newMessages, { text: '', type: 'assistant', isLoading: true }];
    //     setMessages(tempMessages);

    //     try {
    //         const serverUrl = 'http://localhost:5000/send_message';

    //         const response = await fetch(serverUrl, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({ message: inputMessage })
    //         });

    //         if (!response.ok) {
    //             throw new Error('Error processing message: ' + response.statusText);
    //         }

    //         const data = await response.json();
    //         setMessages([...newMessages, { text: data['response'][0], type: 'assistant' }]);
    //     } catch (error) {
    //         console.error('Error sending message:', error);
    //         setMessages(newMessages);
    //     }
    // };

    const handleAction = async (action, url) => {
        try {
            // Add a temporary message with a spinner
            const tempMessage = { text: '', type: 'assistant', isLoading: true };
            setMessages((prevMessages) => [...prevMessages, tempMessage]);
    
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: action })
            });
    
            if (!response.ok) {
                throw new Error('Error confirming action: ' + response.statusText);
            }
    
            const data = await response.json();
    
            // Remove the temporary message
            setMessages((prevMessages) => prevMessages.filter(msg => !msg.isLoading));
    
            // Add the new message from the assistant
            setMessages((prevMessages) => [...prevMessages, { text: data['response'][0], type: 'assistant' }]);
        } catch (error) {
            console.error('Error confirming action:', error);
        }
    };
    
    const handleSubmit = (event) => {
        event.preventDefault();
        const action = inputMessage.trim();

        if (action) {
            const newMessages = [...messages, { text: inputMessage, type: 'user' }];
            const serverUrl = 'http://localhost:5000/send_message';

            setMessages(newMessages);
            setInputMessage('');
            handleAction(action, serverUrl);
        }
    };
    
    const handleConfirmAction = (action) => {
        const serverUrl = 'http://localhost:5000/confirm_action';

        handleAction(action, serverUrl);
        setMessages((prevMessages) => prevMessages.filter(msg => !String(msg.text).startsWith('The following actions will be performed:')));
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

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
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
                            <ListGroup.Item key={index} className={msg.type === 'user' ? 'user-message' : 'assistant-message'}>
                                <strong>{msg.type === 'user' ? 'You:' : 'Assistant:'}</strong> {msg.text}
                                {msg.isLoading && (
                                    <Spinner animation="border" size="sm" />
                                )}
                                
                                {msg.type === 'assistant' && String(msg.text).startsWith('The following actions will be performed:') && (
                                    <Container className="d-flex mt-2"> 
                                        <Button 
                                            variant="primary" 
                                            onClick={() => handleConfirmAction('Yes')}
                                            style={{ marginRight: '10px', padding: '5px 20px' }}
                                        >
                                            Yes
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => handleConfirmAction('No')}
                                            style={{ marginRight: '10px', padding: '5px 20px' }}
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
                        <Button type="submit" variant="primary">
                            <FaPaperPlane />
                        </Button>
                    </InputGroup>
                </Form>
            </Row>
        </Container>
    );
}

export default ChatBox;
