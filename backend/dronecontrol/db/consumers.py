import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncWebsocketConsumer

class AlgoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['algo_room']
        self.room_group_name = f"db_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        await self.channel_layer.group_send(
            self.room_group_name, {"type": "db.message", "message": message}
        )

    async def db_message(self, event):
        message = event['message']

        # Message to websocket
        await self.send(text_data=json.dumps({"message": message}))

    async def algo_status(self, event):
        message = event['message']

        await self.send(text_data=json.dumps({"message": message}))