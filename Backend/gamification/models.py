import uuid

from django.db import models

from organizations.models import Employee, Organization


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="quizzes",
        null=True,
        blank=True,
    )
    question = models.TextField()
    options = models.JSONField(
        help_text='Dict of option key -> label, e.g. {"a": "Option A", "b": "Option B"}'
    )
    correct_answer = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question[:80]


class QuizBatch(models.Model):
    """
    A named batch that assigns a specific quiz to a group of employees.
    Completion is tracked via the existing QuizSubmission model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="quiz_batches"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="batches")
    name = models.CharField(max_length=255, blank=True, default="")
    employees = models.ManyToManyField(
        Employee,
        through="QuizBatchAssignment",
        related_name="quiz_batches",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name or f"Batch {self.id}"


class QuizBatchAssignment(models.Model):
    """Through model — one row per employee assigned to a quiz batch."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        QuizBatch, on_delete=models.CASCADE, related_name="assignments"
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="quiz_batch_assignments"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("batch", "employee")]

    def __str__(self):
        return f"{self.employee} → {self.batch}"


class QuizSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="quiz_submissions"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="submissions")
    answer_selected = models.CharField(max_length=255)
    is_correct = models.BooleanField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["employee", "quiz"]]
        indexes = [
            models.Index(fields=["submitted_at"]),
            models.Index(fields=["is_correct"]),
        ]

    def __str__(self):
        return f"{self.employee} - Quiz {self.quiz_id} ({'correct' if self.is_correct else 'wrong'})"
