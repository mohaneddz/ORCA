"""
Phishing simulation services:
  - Culturally-localised template library (4 attack types × 4 languages × 3 difficulties)
  - Optional AI generation via NVIDIA NIM API when NVIDIA_API_KEY is set in the environment
  - Employee difficulty auto-progression
"""

import json
import os
from typing import Optional

# ---------------------------------------------------------------------------
# Static template library
# Each entry: {subject, body, sender_name, sender_domain}
# Placeholders:  {{employee_name}}  {{tracking_url}}  {{org_name}}
# ---------------------------------------------------------------------------

_LIBRARY: dict = {
    # ================================================================
    # IT_RESET
    # ================================================================
    "IT_RESET": {
        "EN": {
            1: {
                "subject": "URGENT!! Your account pasword will be EXPIRED",
                "sender_name": "IT-Support Team",
                "sender_domain": "it-helpdesk-secure.net",
                "body": (
                    "Dear User,\n\n"
                    "Your account pasword is about to expire. You must reset it IMMEDIATLY "
                    "or you account will be locked and you cannot access company system.\n\n"
                    "Click here to reset: {{tracking_url}}\n\n"
                    "Ignore this email if you already reset.\n\n"
                    "-- IT Support"
                ),
            },
            2: {
                "subject": "Action Required: Your Microsoft 365 session will expire in 12 hours",
                "sender_name": "{{org_name}} IT Helpdesk",
                "sender_domain": "microsoft365-helpdesk-portal.com",
                "body": (
                    "Hello,\n\n"
                    "IT Helpdesk Reference: INC-20260502-4471\n\n"
                    "Our monitoring system has detected that your Microsoft 365 credentials "
                    "are scheduled to expire in 12 hours as part of our quarterly security rotation.\n\n"
                    "Failure to update your credentials before the deadline will result in:\n"
                    "  \u2022 Loss of access to Outlook and Teams\n"
                    "  \u2022 VPN disconnection\n"
                    "  \u2022 Suspension of SharePoint and OneDrive access\n\n"
                    "Please update your credentials via the secure IT portal:\n\n"
                    "  {{tracking_url}}\n\n"
                    "This process takes less than 2 minutes. If you have already completed "
                    "this action, please disregard this notice.\n\n"
                    "Kind regards,\n"
                    "IT Helpdesk | {{org_name}}\n"
                    "Ticket: INC-20260502-4471"
                ),
            },
            3: {
                "subject": "Re: Azure AD sync error — your account flagged for forced reset tonight",
                "sender_name": "IT Security — {{org_name}}",
                "sender_domain": "it.{{org_slug}}-corp.com",
                "body": (
                    "Hi {{employee_name}},\n\n"
                    "Following up on the Azure Active Directory synchronisation issue we "
                    "notified teams about earlier this week — your account has been flagged "
                    "by our security monitoring as one of the affected accounts.\n\n"
                    "Without intervention, your account will be subject to a forced password "
                    "reset at 23:59 tonight, which may cause a brief disruption to your access. "
                    "To avoid this and reset on your own terms, please use the self-service "
                    "link below before end of business today:\n\n"
                    "  {{tracking_url}}\n\n"
                    "You will be asked to verify your identity via your registered MFA method "
                    "before setting the new password. This is a one-time action.\n\n"
                    "If you have already spoken with the IT desk about this, please ignore "
                    "this automated follow-up.\n\n"
                    "Best regards,\n"
                    "IT Security Team\n"
                    "{{org_name}}\n"
                    "Ref: SEC-2026-AZ-0091"
                ),
            },
        },
        "FR": {
            1: {
                "subject": "URGENT!! Votre mot de pass va expirer MAINTENANT",
                "sender_name": "Support-Informatique",
                "sender_domain": "support-it-secure.net",
                "body": (
                    "Cher utilisateur,\n\n"
                    "Votre mot de pass de compte va expirer. Vous devez le reinitialiser IMMEDIATEMENT "
                    "ou votre acces sera bloquer.\n\n"
                    "Cliquer ici: {{tracking_url}}\n\n"
                    "-- L'equipe IT"
                ),
            },
            2: {
                "subject": "Action requise : votre mot de passe expire dans 24 heures",
                "sender_name": "Support IT — {{org_name}}",
                "sender_domain": "notifications-it-helpdesk.fr",
                "body": (
                    "Bonjour,\n\n"
                    "Nos systèmes indiquent que votre mot de passe réseau arrivera à expiration "
                    "dans les 24 prochaines heures.\n"
                    "Pour éviter tout blocage, veuillez le réinitialiser via le lien ci-dessous :\n\n"
                    "  {{tracking_url}}\n\n"
                    "Sans action de votre part, votre compte sera suspendu pour vérification "
                    "par l'équipe informatique.\n\n"
                    "Cordialement,\n"
                    "Support IT — {{org_name}}"
                ),
            },
            3: {
                "subject": "Expiration de mot de passe — action requise avant 17h00",
                "sender_name": "Sécurité Informatique — {{org_name}}",
                "sender_domain": "it.{{org_slug}}-corp.fr",
                "body": (
                    "Bonjour {{employee_name}},\n\n"
                    "Dans le cadre de notre cycle trimestriel de sécurité, votre mot de passe "
                    "Active Directory expirera à 17h00 aujourd'hui.\n\n"
                    "Veuillez utiliser le portail ci-dessous pour définir un nouveau mot de passe "
                    "avant l'échéance afin d'éviter toute interruption de service (messagerie, VPN, SI) :\n\n"
                    "  {{tracking_url}}\n\n"
                    "Si vous avez déjà changé votre mot de passe dans les 48 dernières heures, "
                    "vous pouvez ignorer ce message.\n\n"
                    "Cordialement,\n"
                    "L'équipe Sécurité Informatique\n"
                    "{{org_name}}"
                ),
            },
        },
        "AR_MSA": {
            1: {
                "subject": "عاجل!! كلمة مرورك ستنتهي الآن",
                "sender_name": "فريق دعم تقنية المعلومات",
                "sender_domain": "it-support-secure.net",
                "body": (
                    "عزيزي المستخدم،\n\n"
                    "كلمة مرور حسابك على وشك الانتهاء. يجب عليك إعادة تعيينها الآن وإلا سيتم قفل حسابك.\n\n"
                    "انقر هنا لإعادة التعيين: {{tracking_url}}\n\n"
                    "-- فريق تقنية المعلومات"
                ),
            },
            2: {
                "subject": "إجراء مطلوب: ستنتهي صلاحية كلمة مرورك خلال 24 ساعة",
                "sender_name": "مكتب دعم تقنية المعلومات — {{org_name}}",
                "sender_domain": "it-notifications.support-desk.com",
                "body": (
                    "مرحباً،\n\n"
                    "تشير سجلاتنا إلى أن كلمة مرور شبكتك ستنتهي خلال 24 ساعة.\n"
                    "لتجنب قفل حسابك، يرجى إعادة تعيين كلمة المرور عبر الرابط أدناه:\n\n"
                    "  {{tracking_url}}\n\n"
                    "في حال عدم اتخاذ أي إجراء، سيتم تعليق حسابك ريثما يراجعه فريق تقنية المعلومات.\n\n"
                    "مع التحية،\n"
                    "دعم تقنية المعلومات — {{org_name}}"
                ),
            },
            3: {
                "subject": "إشعار انتهاء كلمة المرور — يُرجى اتخاذ الإجراء اللازم قبل الساعة 17:00",
                "sender_name": "أمن المعلومات — {{org_name}}",
                "sender_domain": "it.{{org_slug}}-corp.com",
                "body": (
                    "عزيزي {{employee_name}}،\n\n"
                    "في إطار دورة الأمان الفصلية، ستنتهي صلاحية كلمة مرور بريدك في Active Directory "
                    "الساعة 17:00 اليوم.\n\n"
                    "يرجى استخدام البوابة الذاتية أدناه لتعيين كلمة مرور جديدة قبل الموعد المحدد "
                    "تفادياً لأي انقطاع في الوصول إلى بريدك الإلكتروني أو الشبكة الافتراضية الخاصة:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إذا كنت قد غيّرت كلمة مرورك في الـ 48 ساعة الماضية، يمكنك تجاهل هذا الإشعار.\n\n"
                    "مع التحية،\n"
                    "فريق أمن المعلومات\n"
                    "{{org_name}}"
                ),
            },
        },
        "AR_DARIJA": {
            1: {
                "subject": "عاجل!! كلمة السر ديالك غادي تنتهي دابا",
                "sender_name": "فريق IT",
                "sender_domain": "it-support-helpdesk.net",
                "body": (
                    "صاحبي،\n\n"
                    "كلمة السر ديال الأكونت ديالك غادي تنتهي. خاصك تبدلها دابا وإلا غيلاك البلوكاج.\n\n"
                    "كليك هنا: {{tracking_url}}\n\n"
                    "-- فريق IT"
                ),
            },
            2: {
                "subject": "مهم: كلمة السر ديالك غادي تنتهي من 24 ساعة",
                "sender_name": "دعم IT — {{org_name}}",
                "sender_domain": "notifications-it.support-desk.ma",
                "body": (
                    "السلام عليكم،\n\n"
                    "النظام ديالنا لاحظ أن كلمة السر ديال الشبكة ديالك غادي تنتهي من 24 ساعة.\n"
                    "باش ما تعمليكش البلوكاج، بدل كلمة السر ديالك من هنا:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إلا ما دريتيش والو، الحساب ديالك غايتعلق حتى يراجعه فريق IT.\n\n"
                    "شكراً,\n"
                    "فريق IT — {{org_name}}"
                ),
            },
            3: {
                "subject": "إشعار: كلمة السر ديالك غادي تنتهي قبل 5 ديلعشية",
                "sender_name": "أمن IT — {{org_name}}",
                "sender_domain": "it.{{org_slug}}-corp.ma",
                "body": (
                    "السلام عليكم {{employee_name}}،\n\n"
                    "كيما كنعاودو كل ربع سنة، كلمة السر Active Directory ديالك غادي تنتهي "
                    "اليوم قبل 5 ديلعشية.\n\n"
                    "عافاك استعمل البوابة هادي باش تبدل كلمة السر ديالك قبل الوقت المحدد، "
                    "حتى ما يتقطعش عليك الأيميل والـ VPN:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إلا كنت بدلتيها من 48 ساعة، خليها هكذا.\n\n"
                    "شكراً,\n"
                    "فريق أمن IT\n"
                    "{{org_name}}"
                ),
            },
        },
    },

    # ================================================================
    # INVOICE
    # ================================================================
    "INVOICE": {
        "EN": {
            1: {
                "subject": "INVOICE #8821 Need Approve ASAP!!",
                "sender_name": "Finance Dept",
                "sender_domain": "invoices-approve-now.net",
                "body": (
                    "Hello,\n\n"
                    "There is invoice number 8821 for $12,450 that need your approve urgent.\n"
                    "If not approve today it will be late fee charge.\n\n"
                    "Click to approve: {{tracking_url}}\n\n"
                    "Finance"
                ),
            },
            2: {
                "subject": "Invoice #INV-2026-0441 awaiting your approval — payment terms expiring today",
                "sender_name": "{{org_name}} Accounts Payable",
                "sender_domain": "accounts-payable-invoicing.net",
                "body": (
                    "Hello,\n\n"
                    "Accounts Payable Reference: AP-2026-0441\n\n"
                    "The following invoice has been routed to you for approval in our ERP system "
                    "and requires your sign-off before end of today to meet the 30-day payment term:\n\n"
                    "  Vendor:    Logistics Pro International Ltd\n"
                    "  Invoice:   #INV-2026-0441\n"
                    "  Amount:    $8,200.00\n"
                    "  Due date:  May 3, 2026\n\n"
                    "Missing this deadline will trigger a 1.5% late penalty and may suspend "
                    "our vendor account.\n\n"
                    "Please review and approve here:\n\n"
                    "  {{tracking_url}}\n\n"
                    "Regards,\n"
                    "Accounts Payable Team\n"
                    "{{org_name}}"
                ),
            },
            3: {
                "subject": "Fwd: INV-2026-0441 — needs your sign-off today (I'm in back-to-back meetings)",
                "sender_name": "{{org_name}} Finance",
                "sender_domain": "finance.{{org_slug}}-corp.com",
                "body": (
                    "Hi {{employee_name}},\n\n"
                    "Forwarding this for your urgent attention — I've been in back-to-back "
                    "meetings all day and the payment window for Logistics Pro closes tonight.\n\n"
                    "  Vendor:    Logistics Pro International Ltd\n"
                    "  Invoice:   #INV-2026-0441\n"
                    "  Amount:    $8,200.00\n"
                    "  Terms:     Net 30 (expires today)\n\n"
                    "Can you log in and approve directly here? Should only take a minute:\n\n"
                    "  {{tracking_url}}\n\n"
                    "They've been a reliable partner and I'd hate to lose the account over a "
                    "late payment. Let me know once it's done.\n\n"
                    "Thanks,\n"
                    "Finance Team\n"
                    "{{org_name}}"
                ),
            },
        },
        "FR": {
            1: {
                "subject": "FACTURE #8821 Besoin Approbation URGENT!!",
                "sender_name": "Comptabilite",
                "sender_domain": "factures-approuver.net",
                "body": (
                    "Bonjour,\n\n"
                    "La facture numéro 8821 de 12 450 € besoin votre approbation urgent.\n"
                    "Si pas approuver aujourd'hui il y a frais retard.\n\n"
                    "Cliquer pour approuver: {{tracking_url}}\n\n"
                    "Comptabilite"
                ),
            },
            2: {
                "subject": "Facture #FAC-2026-0441 — Approbation requise",
                "sender_name": "Comptabilité Fournisseurs — {{org_name}}",
                "sender_domain": "notifications-facturation.ap-portail.fr",
                "body": (
                    "Bonjour,\n\n"
                    "La facture n° FAC-2026-0441 (8 200,00 €) du fournisseur Logistics Pro "
                    "a été soumise à validation et nécessite votre approbation avant la fin "
                    "de journée.\n\n"
                    "Veuillez l'approuver via le lien suivant :\n\n"
                    "  {{tracking_url}}\n\n"
                    "Sans action de votre part, des pénalités de retard pourront s'appliquer.\n\n"
                    "Cordialement,\n"
                    "Comptabilité Fournisseurs — {{org_name}}"
                ),
            },
            3: {
                "subject": "Suite : Facture #FAC-2026-0441 — votre validation est la dernière étape",
                "sender_name": "Finance — {{org_name}}",
                "sender_domain": "finance.{{org_slug}}-interne.fr",
                "body": (
                    "Bonjour {{employee_name}},\n\n"
                    "Je vous contacte concernant la facture n° FAC-2026-0441 (8 200,00 €) "
                    "de Logistics Pro SARL. Votre validation est la dernière étape avant que "
                    "nous puissions procéder au règlement avant l'expiration de l'échéance "
                    "à 30 jours demain.\n\n"
                    "Vous pouvez consulter la facture et valider en un clic ici :\n\n"
                    "  {{tracking_url}}\n\n"
                    "N'hésitez pas à me contacter pour toute question.\n\n"
                    "Cordialement,\n"
                    "Équipe Finance\n"
                    "{{org_name}}"
                ),
            },
        },
        "AR_MSA": {
            1: {
                "subject": "فاتورة #8821 تحتاج موافقة عاجلة!!",
                "sender_name": "قسم المحاسبة",
                "sender_domain": "fatourah-approv.net",
                "body": (
                    "مرحباً،\n\n"
                    "الفاتورة رقم 8821 بمبلغ 12,450 درهم تحتاج موافقتك الآن.\n"
                    "إذا لم تتمت الموافقة اليوم سيكون هناك غرامة تأخير.\n\n"
                    "انقر للموافقة: {{tracking_url}}\n\n"
                    "قسم المحاسبة"
                ),
            },
            2: {
                "subject": "فاتورة #INV-2026-0441 — مطلوب موافقتك",
                "sender_name": "الحسابات الدائنة — {{org_name}}",
                "sender_domain": "notifications-invoicing.ap-portal.com",
                "body": (
                    "مرحباً،\n\n"
                    "تم تقديم الفاتورة رقم INV-2026-0441 بمبلغ 8,200.00 ريال من المورد Logistics Pro "
                    "للموافقة عليها، وتستلزم توقيعك قبل نهاية يوم العمل اليوم.\n\n"
                    "يرجى المراجعة والموافقة عبر الرابط:\n\n"
                    "  {{tracking_url}}\n\n"
                    "عدم الموافقة قبل الموعد المحدد قد يُفضي إلى غرامات تأخير.\n\n"
                    "مع التحية،\n"
                    "الحسابات الدائنة — {{org_name}}"
                ),
            },
            3: {
                "subject": "متابعة: فاتورة #INV-2026-0441 — موافقتك هي الخطوة الأخيرة",
                "sender_name": "الإدارة المالية — {{org_name}}",
                "sender_domain": "finance.{{org_slug}}-internal.com",
                "body": (
                    "عزيزي {{employee_name}}،\n\n"
                    "أتواصل معك بشأن الفاتورة رقم INV-2026-0441 بمبلغ 8,200.00 ريال من شركة "
                    "Logistics Pro. موافقتك هي الخطوة الأخيرة قبل معالجة الدفع قبل انتهاء "
                    "أجل الثلاثين يوماً غداً.\n\n"
                    "يمكنك مراجعة الفاتورة والموافقة بنقرة واحدة من هنا:\n\n"
                    "  {{tracking_url}}\n\n"
                    "لا تتردد في التواصل معي لأي استفسار.\n\n"
                    "مع التحية،\n"
                    "الفريق المالي\n"
                    "{{org_name}}"
                ),
            },
        },
        "AR_DARIJA": {
            1: {
                "subject": "فاتورة #8821 محتاجة موافقة عاجلة!!",
                "sender_name": "محاسبة",
                "sender_domain": "fatourah-dial-approv.net",
                "body": (
                    "سلام،\n\n"
                    "كاين فاتورة رقم 8821 ب 12,450 درهم محتاجة موافقتك دابا.\n"
                    "إلا ما وافقتيش اليوم غيكون غرامة تأخير.\n\n"
                    "كليك هنا: {{tracking_url}}\n\n"
                    "المحاسبة"
                ),
            },
            2: {
                "subject": "فاتورة #FAC-2026-0441 — محتاجة موافقتك",
                "sender_name": "محاسبة الموردين — {{org_name}}",
                "sender_domain": "notifications-fatourah.portail-ap.ma",
                "body": (
                    "السلام عليكم،\n\n"
                    "الفاتورة رقم FAC-2026-0441 بـ 8,200 درهم من المورد Logistics Pro "
                    "محتاجة موافقتك قبل الغروب اليوم.\n\n"
                    "عافاك راجع الفاتورة ووافق من هنا:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إلا ما وافقتيش في الوقت، ممكن تكون غرامة تأخير.\n\n"
                    "شكراً,\n"
                    "محاسبة الموردين — {{org_name}}"
                ),
            },
            3: {
                "subject": "متابعة: فاتورة #FAC-2026-0441 — موافقتك هي آخر خطوة",
                "sender_name": "المالية — {{org_name}}",
                "sender_domain": "finance.{{org_slug}}-internal.ma",
                "body": (
                    "السلام عليكم {{employee_name}}،\n\n"
                    "كنتواصل معاك على موضوع الفاتورة رقم FAC-2026-0441 بـ 8,200 درهم "
                    "من Logistics Pro. موافقتك هي آخر خطوة باش نقدرو نسددو قبل ما تنتهي "
                    "المدة ديال 30 يوم غداً.\n\n"
                    "قادر تراجع الفاتورة وتوافق بكليك واحد من هنا:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إلا عندك أي سؤال، أنا موجود.\n\n"
                    "شكراً,\n"
                    "فريق المالية\n"
                    "{{org_name}}"
                ),
            },
        },
    },

    # ================================================================
    # DELIVERY
    # ================================================================
    "DELIVERY": {
        "EN": {
            1: {
                "subject": "Your package is WAITING!! Confirm adress NOW",
                "sender_name": "Delivery Service",
                "sender_domain": "pkg-delivery-confirm.net",
                "body": (
                    "Hello Customer,\n\n"
                    "Your package is waiting at depot. We cannot deliver because address problem.\n"
                    "You must confirm your address NOW or package return to sender.\n\n"
                    "Confirm here: {{tracking_url}}\n\n"
                    "-- Delivery Team"
                ),
            },
            2: {
                "subject": "DHL Express: Delivery attempted — parcel held at sorting centre",
                "sender_name": "DHL Express Notifications",
                "sender_domain": "dhl-express-notifications.delivery-track.com",
                "body": (
                    "DHL Express — Delivery Notification\n\n"
                    "Tracking number: 1Z9R84E00342261400\n\n"
                    "We attempted to deliver your parcel today but were unable to complete "
                    "the delivery due to an incomplete address on file.\n\n"
                    "Your parcel is now held at our sorting centre and will be available for "
                    "5 business days. After this period it will be returned to the sender.\n\n"
                    "To schedule a redelivery or redirect to a DHL ServicePoint near you:\n\n"
                    "  {{tracking_url}}\n\n"
                    "If you did not expect a delivery, please contact us immediately.\n\n"
                    "DHL Express Customer Service"
                ),
            },
            3: {
                "subject": "Your parcel 1Z9R84E00342261400 — customs duty of MAD 49 required for release",
                "sender_name": "DHL Customs & Clearance — {{org_name}} Logistics",
                "sender_domain": "customs.{{org_slug}}-dhl-logistics.com",
                "body": (
                    "Dear {{employee_name}},\n\n"
                    "Your DHL Express parcel (Tracking: 1Z9R84E00342261400) has been held at "
                    "Casablanca customs since May 1, 2026 pending payment of a mandatory "
                    "import duty of MAD 49.00.\n\n"
                    "Parcel details:\n"
                    "  Origin:      Amsterdam, Netherlands\n"
                    "  Weight:      1.4 kg\n"
                    "  Contents:    Electronic accessories\n"
                    "  Duty ref:    MA-CUSTOMS-2026-0049\n\n"
                    "To release your parcel and receive same-day delivery, please pay the duty "
                    "through our secure clearance portal within 48 hours:\n\n"
                    "  {{tracking_url}}\n\n"
                    "After 48 hours without payment the parcel will be returned to the sender "
                    "at additional cost.\n\n"
                    "Kind regards,\n"
                    "DHL Customs Team\n"
                    "{{org_name}} Logistics"
                ),
            },
        },
        "FR": {
            1: {
                "subject": "Votre colis ATTEND!! Confirmez votre adresse MAINTENANT",
                "sender_name": "Service Livraison",
                "sender_domain": "colis-confirmer-adresse.net",
                "body": (
                    "Cher client,\n\n"
                    "Votre colis attend au dépôt. Nous ne pouvons pas livrer à cause de problème adresse.\n"
                    "Vous devez confirmer adresse MAINTENANT sinon colis retour à l'envoyeur.\n\n"
                    "Confirmer ici: {{tracking_url}}\n\n"
                    "-- Livraison"
                ),
            },
            2: {
                "subject": "Tentative de livraison échouée — reprogrammez votre colis",
                "sender_name": "Service Suivi Colis",
                "sender_domain": "colis-notifications-relivraison.fr",
                "body": (
                    "Bonjour,\n\n"
                    "Nous avons tenté de livrer votre colis (Suivi : BD-2026-88241) aujourd'hui "
                    "mais n'avons pas pu finaliser la livraison.\n\n"
                    "Veuillez reprogrammer votre livraison ou choisir un point relais ci-dessous. "
                    "Votre colis sera conservé 5 jours ouvrés avant d'être retourné à l'expéditeur :\n\n"
                    "  {{tracking_url}}\n\n"
                    "Service Suivi Colis"
                ),
            },
            3: {
                "subject": "Votre colis BD-2026-88241 est bloqué en douane — action requise",
                "sender_name": "Douane & Livraison — {{org_name}} Logistique",
                "sender_domain": "logistique.{{org_slug}}-livraison.fr",
                "body": (
                    "Bonjour {{employee_name}},\n\n"
                    "Votre colis (Réf : BD-2026-88241) est actuellement retenu en douane, "
                    "en attente du règlement de frais administratifs de 3,50 € pour finaliser "
                    "le dédouanement.\n\n"
                    "Pour éviter tout délai et garantir une livraison le jour même, "
                    "veuillez régler les frais sur notre portail sécurisé :\n\n"
                    "  {{tracking_url}}\n\n"
                    "Ce règlement est requis par la réglementation douanière et doit "
                    "intervenir sous 48 heures pour éviter le retour du colis.\n\n"
                    "Cordialement,\n"
                    "{{org_name}} Logistique"
                ),
            },
        },
        "AR_MSA": {
            1: {
                "subject": "طردك في انتظارك!! أكّد عنوانك الآن",
                "sender_name": "خدمة التوصيل",
                "sender_domain": "pkg-taslim-confirm.net",
                "body": (
                    "عزيزي العميل،\n\n"
                    "طردك ينتظر في المستودع. لا يمكننا التوصيل بسبب مشكلة في العنوان.\n"
                    "يجب عليك تأكيد عنوانك الآن أو سيُعاد الطرد إلى المرسل.\n\n"
                    "أكّد هنا: {{tracking_url}}\n\n"
                    "-- فريق التوصيل"
                ),
            },
            2: {
                "subject": "محاولة توصيل فاشلة — أعد جدولة طردك",
                "sender_name": "خدمة تتبع الطرود",
                "sender_domain": "tarsil-notifications-jaddid.com",
                "body": (
                    "مرحباً،\n\n"
                    "حاولنا توصيل طردك (رقم التتبع: BD-2026-88241) اليوم إلا أننا لم نتمكن "
                    "من إتمام التوصيل.\n\n"
                    "يرجى إعادة الجدولة أو اختيار نقطة استلام عبر الرابط أدناه. "
                    "سيُحتفظ بالطرد لمدة 5 أيام عمل قبل إعادته إلى المرسل:\n\n"
                    "  {{tracking_url}}\n\n"
                    "خدمة تتبع الطرود"
                ),
            },
            3: {
                "subject": "طردك BD-2026-88241 موقوف في الجمارك — إجراء مطلوب",
                "sender_name": "الجمارك والتوصيل — {{org_name}} للخدمات اللوجستية",
                "sender_domain": "logistics.{{org_slug}}-delivery.com",
                "body": (
                    "عزيزي {{employee_name}}،\n\n"
                    "طردك (المرجع: BD-2026-88241) محتجز حالياً في الجمارك في انتظار سداد "
                    "رسوم إدارية بسيطة بقيمة 35 درهماً لإتمام الإفراج الجمركي.\n\n"
                    "لتفادي أي تأخير وضمان التوصيل في اليوم ذاته، يرجى تسديد الرسوم "
                    "عبر بوابتنا الآمنة:\n\n"
                    "  {{tracking_url}}\n\n"
                    "هذه الرسوم مطلوبة بموجب اللوائح الجمركية ويجب سدادها خلال 48 ساعة "
                    "تجنباً لإعادة الطرد.\n\n"
                    "مع التحية،\n"
                    "{{org_name}} للخدمات اللوجستية"
                ),
            },
        },
        "AR_DARIJA": {
            1: {
                "subject": "الطرد ديالك كيتسناك!! أكد العنوان ديالك دابا",
                "sender_name": "خدمة التوصيل",
                "sender_domain": "tarsil-confirm-adresse.net",
                "body": (
                    "صاحبي،\n\n"
                    "الطرد ديالك كيتسناك في الدبو. ما قدرناش نوصلوه بسبب مشكل في العنوان.\n"
                    "خاصك تأكد العنوان دابا وإلا يرجع للمرسل.\n\n"
                    "أكد من هنا: {{tracking_url}}\n\n"
                    "-- فريق التوصيل"
                ),
            },
            2: {
                "subject": "محاولة التوصيل فشلات — عاود جدول الطرد ديالك",
                "sender_name": "خدمة تتبع الطرود",
                "sender_domain": "tarsil-notifications.suivi-ma.com",
                "body": (
                    "السلام عليكم،\n\n"
                    "حاولنا نوصلو الطرد ديالك (رقم: BD-2026-88241) اليوم ولكن ما تقدرناش.\n\n"
                    "عافاك عاود جدول التوصيل أو اختار نقطة استلام من هنا. "
                    "الطرد غيتسنى 5 أيام وإلا يرجع للمرسل:\n\n"
                    "  {{tracking_url}}\n\n"
                    "خدمة تتبع الطرود"
                ),
            },
            3: {
                "subject": "الطرد ديالك BD-2026-88241 موقوف في الجمارك — خاص تتصرف",
                "sender_name": "الجمارك والتوصيل — {{org_name}}",
                "sender_domain": "logistique.{{org_slug}}-tarsil.ma",
                "body": (
                    "السلام عليكم {{employee_name}}،\n\n"
                    "الطرد ديالك (مرجع: BD-2026-88241) موقوف دابا في الجمارك. "
                    "خاصنا رسوم إدارية بسيطة ب 35 درهم باش نكملو الإفراج الجمركي.\n\n"
                    "باش ما يتأخرش التوصيل، عافاك سدد الرسوم من هنا:\n\n"
                    "  {{tracking_url}}\n\n"
                    "هاد الرسوم مطلوبة بالقانون وخاص تسددها من 48 ساعة وإلا يرجع الطرد.\n\n"
                    "شكراً,\n"
                    "{{org_name}}"
                ),
            },
        },
    },

    # ================================================================
    # HR_UPDATE
    # ================================================================
    "HR_UPDATE": {
        "EN": {
            1: {
                "subject": "IMPORTANT!! New HR polcy you must sign NOW",
                "sender_name": "HR Departement",
                "sender_domain": "hr-policy-sign-now.net",
                "body": (
                    "Dear Employee,\n\n"
                    "There is new HR polcy document that ALL employees must sign TODAY.\n"
                    "If you dont sign by end of day there is desciplinary action.\n\n"
                    "Sign here: {{tracking_url}}\n\n"
                    "HR"
                ),
            },
            2: {
                "subject": "Benefits Open Enrollment closes May 9 — complete your selection now",
                "sender_name": "Human Resources — {{org_name}}",
                "sender_domain": "hr-benefits-enrollment-portal.com",
                "body": (
                    "Dear Team Member,\n\n"
                    "Employee Benefits Reference: ENR-2026-Q2\n\n"
                    "This is a reminder that the annual Benefits Open Enrollment window closes "
                    "on May 9, 2026. Employees who do not complete their selection by the deadline "
                    "will be automatically enrolled in the default plan, which may not reflect "
                    "your personal needs or recent life changes.\n\n"
                    "Available elections include:\n"
                    "  \u2022 Health insurance (3 plan tiers)\n"
                    "  \u2022 Dental and vision coverage\n"
                    "  \u2022 Supplemental life insurance\n"
                    "  \u2022 Flexible Spending Account (FSA)\n\n"
                    "Log in to the benefits portal to review your current elections and make changes:\n\n"
                    "  {{tracking_url}}\n\n"
                    "Human Resources\n"
                    "{{org_name}}"
                ),
            },
            3: {
                "subject": "{{employee_name}}, your benefits enrollment is still incomplete",
                "sender_name": "HR — {{org_name}}",
                "sender_domain": "hr.{{org_slug}}-corp.com",
                "body": (
                    "Hi {{employee_name}},\n\n"
                    "I'm reaching out because our records show your benefits enrollment for "
                    "the upcoming plan year (June 2026 – May 2027) is still incomplete.\n\n"
                    "Given your role, you may be eligible for the enhanced health coverage tier "
                    "and the additional FSA contribution limit introduced this cycle. "
                    "These options won't carry over if you miss the window.\n\n"
                    "The enrollment deadline is May 9. It takes about 4 minutes to review "
                    "your options and confirm:\n\n"
                    "  {{tracking_url}}\n\n"
                    "You'll need to log in with your company SSO credentials. If you've already "
                    "completed this, please disregard — our system may have a brief reporting lag.\n\n"
                    "Best,\n"
                    "HR Team\n"
                    "{{org_name}}"
                ),
            },
        },
        "FR": {
            1: {
                "subject": "IMPORTANT!! Nouvelle politque RH vous devez signer MAINTENANT",
                "sender_name": "Departement RH",
                "sender_domain": "rh-politique-signer.net",
                "body": (
                    "Cher employé,\n\n"
                    "Il y a nouveau document politique RH que TOUS les employés doivent signer AUJOURD'HUI.\n"
                    "Si vous signez pas avant fin de journée il y a action disciplinaire.\n\n"
                    "Signer ici: {{tracking_url}}\n\n"
                    "RH"
                ),
            },
            2: {
                "subject": "Nouvelle politique de télétravail — Accusé de réception requis",
                "sender_name": "Ressources Humaines — {{org_name}}",
                "sender_domain": "rh-accusers-reception.politiques-rh.fr",
                "body": (
                    "Chers collègues,\n\n"
                    "Dans le cadre de notre révision annuelle, nous avons mis à jour notre "
                    "Politique de Télétravail et de Gestion des Données, applicable à compter "
                    "du 1er juin 2026.\n\n"
                    "Tous les employés doivent lire et accuser réception de la politique mise "
                    "à jour avant le 5 mai 2026 pour rester conformes aux directives de l'entreprise :\n\n"
                    "  {{tracking_url}}\n\n"
                    "Le non-respect de ce délai pourrait affecter vos droits au télétravail.\n\n"
                    "Ressources Humaines\n"
                    "{{org_name}}"
                ),
            },
            3: {
                "subject": "Politique de télétravail mise à jour — votre accusé de réception est en attente",
                "sender_name": "RH — {{org_name}}",
                "sender_domain": "rh.{{org_slug}}-interne.fr",
                "body": (
                    "Bonjour {{employee_name}},\n\n"
                    "Je vous contacte car nos dossiers indiquent que votre accusé de réception "
                    "concernant la Politique de Télétravail & Gestion des Données mise à jour "
                    "(applicable le 1er juin) est toujours en attente.\n\n"
                    "Cette politique couvre les protocoles d'accès à distance, l'utilisation "
                    "des appareils approuvés et les exigences de classification des données "
                    "propres à votre poste. Veuillez consulter et accuser réception via "
                    "le lien ci-dessous — cela ne prendra pas plus de 3 minutes :\n\n"
                    "  {{tracking_url}}\n\n"
                    "N'hésitez pas à me contacter pour toute question.\n\n"
                    "Cordialement,\n"
                    "Équipe RH\n"
                    "{{org_name}}"
                ),
            },
        },
        "AR_MSA": {
            1: {
                "subject": "مهم!! سياسة جديدة للموارد البشرية يجب التوقيع عليها الآن",
                "sender_name": "قسم الموارد البشرية",
                "sender_domain": "hr-policy-sign-now.net",
                "body": (
                    "عزيزي الموظف،\n\n"
                    "يوجد وثيقة سياسة جديدة للموارد البشرية يجب على جميع الموظفين التوقيع عليها اليوم.\n"
                    "إذا لم تُوقّع قبل نهاية اليوم ستكون هناك إجراءات تأديبية.\n\n"
                    "وقّع هنا: {{tracking_url}}\n\n"
                    "الموارد البشرية"
                ),
            },
            2: {
                "subject": "سياسة العمل عن بُعد الجديدة — مطلوب الإقرار",
                "sender_name": "الموارد البشرية — {{org_name}}",
                "sender_domain": "hr-policy-iqrar.notifications.com",
                "body": (
                    "زملائي الكرام،\n\n"
                    "في إطار مراجعتنا السنوية للسياسات، قمنا بتحديث سياسة العمل عن بُعد وإدارة البيانات، "
                    "وتسري اعتباراً من الأول من يونيو 2026.\n\n"
                    "يتعين على جميع الموظفين قراءة السياسة المحدّثة والإقرار بها قبل 5 مايو 2026 "
                    "للحفاظ على الامتثال لتوجيهات الشركة:\n\n"
                    "  {{tracking_url}}\n\n"
                    "عدم الإقرار بحلول الموعد النهائي قد يؤثر على صلاحية العمل عن بُعد.\n\n"
                    "الموارد البشرية\n"
                    "{{org_name}}"
                ),
            },
            3: {
                "subject": "سياسة العمل عن بُعد المحدّثة — إقرارك لا يزال معلقاً",
                "sender_name": "الموارد البشرية — {{org_name}}",
                "sender_domain": "hr.{{org_slug}}-internal.com",
                "body": (
                    "عزيزي {{employee_name}}،\n\n"
                    "أتواصل معك لأن سجلاتنا تشير إلى أن إقرارك بسياسة العمل عن بُعد وإدارة البيانات "
                    "المحدّثة (السارية من الأول من يونيو) لا يزال معلقاً.\n\n"
                    "تغطي هذه السياسة بروتوكولات الوصول عن بُعد وأجهزة العمل المعتمدة ومتطلبات "
                    "تصنيف البيانات ذات الصلة بوظيفتك. يرجى الاطلاع والإقرار بالضغط على الرابط أدناه — "
                    "لن يستغرق الأمر أكثر من 3 دقائق:\n\n"
                    "  {{tracking_url}}\n\n"
                    "للاستفسار، أنا في خدمتك.\n\n"
                    "مع التحية،\n"
                    "فريق الموارد البشرية\n"
                    "{{org_name}}"
                ),
            },
        },
        "AR_DARIJA": {
            1: {
                "subject": "مهم!! سياسة HR جديدة خاصك توقع عليها دابا",
                "sender_name": "HR",
                "sender_domain": "hr-siyassa-sign.net",
                "body": (
                    "صاحبي،\n\n"
                    "كاين وثيقة سياسة HR جديدة خاص جميع الموظفين يوقعو عليها اليوم.\n"
                    "إلا ما وقعتيش قبل الغروب غيكون إجراء تأديبي.\n\n"
                    "وقع من هنا: {{tracking_url}}\n\n"
                    "HR"
                ),
            },
            2: {
                "subject": "سياسة العمل من البيت الجديدة — خاصك توافق",
                "sender_name": "الموارد البشرية — {{org_name}}",
                "sender_domain": "hr-muwafaqa.notifications-ma.com",
                "body": (
                    "السلام عليكم،\n\n"
                    "كيما كنعاودو كل سنة، حدثنا سياسة العمل من البيت وتدبير المعطيات، "
                    "وغتبدأ من فاتح يونيو 2026.\n\n"
                    "خاص جميع الموظفين يقراو السياسة الجديدة ويوافقو عليها قبل 5 ماي 2026:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إلا ما وافقتيش في الوقت، ممكن تتأثر إمكانية العمل من البيت ديالك.\n\n"
                    "شكراً,\n"
                    "الموارد البشرية — {{org_name}}"
                ),
            },
            3: {
                "subject": "سياسة العمل من البيت — الموافقة ديالك مازالت معلقة",
                "sender_name": "HR — {{org_name}}",
                "sender_domain": "hr.{{org_slug}}-internal.ma",
                "body": (
                    "السلام عليكم {{employee_name}}،\n\n"
                    "كنتواصل معاك لأن الملفات ديالنا كيقولو أن الموافقة ديالك على "
                    "سياسة العمل من البيت وتدبير المعطيات المحدثة (من فاتح يونيو) مازالت معلقة.\n\n"
                    "هاد السياسة كتغطي بروتوكولات الوصول عن بعد والأجهزة المعتمدة ومتطلبات "
                    "تصنيف المعطيات المتعلقة بالمنصب ديالك. عافاك راجع ووافق من هنا — "
                    "ما كتاخدش غير 3 دقائق:\n\n"
                    "  {{tracking_url}}\n\n"
                    "إلا عندك أي سؤال أنا هنا.\n\n"
                    "شكراً,\n"
                    "فريق HR\n"
                    "{{org_name}}"
                ),
            },
        },
    },
}


