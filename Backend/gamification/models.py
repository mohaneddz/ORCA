import uuid

from django.db import models

from organizations.models import Device


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField()
    options = models.JSONField(
        help_text='Dict of option key -> label, e.g. {"a": "Option A", "b": "Option B"}'
    )
    correct_answer = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question[:80]


class QuizSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="quiz_submissions"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="submissions")
    answer_selected = models.CharField(max_length=255)
    is_correct = models.BooleanField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["employee", "quiz"]]

    def __str__(self):
        return f"{self.employee} - Quiz {self.quiz_id} ({'correct' if self.is_correct else 'wrong'})"
