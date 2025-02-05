package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"sync"
	"time"
	"white/auth"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// ======================== CONFIGURATION ========================
const (
	ServerPort = ":8050"
	PeerPort   = "9090"
	RedisAddr  = "localhost:6379"
)

var ctx = context.Background()
var rdb = redis.NewClient(&redis.Options{
	Addr: RedisAddr,
})

// ======================== WEBSOCKET SETUP ========================
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var (
	clients   = make(map[*websocket.Conn]string) // WebSocket clients with their names
	clientsMu sync.Mutex                         // Mutex to protect the clients map
	users     = make(map[string]bool)            // Track active users
	usersMu   sync.Mutex                         // Mutex to protect the users map
)

// ======================== CRDT IMPLEMENTATION ========================
type CRDT struct {
	mu     sync.Mutex
	Shapes map[string]string // Grow-Only Set (G-Set) for shapes
}

func NewCRDT() *CRDT {
	return &CRDT{
		Shapes: make(map[string]string),
	}
}

// AddShape adds a shape to the CRDT
func (c *CRDT) AddShape(id string, data string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Shapes[id] = data
}

// GetShapes returns a copy of the shapes in the CRDT
func (c *CRDT) GetShapes() map[string]string {
	c.mu.Lock()
	defer c.mu.Unlock()
	copy := make(map[string]string)
	for id, data := range c.Shapes {
		copy[id] = data
	}
	return copy
}

// Merge merges another CRDT into this one
func (c *CRDT) Merge(other *CRDT) {
	c.mu.Lock()
	defer c.mu.Unlock()
	other.mu.Lock()
	defer other.mu.Unlock()
	for id, data := range other.Shapes {
		c.Shapes[id] = data
	}
}

var crdt = NewCRDT()

// ======================== REDIS SNAPSHOT STORAGE ========================
func saveSnapshot(id string, data string) {
	if err := rdb.Set(ctx, id, data, 0).Err(); err != nil {
		log.Println("Error saving to Redis:", err)
	}
}

func loadSnapshots() {
	keys, err := rdb.Keys(ctx, "*").Result()
	if err != nil {
		log.Println("Error loading Redis keys:", err)
		return
	}
	for _, id := range keys {
		if data, err := rdb.Get(ctx, id).Result(); err == nil {
			crdt.AddShape(id, data)
		}
	}
}

// ======================== USER MANAGEMENT ========================
func getActiveUsers() []string {
	usersMu.Lock()
	defer usersMu.Unlock()
	activeUsers := make([]string, 0, len(users))
	for user := range users {
		activeUsers = append(activeUsers, user)
	}
	return activeUsers
}

func broadcastUserEvent(eventType string, username string) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	message := map[string]interface{}{
		"type":  eventType,
		"user":  username,
		"users": getActiveUsers(), // Send the full updated list
	}

	for client := range clients {
		if err := client.WriteJSON(message); err != nil {
			log.Println("Error broadcasting user event:", err)
			client.Close()
			delete(clients, client)

			usersMu.Lock()
			delete(users, clients[client])
			usersMu.Unlock()
		}
	}
}

// ======================== PEER-TO-PEER NETWORKING ========================
func startPeerServer(port string) {
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		fmt.Println("Error starting peer server:", err)
		return
	}
	defer listener.Close()
	fmt.Println("Peer server started on port", port)

	for {
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Connection error:", err)
			continue
		}
		go handlePeerConnection(conn)
	}
}

func handlePeerConnection(conn net.Conn) {
	defer conn.Close()
	fmt.Println("New peer connected:", conn.RemoteAddr())
	encoder := json.NewEncoder(conn)
	decoder := json.NewDecoder(conn)

	// Send CRDT state to new peer
	if err := encoder.Encode(crdt.GetShapes()); err != nil {
		fmt.Println("Error sending state to peer:", err)
		return
	}

	// Listen for updates from peer
	for {
		var message map[string]string
		if err := decoder.Decode(&message); err != nil {
			fmt.Println("Peer disconnected:", conn.RemoteAddr())
			return
		}
		crdt.AddShape(message["id"], message["data"])
	}
}

// ======================== LEADER ELECTION (RAFT SIMULATION) ========================
var isLeader bool

