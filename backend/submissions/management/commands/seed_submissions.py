"""Seed ~15 realistic intake submissions.

Idempotent: skips if submissions already exist unless --force is given.
Terminal/in-review entries get matching StatusEvents so the audit
timeline has real content, and created_at is spread over the past five
days so relative timestamps look believable.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from submissions.constants import Status
from submissions.models import ReviewComment, StatusEvent, Submission

# (name, age, phone, concern, final_status)
SEED_DATA = [
    ("Meera Krishnan", 54, "+91 98450 12321", "Persistent lower back pain for six weeks, referred for lumbar spine MRI.", Status.IN_REVIEW),
    ("Arjun Patel", 41, "+91 99872 45510", "Follow-up chest X-ray after pneumonia treatment completed last month.", Status.APPROVED),
    ("Sunita Sharma", 67, "+91 98220 78834", "Recurring headaches with occasional blurred vision, neurologist requested brain CT.", Status.NEW),
    ("Rahul Verma", 29, "+91 97010 33445", "Sports injury to right knee, orthopedic referral for MRI to rule out ACL tear.", Status.IN_REVIEW),
    ("Lakshmi Nair", 72, "+91 94470 91123", "Annual screening mammogram, family history of breast cancer.", Status.APPROVED),
    ("Imran Shaikh", 35, "+91 98670 55672", "Abdominal ultrasound for intermittent right-side pain after meals, suspected gallstones.", Status.NEW),
    ("Priya Raghavan", 48, "+91 90080 24456", "Thyroid nodule found on physical exam, endocrinologist requested neck ultrasound with possible biopsy follow-up.", Status.REJECTED),
    ("Devendra Singh", 61, "+91 98110 67789", "Chest pain on exertion, cardiologist ordered coronary CT angiogram.", Status.IN_REVIEW),
    ("Ananya Bose", 8, "+91 98300 41190", "Pediatric wrist X-ray after playground fall, swelling and limited movement.", Status.APPROVED),
    ("Mohammed Farooq", 55, "+91 99450 88213", "Chronic sinus congestion unresponsive to medication, ENT requested sinus CT.", Status.NEW),
    ("Kavita Deshpande", 38, "+91 98905 12678", "Unexplained weight loss and fatigue over three months; physician ordered full abdominal and pelvic CT with contrast to investigate possible underlying causes, priority requested.", Status.NEW),
    ("George Thomas", 70, "+91 94950 33421", "Post-stroke follow-up MRI scheduled by neurology, six-month checkpoint.", Status.APPROVED),
    ("Ritu Malhotra", 26, "+91 98100 76645", "First-trimester dating ultrasound, referred by obstetrician.", Status.NEW),
    ("Sanjay Kulkarni", 63, "+91 98811 20934", "Lower urinary symptoms, urologist requested pelvic ultrasound and PSA follow-up imaging.", Status.REJECTED),
    ("Fatima Begum", 90, "+91 97400 58812", "Hip pain after minor fall at home, X-ray to rule out fracture.", Status.NEW),
    ("Vikram Iyer", 0, "+91 98860 34567", "Newborn hip ultrasound, routine screening for developmental dysplasia.", Status.IN_REVIEW),
]

# The path every submission takes to reach its seeded status.
PATHS = {
    Status.NEW: [],
    Status.IN_REVIEW: [(Status.NEW, Status.IN_REVIEW)],
    Status.APPROVED: [(Status.NEW, Status.IN_REVIEW), (Status.IN_REVIEW, Status.APPROVED)],
    Status.REJECTED: [(Status.NEW, Status.IN_REVIEW), (Status.IN_REVIEW, Status.REJECTED)],
}

COMMENT_SEEDS = {
    "Meera Krishnan": [
        ("Front desk", "Referral note mentions worsening pain after standing."),
    ],
    "Rahul Verma": [
        ("Reviewer", "Confirm if prior knee imaging is available before approval."),
    ],
    "Devendra Singh": [
        ("Reviewer", "Cardiology referral looks complete; check contrast allergy field."),
    ],
}


class Command(BaseCommand):
    help = "Seed the database with example intake submissions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete existing submissions and reseed.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if Submission.objects.exists():
            if not options["force"]:
                self.stdout.write("Submissions already exist — skipping (use --force to reseed).")
                return
            Submission.objects.all().delete()

        random.seed(42)  # deterministic timestamps between runs
        now = timezone.now()

        for i, (name, age, phone, concern, final_status) in enumerate(SEED_DATA):
            created = now - timedelta(
                days=random.uniform(0, 5), minutes=random.uniform(0, 59)
            )
            submission = Submission.objects.create(
                patient_name=name,
                age=age,
                phone=phone,
                primary_concern=concern,
                status=final_status,
            )
            # auto_now_add ignores passed values, so set timestamps after.
            Submission.objects.filter(pk=submission.pk).update(
                created_at=created, updated_at=created
            )

            step_time = created
            for from_status, to_status in PATHS[final_status]:
                step_time += timedelta(hours=random.uniform(1, 12))
                event = StatusEvent.objects.create(
                    submission=submission,
                    from_status=from_status,
                    to_status=to_status,
                )
                StatusEvent.objects.filter(pk=event.pk).update(created_at=step_time)
                Submission.objects.filter(pk=submission.pk).update(
                    updated_at=step_time
                )

            for author, body in COMMENT_SEEDS.get(name, []):
                comment = ReviewComment.objects.create(
                    submission=submission,
                    author=author,
                    body=body,
                )
                ReviewComment.objects.filter(pk=comment.pk).update(
                    created_at=step_time + timedelta(minutes=20)
                )

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {len(SEED_DATA)} submissions.")
        )
