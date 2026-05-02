"Problematic: The Cyber Maturity Cockpit (The Illusion of Security)
The Surface Problem: Most organizations operate with zero structural cybersecurity gover-
nance.
The Deep Reality: Organizations attempt to buy security by purchasing firewalls or antivirus
software, fundamentally misunderstanding that security is a continuous operational process,
not a product. They operate in a profound “blind spot.” They do not know what devices connect
to their networks, where their sensitive data resides, or who has administrative access.
The Cascading Results:
– Shadow IT Proliferation: Unmanaged devices, abandoned servers, and personal SaaS ac-
counts become the primary vectors for devastating, invisible breaches.
– Misallocated Resources: Budgets are wasted on advanced tools (SIEM, EDR) that fail because
the foundational operational layer—basic hygiene, asset tracking, and access control—simply
does not exist.
– Systemic Collapse: A single compromised, untracked asset can lead to the encryption of an
entire organization because no internal risk mapping was ever conducted.
The Challenge
How do you build an operational cockpit that makes the invisible visible? How do you
guide a fundamentally non-technical organization to map its digital footprint, evaluate
its true exposure via simplified frameworks (like CIS or OWASP SAMM), and prioritize its
actions without drowning them in cybersecurity jargon?"

our solution will be the following:

* a web extension to track the what the users are doing on the web.
* a dekstop application to track the what the users are doing on their computer.
* a backend to collect the data from the web extension and desktop application, analyze it, and provide insights to the users.
* backend with django-rest, environment: conda activate "innov", database: supabase 
* features:
  * A.1 Active Subnet Scanning: A lightweight script (run once on any company computer) that sweeps the local network (ARP/Ping sweep) to find all connected MAC and IP addresses.
  * A.2 Intrusion / Unknown Device Alert: If a new device connects that is not assigned to an employee, it is agged as "Unknown/Shadow IT" 
  * A.3 to enforce the Intrusion / Unknown Device Alert, the system will  check the hash of the device specifications, and if the hash is not in the database, it will be flagged as "Unknown/Shadow IT" -> blocked from accessing the network.
  * risk assessment: evaluate the organization's risk exposure and provide actionable insights.
  * reporting and dashboards: provide visualizations and reports to help organizations understand their security posture.


Evaluation Frameworks
CIS and OWASP SAMM: These are global standards created by cybersecurity experts. They are basically "Checklists for Security 



This blueprint gives your frontend/extension developer exactly what they need to build the extension, handle the real-time communication with your backend, and execute the exact features we discussed.

---

### 🏗️ 1. Architecture & Tech Stack (Manifest V3)

*   **Manifest Version:** 3 (Required by Chrome)
*   **Permissions Needed:** `storage`, `scripting`, `activeTab`, `background`, `alarms` (for polling the server).
*   **UI Library:** **SweetAlert2** (Imported via CDN or bundled). Do not waste time writing CSS modals. SweetAlert2 can handle warnings, fake stakes, and quizzes perfectly.
*   **Communication Flow:**
    *   `background.js` (Service Worker): Talks to your Backend API. 
    *   `content.js`: Talks to the User (DOM manipulation) and listens to the `background.js`.

---

### ⚙️ 2. Step-by-Step Implementation Guide

