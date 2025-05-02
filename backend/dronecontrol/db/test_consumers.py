# import json
# import pytest
# from channels.testing import WebsocketCommunicator
# from backend.dronecontrol.db.routing import application  # Ensure this import is resolved correctly

# @pytest.mark.asyncio
# async def test_algo_consumer_connect():
#     # Define the WebSocket route to connect to
#     room_name = "testroom"
#     communicator = WebsocketCommunicator(application, f"/ws/db/{room_name}/")

#     # Connect to WebSocket
#     connected, _ = await communicator.connect()
#     assert connected  # Ensure the connection is successful

#     # Disconnect
#     await communicator.disconnect()

# @pytest.mark.asyncio
# async def test_algo_consumer_message():
#     # Define the WebSocket route to connect to
#     room_name = "testroom"
#     communicator = WebsocketCommunicator(application, f"/ws/db/{room_name}/")

#     # Connect to WebSocket
#     connected, _ = await communicator.connect()
#     assert connected  # Ensure the connection is successful

#     # Send a message
#     test_message = {"message": "Hello, WebSocket!"}
#     await communicator.send_json_to(test_message)

#     # Receive the message
#     response = await communicator.receive_json_from()
#     assert response == test_message  # Ensure the message is echoed back

#     # Disconnect
#     await communicator.disconnect()

# @pytest.mark.asyncio
# async def test_algo_consumer_disconnect():
#     # Define the WebSocket route to connect to
#     room_name = "testroom"
#     communicator = WebsocketCommunicator(application, f"/ws/db/{room_name}/")

#     # Connect to WebSocket
#     connected, _ = await communicator.connect()
#     assert connected  # Ensure the connection is successful

#     # Disconnect
#     await communicator.disconnect()

#     # Check that the connection was closed properly
#     assert communicator.channel_name is None  # Ensure channel_name is cleared after disconnect
