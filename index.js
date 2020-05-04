
// const apiUrl = 'http://localhost:3000'
// const webSocketUrl = 'ws://localhost:3000/cable'

const apiUrl = 'https://actioncable-message-test-rn81.herokuapp.com/'
const webSocketUrl = 'wss://actioncable-message-test-rn81.herokuapp.com/cable'

const chatRoomListDiv = document.getElementById('chat-rooms-list');
const newMessageForm = document.getElementById('new-message-form');
const messagesListDiv = document.getElementById('messages-list');

let socket = null;
let currentChatRoomId = null;

//
//
// Renders all the chat rooms onto the chat room list
function renderChatRoomsList(chatRoomsObject) {
    chatRoomsObject.forEach(chatRoomObject => {
        renderChatRoomOnList(chatRoomObject);
    })
}

//
//
// Renders an individual chat room onto the chat room list
function renderChatRoomOnList(chatRoomObject) {
    const chatRoomDiv = document.createElement('div');

    chatRoomDiv.innerHTML = `${chatRoomObject.name} <button class='join-chat-room-button' data-chat-room-id='${chatRoomObject.id}'>Join</button>`

    chatRoomListDiv.prepend(chatRoomDiv);
}

//
//
// Renders a specific chat room when a user joins it
function renderChatRoom(chatRoomObject) {
    const chatRoomDiv = document.getElementById('chat-room-div');
    chatRoomDiv.style.display = "block";

    const chatRoomNameH3 = document.getElementById('chatroom_title');
    chatRoomNameH3.textContent = chatRoomObject.name;

    // chatRoomDiv.prepend(chatRoomNameH3);

    // Show the new message form
    newMessageForm.style = '';
    newMessageForm.dataset.chatRoomId = chatRoomObject.id;

    messagesListDiv.innerHTML = "";

    chatRoomObject.messages.forEach( messageObject => {
        renderMessage(messageObject)
    })
}

//
//
// Renders a specific message
function renderMessage(messageObject) {
    const messageDiv = document.createElement('div')

    messageDiv.innerHTML = ``
    messageDiv.textContent = messageObject.content;
    messageDiv.dataset.messageId = messageObject.id;

    messagesListDiv.prepend(messageDiv);
}

//
//
// Opens a websocket connection to a specific Chat Room stream
function createChatRoomWebsocketConnection(chatRoomId) {
    
    currentChatRoomId = chatRoomId;
    // Creates the new websocket connection
    socket = new WebSocket(webSocketUrl);

    // When the connection is 1st created, this code runs subscribing the clien to a specific chatroom stream in the ChatRoomChannel
    socket.onopen = function(event) {
        console.log('WebSocket is connected.', socket);

        const msg = {
            command: 'subscribe',
            identifier: JSON.stringify({
                id: chatRoomId,
                channel: 'ChatRoomChannel'
            }),
        };

        socket.send(JSON.stringify(msg));
    };
    
    // When the connection is closed, this code is run
    socket.onclose = function(event) {
        console.log('WebSocket is closed.');
        returnToMainPage();
    };

    // When a message is received through the websocket, this code is run
    socket.onmessage = function(event) {            
        const response = event.data;
        const msg = JSON.parse(response);
        
        // Ignores pings
        if (msg.type === "ping" || msg.type === "welcome") {
            return;
        } 

        console.log("FROM RAILS: ", msg);
        
        // Renders any newly created messages onto the page
        if (msg.message) {
            console.log("from broadcast", msg);
            renderMessage(msg.message)
        }
        
    };
    
    // When an error occurs through the websocket connection, this code is run printing the error message
    socket.onerror = function(error) {
        console.log('WebSocket Error: ' + error);
    };
}

