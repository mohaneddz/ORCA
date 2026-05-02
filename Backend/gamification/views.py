import json

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.auth import get_employee_from_request

from .models import Quiz, QuizSubmission


def _quiz_data(quiz):
    """Serialize a Quiz without exposing the correct answer."""
    return {
        "id": str(quiz.id),
        "question": quiz.question,
        "options": quiz.options,
        "created_at": quiz.created_at.isoformat(),
    }


class QuizListView(View):
    def get(self, request):
        quizzes = Quiz.objects.order_by("-created_at").values_list(
            "id", "question", "options", "created_at"
        )
        data = [
            {
                "id": str(row[0]),
                "question": row[1],
                "options": row[2],
                "created_at": row[3].isoformat(),
            }
            for row in quizzes
        ]
        return JsonResponse({"quizzes": data})


class QuizDetailView(View):
    def get(self, request, quiz_id):
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except (Quiz.DoesNotExist, Exception):
            return JsonResponse({"error": "Quiz not found."}, status=404)
        return JsonResponse(_quiz_data(quiz))


@method_decorator(csrf_exempt, name="dispatch")
class SubmitQuizView(View):
    def post(self, request):
        employee, err = get_employee_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        quiz_id = body.get("quiz_id")
        answer_selected = body.get("answer_selected")

        if not all([quiz_id, answer_selected]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except (Quiz.DoesNotExist, Exception):
            return JsonResponse({"error": "Quiz not found."}, status=404)

        is_correct = answer_selected == quiz.correct_answer

        submission, created = QuizSubmission.objects.get_or_create(
            employee=employee,
            quiz=quiz,
            defaults={"answer_selected": answer_selected, "is_correct": is_correct},
        )

        if not created:
            return JsonResponse({"error": "Quiz already submitted."}, status=409)

        response_data = {"is_correct": is_correct}
        if not is_correct:
            response_data["correct_answer"] = quiz.correct_answer

        return JsonResponse(response_data, status=200)
