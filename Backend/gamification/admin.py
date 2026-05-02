from django.contrib import admin

from .models import Quiz, QuizSubmission


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("question", "correct_answer", "created_at")
    readonly_fields = ("id", "created_at")


@admin.register(QuizSubmission)
class QuizSubmissionAdmin(admin.ModelAdmin):
    list_display = ("employee", "quiz", "answer_selected", "is_correct", "submitted_at")
    list_filter = ("is_correct",)
    search_fields = ("employee__employee_name",)
    readonly_fields = ("id", "submitted_at")