def _org_slug(org_name: str) -> str:
    """Simple slug: lowercase, spaces to hyphens, keep alphanumeric+hyphens."""
    import re
    slug = org_name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")[:30]


def _render(text: str, org_name: str, employee_name: Optional[str] = None) -> str:
    slug = _org_slug(org_name)
    text = text.replace("{{org_name}}", org_name)
    text = text.replace("{{org_slug}}", slug)
    if employee_name:
        text = text.replace("{{employee_name}}", employee_name)
    return text


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_template(
    attack_type: str,
    language: str,
    difficulty: int,
    org_name: str,
    employee_name: Optional[str] = None,
) -> dict:
    """
    Return a rendered template dict with keys:
      subject, body, sender_name, sender_domain

    If NVIDIA_API_KEY is set in the environment the function attempts AI-enhanced
    generation via NVIDIA NIM and falls back to the static library on any error.
    """
    api_key = os.getenv("NVIDIA_API_KEY", "")
    if api_key:
        try:
            return _generate_with_ai(
                attack_type=attack_type,
                language=language,
                difficulty=difficulty,
                org_name=org_name,
                employee_name=employee_name,
                api_key=api_key,
            )
        except Exception:
            pass  # Fall through to static library

    return _generate_from_library(attack_type, language, difficulty, org_name, employee_name)


