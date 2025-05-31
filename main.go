package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type Client struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

var clients = make(map[*websocket.Conn]*Client)
var clientsMutex = sync.RWMutex{}

func main() {
	app := fiber.New(fiber.Config{
		AppName: "Real-time Application",
	})

	app.Static("/", "./public")

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(handleWebSocket))

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendFile("./templates/index.html")
	})

	fmt.Println("Server is running on :3000")
	log.Fatal(app.Listen(":3000"))
}

type ChatMessage struct {
	Type     string `json:"type"`
	Username string `json:"username"`
	Message  string `json:"message"`
}

func handleWebSocket(c *websocket.Conn) {
	client := &Client{conn: c}
	clientsMutex.Lock()
	clients[c] = client
	clientsMutex.Unlock()

	defer func() {
		clientsMutex.Lock()
		delete(clients, c)
		clientsMutex.Unlock()
		c.Close()
	}()

	fmt.Printf("Client connected. Total clients: %d\n", len(clients))

	for {
		messageType, message, err := c.ReadMessage()
		if err != nil {
			log.Println("Error reading message:", err)
			break
		}

		var chatMessage ChatMessage
		if err := json.Unmarshal(message, &chatMessage); err != nil {
			log.Println("Error parsing message:", err)
			continue
		}

		fmt.Printf("Message from %s: %s\n", chatMessage.Username, chatMessage.Message)

		broadcastMessage(messageType, message, c)
	}
}

func broadcastMessage(messageType int, message []byte, sender *websocket.Conn) {
	clientsMutex.RLock()
	defer clientsMutex.RUnlock()

	for conn, client := range clients {
		if conn != sender {
			client.mu.Lock()
			err := conn.WriteMessage(messageType, message)
			client.mu.Unlock()

			if err != nil {
				log.Println("Error broadcasting message:", err)
			}
		}
	}
}
