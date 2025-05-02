from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path(r"ws/db/<str:algo_room>/", consumers.AlgoConsumer.as_asgi()),
]