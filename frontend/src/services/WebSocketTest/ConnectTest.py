import asyncio
import websockets

async def handler(websocket):
    print(f"Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            if message == "ping":
                print("Received pong, sending ping")
                await websocket.send("pong")
    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected: {websocket.remote_address}")

async def main():
    server = await websockets.serve(handler, "localhost", 5432)
    print("WebSocket server started on ws://localhost:5432")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
