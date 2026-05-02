from django.urls import path

from .views import QuizDetailView, QuizListView, SubmitQuizView

urlpatterns = [
    path("gamification/quizzes", QuizListView.as_view(), name="quiz-list"),
    path("gamification/quizzes/<uuid:quiz_id>", QuizDetailView.as_view(), name="quiz-detail"),
    path("gamification/submit-quiz", SubmitQuizView.as_view(), name="submit-quiz"),
]
