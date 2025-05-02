from django.urls import path
from . import views

urlpatterns = [
    path("", views.info, name='info'),
    path("<str:algo_room>/", views.room, name="room"),
]