#### Step 1: The Manifest File (`manifest.json`)
Keep it clean and targeted.
```json
{
  "manifest_version": 3,
  "name": "CyberBase Web Guard",
  "version": "1.0",
  "permissions": ["storage", "alarms"],
  "host_permissions":["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["sweetalert2.all.min.js", "content.js"],
      "css":["custom.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### Step 2: HTTP Warning & Blacklist (Navigation Security)
This is handled inside `content.js` as soon as a page loads.

*   **HTTP Warning:**
    ```javascript
    if (window.location.protocol === 'http:') {
        // Inject a floating red banner at the top of the DOM
        const banner = document.createElement('div');
        banner.innerHTML = "⚠️ CyberBase: Unsecured Connection. Do not enter passwords.";
        banner.style.cssText = "position:fixed; top:0; width:100%; background:red; color:white; z-index:99999; text-align:center;";
        document.body.prepend(banner);
    }
    ```
*   **Blacklist Check:**
    Instead of hardcoding, `content.js` asks `background.js` if the domain is banned. If yes, `content.js` replaces the entire `document.body.innerHTML` with a "Blocked by Company Policy" screen and logs the attempt to the backend.

#### Step 3: Smart DLP (File Upload Interception)
*(As designed previously)*
*   Listen for `drop` and `change` events on `<input type="file">`.
*   Check the extension (`.pdf`, `.xlsx`) and the filename (`facture`, `bilan`) using Regex.
*   If suspicious, use `event.preventDefault()` to stop the upload.
*   Trigger a **SweetAlert2 "Speed Bump"**: Ask the user *"Does this contain confidential data?"*
*   Send the log to `background.js` -> Backend API.

#### Step 4: The Real-Time Admin Trigger Engine (Quizzes & Fake Stakes)
*This is the most complex part of the extension. How does the admin click "Send Quiz" on the Dashboard and have it instantly pop up on the employee's screen?*

**The Hackathon Trick (Short Polling):**
Manifest V3 Service Workers sleep after 30 seconds. WebSockets can disconnect. The most reliable way to build this in 48 hours is using the `chrome.alarms` API to poll the server every 10 seconds.

**In `background.js`:**
```javascript
// Poll the server every 0.2 minutes (12 seconds)
chrome.alarms.create("checkAdminTriggers", { periodInMinutes: 0.2 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkAdminTriggers") {
        // Fetch from your backend (Assume route: /api/extension/poll with EmployeeToken auth)
        const response = await fetch('https://your-backend.com/api/events?emp=123');
        const data = await response.json();

        if (data.hasEvent) {
            // Send the event to the active tab
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "ADMIN_TRIGGER",
                    payload: data.eventPayload 
                    // e.g., { type: 'QUIZ', question: 'What is phishing?', options: [...] }
                });
            });
        }
    }
});
```

#### Step 5: Displaying the Quiz / Fake Stakes (In `content.js`)
When `content.js` receives the message from the background, it uses SweetAlert2 to hijack the screen gracefully.

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ADMIN_TRIGGER") {
        
        if (message.payload.type === "QUIZ") {
            // Show a sudden quiz using SweetAlert2
            Swal.fire({
                title: 'CyberBase Pop-Quiz!',
                text: message.payload.question,
                input: 'radio',
                inputOptions: message.payload.options,
                allowOutsideClick: false, // Forces them to answer
                confirmButtonText: 'Submit Answer'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Send answer back to background.js -> Backend -> Update gamification score
                    chrome.runtime.sendMessage({ action: "SUBMIT_QUIZ", answer: result.value });
                    Swal.fire('Logged!', 'Your score has been updated.', 'success');
                }
            });
        }

        if (message.payload.type === "FAKE_PHISHING") {
            // Show a terrifying fake virus popup
            Swal.fire({
                icon: 'error',
                title: 'CRITICAL: WINDOWS INFECTED',
                text: 'Click here to download the emergency antivirus!',
                confirmButtonText: 'DOWNLOAD NOW',
                confirmButtonColor: '#ff0000'
            }).then((result) => {
                // Whether they click it or close it, tell the LLM coach
                if (result.isConfirmed) {
                     Swal.fire('Gotcha!', 'This was a simulation by the IT team. You just clicked a fake malicious link. Opening AI Coach...', 'info');
                     // Log failure to backend
                }
            });
        }
    }
});
```

---

### 🔌 3. Required Backend API Routes (For Your Backend Dev) DON'T IMPLEMENT THESE ASSUME EXISTENCE

Your backend developer needs to build these specific endpoints to support the extension:

1.  **`POST /api/logs/dlp`**
    *   *Auth:* `Authorization: EmployeeToken <token>`
    *   *Input:* `filename`, `website`, `action_taken (allow | cancel | force)` (employee resolved from token)
    *   *Output:* 200 OK. (Updates the Risk-to-DZD metric on the CEO dashboard).
2.  **`POST /api/logs/blacklist`**
    *   *Auth:* `Authorization: EmployeeToken <token>`
    *   *Input:* `attempted_url` (employee resolved from token)
3.  **`GET /api/extension/poll`**
    *   *Auth:* `Authorization: EmployeeToken <token>`
    *   *Output:* Returns any pending quizzes or fake stakes triggered by the CEO. Example response: `{"hasEvent": true, "eventPayload": {"type": "QUIZ", ...}}`. Once fetched, the backend marks it as "delivered" so it doesn't pop up twice.
4.  **`POST /api/gamification/submit-quiz`**
    *   *Auth:* `Authorization: EmployeeToken <token>`
    *   *Input:* `quiz_id`, `answer_selected` (employee resolved from token). (Updates leaderboard).