func startElection() {
	rand.Seed(time.Now().UnixNano())
	electionTimeout := time.Duration(rand.Intn(300)+150) * time.Millisecond
	fmt.Println("Starting leader election...")
	time.Sleep(electionTimeout)
	isLeader = true
	fmt.Println("This node is now the leader.")

	if isLeader {
		go saveStateToRedis()
	}
}

func saveStateToRedis() {
	ticker := time.NewTicker(30 * time.Second) // Save every 30 seconds
	defer ticker.Stop()

	for range ticker.C {
		for id, data := range crdt.GetShapes() {
			saveSnapshot(id, data)
		}
		fmt.Println("Leader saved whiteboard state to Redis.")
	}
}

// ======================== WEBSOCKET PING HANDLER ========================
func startPingHandler() {
	ticker := time.NewTicker(10 * time.Second) // Send ping every 10 seconds
	defer ticker.Stop()

	for range ticker.C {
		clientsMu.Lock()
		for client := range clients {
			if err := client.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Println("Ping failed, removing client:", err)
				client.Close()
				delete(clients, client)

				usersMu.Lock()
				delete(users, clients[client])
				usersMu.Unlock()

				// Broadcast user leave event
				broadcastUserEvent("leave", clients[client])
			}
		}
		clientsMu.Unlock()
	}
}

// ======================== MAIN FUNCTION ========================
func main() {
	auth.InitDB() // Initialize the database connection

	r := gin.Default()

	// Enable CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Change to frontend URL in production
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Register authentication routes
	r.POST("/register", auth.Register)
	r.POST("/login", auth.Login)
	r.GET("/protected", auth.AuthMiddleware(), auth.ProtectedRoute)

	// Load whiteboard from Redis at startup
	loadSnapshots()

	// WebSocket Route (use Gin, not http.HandleFunc)
	r.GET("/ws", func(c *gin.Context) {
		handleConnections(c.Writer, c.Request)
	})

	// Start peer-to-peer networking
	go startPeerServer(PeerPort)

	// Start leader election
	go startElection()

	// Start WebSocket ping handler to prevent disconnects
	go startPingHandler()

	// ✅ Start the Gin server properly (removes select {})
	fmt.Println("🚀 Server running on port", ServerPort)
	log.Fatal(r.Run(ServerPort))
}

// ======================== WEBSOCKET HANDLER ========================
func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	defer ws.Close()

	// Ask for user name
	var nameMessage map[string]string
	if err := ws.ReadJSON(&nameMessage); err != nil || nameMessage["name"] == "" {
		log.Println("Invalid or missing name:", err)
		ws.Close()
		return
	}
	name := nameMessage["name"]

	// Check if the username is already taken
	usersMu.Lock()
	if users[name] {
		usersMu.Unlock()
		ws.WriteJSON(map[string]string{"error": "Username already taken"})
		ws.Close()
		return
	}
	users[name] = true
	usersMu.Unlock()

	// Register the client
	clientsMu.Lock()
	clients[ws] = name
	clientsMu.Unlock()

	fmt.Println(name, "joined the whiteboard")

	// Broadcast user join event
	broadcastUserEvent("join", name)

	// Send existing whiteboard state and active users to the new client
	ws.WriteJSON(map[string]interface{}{
		"type":   "init",
		"shapes": crdt.GetShapes(),
		"users":  getActiveUsers(),
	})

	for {
		var message map[string]interface{}
		if err := ws.ReadJSON(&message); err != nil {
			log.Println("Error reading message:", err)
			clientsMu.Lock()
			delete(clients, ws)
			clientsMu.Unlock()

			usersMu.Lock()
			delete(users, name)
			usersMu.Unlock()

			// Broadcast user leave event
			broadcastUserEvent("leave", name)
			break
		}

		id, ok1 := message["id"].(string)
		data, ok2 := message["data"].(string)

		if !ok1 || !ok2 {
			log.Println("Invalid message format:", message)
			continue
		}

		// Attach the user's name to the message
		message["name"] = name
		crdt.AddShape(id, data)

		// Broadcast the update to all clients
		clientsMu.Lock()
		for client := range clients {
			if err := client.WriteJSON(message); err != nil {
				log.Println("Error sending message:", err)
				client.Close()
				delete(clients, client)

				usersMu.Lock()
				delete(users, clients[client])
				usersMu.Unlock()

				// Broadcast user leave event
				broadcastUserEvent("leave", clients[client])
			}
		}
		clientsMu.Unlock()
	}
}
