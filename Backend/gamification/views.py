import json

from django.db.models import Count
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.auth import get_employee_from_request
from organizations.models import Employee
from organizations.views import get_org_from_request

from .models import Quiz, QuizBatch, QuizBatchAssignment, QuizSubmission

def _get_org(request):
    return get_org_from_request(request)


def _quiz_data(quiz):
    """Serialize a Quiz without exposing the correct answer."""
    return {
        "id": str(quiz.id),
        "question": quiz.question,
        "options": quiz.options,
        "created_at": quiz.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Quiz CRUD
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class QuizListView(View):
    """
    GET  /gamification/quizzes/  — list all quizzes for this org
    POST /gamification/quizzes/  — create a new quiz (org-scoped)
    """

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        quizzes = Quiz.objects.filter(organization=org).order_by("-created_at")
        data = [_quiz_data(q) for q in quizzes]
        return JsonResponse({"quizzes": data})

    def post(self, request):
        org, err = _get_org(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        question = (body.get("question") or "").strip()
        options = body.get("options")
        correct_answer = (body.get("correct_answer") or "").strip()

        if not question:
            return JsonResponse({"error": "question is required."}, status=400)
        if not isinstance(options, dict) or len(options) < 2:
            return JsonResponse(
                {"error": "options must be a dict with at least 2 entries, e.g. {\"a\": \"...\", \"b\": \"...\"}."},
                status=400,
            )
        if not correct_answer:
            return JsonResponse({"error": "correct_answer is required."}, status=400)
        if correct_answer not in options:
            return JsonResponse(
                {"error": f"correct_answer '{correct_answer}' must be one of the option keys: {list(options.keys())}."},
                status=400,
            )

        quiz = Quiz.objects.create(
            organization=org,
            question=question,
            options=options,
            correct_answer=correct_answer,
        )
        return JsonResponse(
            {"id": str(quiz.id), "question": quiz.question},
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class QuizDetailView(View):
    def get(self, request, quiz_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            quiz = Quiz.objects.get(id=quiz_id, organization=org)
        except Quiz.DoesNotExist:
            return JsonResponse({"error": "Quiz not found."}, status=404)
        return JsonResponse(_quiz_data(quiz))

    def delete(self, request, quiz_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            quiz = Quiz.objects.get(id=quiz_id, organization=org)
        except Quiz.DoesNotExist:
            return JsonResponse({"error": "Quiz not found."}, status=404)

        quiz.delete()
        return JsonResponse({"deleted": True})


# ---------------------------------------------------------------------------
# Quiz Submission
# ---------------------------------------------------------------------------

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
        except Quiz.DoesNotExist:
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


# ---------------------------------------------------------------------------
# Quiz Batches
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class QuizBatchListCreateView(View):
    """
    GET  /gamification/quiz-batches/  — list all batches for this org
    POST /gamification/quiz-batches/  — create a batch and assign employees
    """

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        batches = (
            QuizBatch.objects
            .filter(organization=org)
            .select_related("quiz")
            .annotate(assigned_count=Count("assignments"))
        )
        data = [
            {
                "id": str(b.id),
                "name": b.name,
                "quiz_id": str(b.quiz_id),
                "quiz_question": b.quiz.question,
                "assigned_count": b.assigned_count,
                "created_at": b.created_at.isoformat(),
            }
            for b in batches
        ]
        return JsonResponse({"batches": data})

    def post(self, request):
        org, err = _get_org(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        quiz_id = body.get("quiz_id")
        employee_ids = body.get("employee_ids")
        name = (body.get("name") or "").strip()

        if not quiz_id:
            return JsonResponse({"error": "quiz_id is required."}, status=400)
        if not isinstance(employee_ids, list) or not employee_ids:
            return JsonResponse({"error": "employee_ids must be a non-empty list."}, status=400)

        try:
            quiz = Quiz.objects.get(id=quiz_id, organization=org)
        except Quiz.DoesNotExist:
            return JsonResponse({"error": "Quiz not found."}, status=404)

        employees = Employee.objects.filter(
            id__in=employee_ids, organization=org, is_active=True
        )
        if not employees.exists():
            return JsonResponse({"error": "No eligible employees found."}, status=400)

        batch = QuizBatch.objects.create(organization=org, quiz=quiz, name=name)
        assigned = 0
        for emp in employees:
            _, created = QuizBatchAssignment.objects.get_or_create(batch=batch, employee=emp)
            if created:
                assigned += 1

        return JsonResponse(
            {
                "id": str(batch.id),
                "name": batch.name,
                "quiz_id": str(quiz.id),
                "assigned_count": assigned,
            },
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class QuizBatchDetailView(View):
    """GET /gamification/quiz-batches/<batch_id>/  — detail with per-employee completion status"""

    def get(self, request, batch_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            batch = QuizBatch.objects.select_related("quiz").get(
                id=batch_id, organization=org
            )
        except QuizBatch.DoesNotExist:
            return JsonResponse({"error": "Batch not found."}, status=404)

        assignments = batch.assignments.select_related("employee").order_by("assigned_at")

        # Build a lookup: employee_id -> QuizSubmission (for this quiz)
        submissions = {
            str(s.employee_id): s
            for s in QuizSubmission.objects.filter(
                quiz=batch.quiz,
                employee__in=[a.employee for a in assignments],
            )
        }

        rows = []
        for a in assignments:
            sub = submissions.get(str(a.employee_id))
            rows.append(
                {
                    "employee_id": str(a.employee_id),
                    "employee_name": a.employee.name,
                    "employee_email": a.employee.email,
                    "assigned_at": a.assigned_at.isoformat(),
                    "completed": sub is not None,
                    "is_correct": sub.is_correct if sub else None,
                    "answer_selected": sub.answer_selected if sub else None,
                    "submitted_at": sub.submitted_at.isoformat() if sub else None,
                }
            )

        completed_count = sum(1 for r in rows if r["completed"])
        correct_count = sum(1 for r in rows if r.get("is_correct"))

        return JsonResponse(
            {
                "id": str(batch.id),
                "name": batch.name,
                "quiz_id": str(batch.quiz_id),
                "quiz_question": batch.quiz.question,
                "quiz_options": batch.quiz.options,
                "created_at": batch.created_at.isoformat(),
                "total_assigned": len(rows),
                "completed_count": completed_count,
                "correct_count": correct_count,
                "completion_rate": round(completed_count / len(rows) * 100, 1) if rows else 0.0,
                "assignments": rows,
            }
        )


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

class LeaderboardView(View):
    """
    GET /gamification/leaderboard/
    Score = (+1 per correct quiz answer) + (-5 per phishing link clicked).
    """

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        # Lazy import to avoid circular dependency
        from phishing.models import PhishingSimulationTarget

        employees = Employee.objects.filter(organization=org, is_active=True)

        # Correct quiz submissions per employee (only org's quizzes count)
        quiz_scores = {
            str(row["employee_id"]): row["correct_count"]
            for row in QuizSubmission.objects.filter(
                employee__organization=org,
                quiz__organization=org,
                is_correct=True,
            )
            .values("employee_id")
            .annotate(correct_count=Count("id"))
        }

        # Phishing clicks per employee (only org's campaigns count)
        click_counts = {
            str(row["employee_id"]): row["click_count"]
            for row in PhishingSimulationTarget.objects.filter(
                campaign__organization=org,
                clicked_at__isnull=False,
            )
            .values("employee_id")
            .annotate(click_count=Count("id"))
        }

        rows = []
        for emp in employees:
            eid = str(emp.id)
            correct = quiz_scores.get(eid, 0)
            clicks = click_counts.get(eid, 0)
            score = correct - (clicks * 5)
            rows.append(
                {
                    "employee_id": eid,
                    "employee_name": emp.name,
                    "department": emp.department,
                    "role": emp.role,
                    "correct_quiz_answers": correct,
                    "phishing_clicks": clicks,
                    "total_score": score,
                }
            )

        rows.sort(key=lambda x: -x["total_score"])
        for i, row in enumerate(rows):
            row["rank"] = i + 1

        return JsonResponse({"leaderboard": rows})