def _generate_from_library(
    attack_type: str,
    language: str,
    difficulty: int,
    org_name: str,
    employee_name: Optional[str] = None,
) -> dict:
    types = _LIBRARY.get(attack_type)
    if not types:
        raise ValueError(f"Unknown attack_type: {attack_type}")
    langs = types.get(language)
    if not langs:
        raise ValueError(f"No templates for language: {language}")
    tmpl = langs.get(difficulty)
    if not tmpl:
        raise ValueError(f"No template for difficulty: {difficulty}")

    return {
        "subject": _render(tmpl["subject"], org_name, employee_name),
        "body": _render(tmpl["body"], org_name, employee_name),
        "sender_name": _render(tmpl["sender_name"], org_name, employee_name),
        "sender_domain": _render(tmpl["sender_domain"], org_name, employee_name),
    }


def _generate_with_ai(
    attack_type: str,
    language: str,
    difficulty: int,
    org_name: str,
    employee_name: Optional[str],
    api_key: str,
) -> dict:
    """Generate a phishing simulation email via the NVIDIA NIM API."""
    import requests  # stdlib-available in all Django environments

    lang_labels = {
        "EN": "English",
        "FR": "French",
        "AR_MSA": "Modern Standard Arabic",
        "AR_DARIJA": "Moroccan Darija (Arabic dialect)",
    }
    attack_labels = {
        "IT_RESET": "IT password reset request",
        "INVOICE": "fake invoice approval request",
        "DELIVERY": "package delivery notification",
        "HR_UPDATE": "HR policy update requiring acknowledgement",
    }
    difficulty_desc = {
        1: (
            "Easy — obvious phishing signals: poor grammar, misspellings, "
            "urgent all-caps language, clearly suspicious sender domain. "
            "DO include these flaws deliberately."
        ),
        2: (
            "Medium — plausible email: decent grammar, realistic urgency, "
            "sender domain looks close but not exact (e.g. company-helpdesk.com). "
            "No obvious spelling errors."
        ),
        3: (
            "Hard — spear-phishing: use the employee name, highly realistic "
            "spoofed domain resembling the organisation's real domain, "
            "professional tone with no suspicious signals."
        ),
    }

    system_prompt = (
        "You are a security awareness platform that generates realistic but safe "
        "phishing simulation emails for corporate training purposes. "
        "The emails will never be sent to real people outside controlled simulations. "
        "Respond ONLY with a valid JSON object — no markdown, no extra text.\n"
        "JSON schema: {\"subject\": str, \"body\": str, \"sender_name\": str, \"sender_domain\": str}\n"
        "IMPORTANT: embed the tracking link as a natural markdown hyperlink using contextually "
        "appropriate anchor text — never expose the raw URL. "
        "Format: [descriptive action text]({{tracking_url}}) "
        "Examples: [Review and Approve]({{tracking_url}}), [Reset My Password]({{tracking_url}}), "
        "[Track My Parcel]({{tracking_url}}), [Complete Enrollment]({{tracking_url}}). "
        "Choose anchor text that fits the attack scenario naturally. Do NOT write the URL as plain text."
    )

    user_prompt = (
        f"Generate a phishing simulation email with these parameters:\n"
        f"- Attack type: {attack_labels.get(attack_type, attack_type)}\n"
        f"- Language: {lang_labels.get(language, language)}\n"
        f"- Difficulty: {difficulty} — {difficulty_desc.get(difficulty, '')}\n"
        f"- Organisation name: {org_name}\n"
    )
    if employee_name:
        user_prompt += f"- Target employee name: {employee_name}\n"

    user_prompt += (
        "\nFor Arabic languages, use culturally appropriate Moroccan/regional references "
        "where relevant (company names, sender titles, local conventions)."
    )

    payload = {
        "model": "meta/llama-4-maverick-17b-128e-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 800,
        "temperature": 0.7,
        "top_p": 1.0,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    response = requests.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()

    raw = response.json()["choices"][0]["message"]["content"] or ""
    data = json.loads(raw)

    required = {"subject", "body", "sender_name", "sender_domain"}
    if not required.issubset(data.keys()):
        raise ValueError("AI response missing required fields")

    return data


# ---------------------------------------------------------------------------
# Difficulty auto-progression
# ---------------------------------------------------------------------------

def recommend_difficulty(employee) -> int:
    """
    Recommend the next simulation difficulty for an employee based on
    their historical performance:

    - < 2 completed campaigns  → difficulty 1  (baseline)
    - Failed ≥ 60 % of last 5  → keep current (or 1 if new)
    - Failed 25–59 %           → stay at current difficulty
    - Failed < 25 % (doing well) → increase by 1, cap at 3

    'Failed' = clicked the link.
    """
    from .models import PhishingSimulationTarget

    history = list(
        PhishingSimulationTarget.objects
        .filter(employee=employee, sent_at__isnull=False)
        .order_by("-sent_at")
        .values("clicked_at")[:5]
    )

    if len(history) < 2:
        return 1

    failed = sum(1 for h in history if h["clicked_at"] is not None)
    rate = failed / len(history)

    # Determine what difficulty the last campaign was
    last_target = (
        PhishingSimulationTarget.objects
        .filter(employee=employee, sent_at__isnull=False)
        .select_related("campaign__template")
        .order_by("-sent_at")
        .first()
    )
    current = last_target.campaign.template.difficulty if last_target else 1

    if rate < 0.25:
        return min(current + 1, 3)
    if rate >= 0.60:
        return max(current - 1, 1)
    return current


# ---------------------------------------------------------------------------
# Email dispatch
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="{lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#0078d4;padding:20px 30px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;">{sender_name}</span><br>
          <span style="color:#cce4ff;font-size:12px;">{sender_domain}</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:30px;color:#333333;font-size:14px;line-height:1.6;">
          {body_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:15px 30px;border-top:1px solid #e0e0e0;font-size:11px;color:#888;">
          This message was sent by {sender_name}. If you believe it was sent in error, contact your IT department.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def _wrap_html(body_text: str, sender_name: str, sender_domain: str) -> str:
    """Wrap a plain-text body in a professional HTML email shell."""
    import re

    # Determine text direction
    first_char = body_text.strip()[:1]
    lang = "ar" if first_char and ord(first_char[0]) > 0x600 else "en"
    dir_attr = 'dir="rtl"' if lang == "ar" else ''

    # Convert plain text to HTML paragraphs
    paragraphs = body_text.strip().split("\n\n")
    html_parts = []
    for para in paragraphs:
        lines = para.strip()
        if not lines:
            continue
        # Convert [anchor text](url) markdown links → natural inline hyperlinks
        lines = re.sub(
            r'\[([^\]]+)\]\((https?://\S+?)\)',
            r'<a href="\2" style="color:#0078d4;text-decoration:underline;">\1</a>',
            lines,
        )
        # Fallback: bare URLs → generic button (used by static library templates)
        lines = re.sub(
            r'(?<!href=")(https?://\S+)',
            r'<br><br><a href="\1" '
            r'style="display:inline-block;padding:12px 24px;background:#0078d4;'
            r'color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;'
            r'font-weight:bold;">Open Link &rarr;</a><br>',
            lines,
        )
        lines = lines.replace("\n", "<br>")
        html_parts.append(f'<p {dir_attr} style="margin:0 0 14px 0;">{lines}</p>')

    return _HTML_TEMPLATE.format(
        lang=lang,
        sender_name=sender_name,
        sender_domain=sender_domain,
        body_html="\n          ".join(html_parts),
    )

def send_campaign_emails(campaign) -> dict:
    """
    Send simulation emails to all unsent targets in a campaign.

    Each email uses the campaign's PhishingTemplate with:
      - From:    "<sender_name>" <no-reply@sender_domain>   (spoofed display name)
      - To:      employee's email address
      - Subject: template subject (with org/employee placeholders rendered)
      - Body:    template body with {{tracking_url}} replaced by the real click URL

    PHISHING_BASE_URL is read from Django settings so click links work in
    both development and production.

    Returns:
        {"sent": int, "failed": int, "errors": [{"employee_email": ..., "error": ...}]}
    """
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    from django.utils import timezone

    from .models import PhishingSimulationTarget

    base_url = getattr(settings, "PHISHING_BASE_URL", "http://localhost:8000").rstrip("/")
    tmpl = campaign.template
    org_name = campaign.organization.name

    targets = PhishingSimulationTarget.objects.filter(
        campaign=campaign,
        sent_at__isnull=True,  # only unsent
    ).select_related("employee")

    sent_count = 0
    failed_count = 0
    errors = []

    for target in targets:
        employee = target.employee
        tracking_url = f"{base_url}/api/phishing/click/{target.tracking_token}/"

        subject = _render(tmpl.subject, org_name, employee.name)
        body = _render(tmpl.body, org_name, employee.name).replace(
            "{{tracking_url}}", tracking_url
        )
        sender_name = _render(tmpl.sender_name, org_name, employee.name)
        sender_domain = _render(tmpl.sender_domain, org_name, employee.name)

        from_address = f"{sender_name} <no-reply@{sender_domain}>"

        try:
            html_body = _wrap_html(body, sender_name, sender_domain)
            msg = EmailMultiAlternatives(
                subject=subject,
                body=body,  # plain-text fallback
                from_email=from_address,
                to=[employee.email],
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            target.sent_at = timezone.now()
            target.save(update_fields=["sent_at"])
            sent_count += 1
        except Exception as exc:
            failed_count += 1
            errors.append({"employee_email": employee.email, "error": str(exc)})

    return {"sent": sent_count, "failed": failed_count, "errors": errors}
