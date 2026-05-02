from django.urls import path

from .views import (
    LeaderboardView,
    QuizBatchDetailView,
    QuizBatchListCreateView,
    QuizDetailView,
    QuizListView,
    SubmitQuizView,
)

urlpatterns = [
    path("gamification/quizzes/", QuizListView.as_view(), name="quiz-list"),
    path("gamification/quizzes/<uuid:quiz_id>/", QuizDetailView.as_view(), name="quiz-detail"),
    path("gamification/submit-quiz/", SubmitQuizView.as_view(), name="submit-quiz"),
    path("gamification/quiz-batches/", QuizBatchListCreateView.as_view(), name="quiz-batch-list"),
    path("gamification/quiz-batches/<uuid:batch_id>/", QuizBatchDetailView.as_view(), name="quiz-batch-detail"),
    path("gamification/leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
]