//
//
// DOM CONTENT LOADED
//
//
document.addEventListener('DOMContentLoaded',() => {
    // Fetch & render all chat rooms from the server

    const messagesDiv = document.getElementById("chat-room-div");
    messagesDiv.style.display = "none";

    document.getElementById("return").addEventListener("click", event => {
        if(socket && currentChatRoomId){
            console.log("end websocket");

            const msg = {
                command: 'unsubscribe',
                identifier: JSON.stringify({
                    id: currentChatRoomId,
                    channel: 'ChatRoomChannel'
                }),
            };
    
            socket.send(JSON.stringify(msg));
            socket.close();
        }
    });

    fetch(`${apiUrl}/chat_rooms`)
        .then(response => response.json())
        .then(chatRoomsObject => {
            renderChatRoomsList(chatRoomsObject);
            createMainWebsocketConnection();
        })
    
    // Allow users to create new chat rooms
    const newChatRoomForm = document.getElementById('new-chat-room-form');
    newChatRoomForm.addEventListener('submit', event => {
        event.preventDefault();
        fetch(`${apiUrl}/chat_rooms`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: event.target[0].value
            })
        })
        // .then(response => response.json())
        // .then(chatRoomObject => {renderChatRoomOnList(chatRoomObject)})

        newChatRoomForm.reset(); 
    })

    // Allow users to join new chat rooms
    chatRoomListDiv.addEventListener('click', event => {
        if (event.target.className === 'join-chat-room-button') {
            
            // Hide the chat room list
            const chatRoomsDiv = document.getElementById('chat-rooms-div')
            chatRoomsDiv.style.display = 'none'

            // Fetch & render info on a specific chat room from the server 
            fetch(`${apiUrl}/chat_rooms/${event.target.dataset.chatRoomId}`)
                .then(response => response.json())
                .then(chatRoomObject => {
                    renderChatRoom(chatRoomObject)
                })

            // Open up a websocket connection for that specific chat room
            createChatRoomWebsocketConnection(event.target.dataset.chatRoomId)
        }
    })

    // Allow users to submit new messages
    newMessageForm.addEventListener('submit', event => {
        event.preventDefault();
        fetch(`${apiUrl}/messages`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                content: event.target[0].value,
                chat_room_id: event.target.dataset.chatRoomId
            })
        })
        // .then(response => response.json())
        // .then(messageObject => {renderMessage(messageObject)})

        newMessageForm.reset();
    })
})

/////////////////////////////////////////////

//
//
function returnToMainPage(){
    const listPage = document.getElementById("chat-rooms-div");
    listPage.style.display = "block";
    
    const messagePage = document.getElementById("chat-room-div");
    messagePage.style.display = "none";

    // createMainWebsocketConnection();
}

/////////////////////////////////////////////

//
//
function createMainWebsocketConnection(){
    console.log("main web socket connection");

    socket = new WebSocket(webSocketUrl);

    // When the connection is 1st created, this code runs subscribing the client to a stream in the MainChannel
    socket.onopen = function(event) {
        console.log('MAIN WebSocket is connected.', socket);

        const msg = {
            command: 'subscribe',
            identifier: JSON.stringify({
                channel: 'MainChannel'
            }),
        };

        socket.send(JSON.stringify(msg));
    };
    
    // When the connection is closed, this code is run
    socket.onclose = function(event) {
        console.log('MAIN WebSocket is closed.');
        // returnToMainPage();
    };

    // When a message is received through the websocket, this code is run
    socket.onmessage = function(event) {            
        const response = event.data;
        const msg = JSON.parse(response);
        
        // Ignores pings
        if (msg.type === "ping" || msg.type === "welcome") {
            return;
        }

        console.log("FROM RAILS: ", msg);
        
        // Renders any newly created messages onto the page
        if (msg) {
            console.log("MAIN from broadcast", msg);
            renderChatRoomOnList(msg.message.chat_room);
        }
    };
    
    // When an error occurs through the websocket connection, this code is run printing the error message
    socket.onerror = function(error) {
        console.log('MAIN WebSocket Error: ' + error);
    };
}