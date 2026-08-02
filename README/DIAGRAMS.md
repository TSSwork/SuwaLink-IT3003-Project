# SuwaLink — System Diagrams

Reflects the system as of the bug-fix + merge pass on `fix/bug-hunt-phase1`: auth (incl.
password reset), inventory, prescription requests, prescription responses, reservations,
notifications, and admin.

## Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o| PHARMACY : "owns (PHARMACY_ADMIN only)"
    USER ||--o{ PRESCRIPTION_REQUEST : submits
    USER ||--o{ RESERVATION : reserves
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ BOOKMARK : saves
    USER ||--o{ IMAGE : uploads

    PHARMACY ||--o{ INVENTORY : stocks
    PHARMACY ||--o{ PRESCRIPTION_RESPONSE : sends
    PHARMACY ||--o{ RESERVATION : fulfills

    CATEGORY ||--o{ CATEGORY : "parent of"
    CATEGORY ||--o{ MEDICINE_MASTER : classifies
    MANUFACTURER ||--o{ MEDICINE_MASTER : makes

    MEDICINE_MASTER ||--o{ INVENTORY : "listed as"
    IMAGE ||--o{ INVENTORY : illustrates
    INVENTORY ||--o{ BOOKMARK : "saved as"
    INVENTORY ||--o{ PRESCRIPTION_RESPONSE_ITEM : offered
    INVENTORY ||--o{ RESERVATION : reserved

    PRESCRIPTION_REQUEST ||--|| IMAGE : "photo of"
    PRESCRIPTION_REQUEST ||--o{ PRESCRIPTION_RESPONSE : receives
    PRESCRIPTION_RESPONSE ||--o{ PRESCRIPTION_RESPONSE_ITEM : contains
    PRESCRIPTION_RESPONSE_ITEM ||--o| RESERVATION : "reserved via"

    USER {
        uuid id PK
        string name
        string email UK
        string phone
        string password
        enum role "CUSTOMER | PHARMACY_ADMIN | ADMIN"
        string resetOtp
        datetime resetOtpExpiry
    }
    PHARMACY {
        uuid id PK
        uuid user_id FK
        string licenceNo UK
        string address
        enum status "PENDING | VERIFIED | REJECTED"
    }
    CATEGORY {
        uuid id PK
        uuid parent_id FK
        string name UK
        boolean isActive
    }
    MANUFACTURER {
        uuid id PK
        string name UK
        string licenseNumber
        string country
        boolean isActive
    }
    MEDICINE_MASTER {
        uuid id PK
        uuid manufacturer_id FK
        uuid category_id FK
        string brandName
        string genericName
        enum legalCategory "OTC | PRESCRIPTION | CONTROLLED | SCHEDULE_III"
    }
    IMAGE {
        uuid id PK
        uuid uploadedByUserId FK
        string url
        enum imageType "PROFILE | INVENTORY | PRESCRIPTION"
    }
    INVENTORY {
        uuid id PK
        uuid pharmacy_id FK
        uuid medicineMaster_id FK
        uuid image_id FK
        decimal unitPrice
        int stockQuantity
        date expireDate
        boolean available
    }
    PRESCRIPTION_REQUEST {
        uuid id PK
        uuid patient_id FK
        uuid image_id FK
        int patientAge
        string note
        enum status "PENDING | RESPONDED | CLOSED"
    }
    PRESCRIPTION_RESPONSE {
        uuid id PK
        uuid prescriptionRequest_id FK
        uuid pharmacy_id FK
        string message
    }
    PRESCRIPTION_RESPONSE_ITEM {
        uuid id PK
        uuid prescriptionResponse_id FK
        uuid inventory_id FK
        int quantity
        decimal unitPrice
    }
    RESERVATION {
        uuid id PK
        uuid patient_id FK
        uuid pharmacy_id FK
        uuid inventory_id FK
        uuid prescriptionResponseItem_id FK
        int quantity
        decimal unitPrice
        enum status "CONFIRMED | CANCELLED | COMPLETED"
        string cancelReason
    }
    NOTIFICATION {
        uuid id PK
        uuid recipient_id FK
        string title
        string message
        enum type "PRESCRIPTION | RESERVATION | SYSTEM_ALERT"
        boolean isRead
    }
    BOOKMARK {
        uuid id PK
        uuid user_id FK
        uuid inventory_id FK
    }
```

---

## Use Case Diagram

```mermaid
flowchart LR
    Customer((Customer))
    PharmacyAdmin((Pharmacy Admin))
    Admin((Admin))

    subgraph Auth
        UC1[Register / Login]
        UC2[Forgot / Reset Password]
    end

    subgraph Discovery
        UC3[Search Inventory]
        UC4[Bookmark Medicine]
    end

    subgraph Prescriptions
        UC5[Submit Prescription Request]
        UC6[Close Prescription Request]
        UC7[Respond to Prescription Request]
    end

    subgraph Reservations
        UC8[Reserve Medicine]
        UC9[Cancel Reservation]
        UC10[Complete Reservation]
    end

    subgraph Inventory Mgmt
        UC11[Manage Own Inventory]
    end

    subgraph Admin Console
        UC12[View Dashboard]
        UC13[Approve / Reject Pharmacy]
        UC14[Manage Users]
    end

    UC15[Receive Notifications]

    Customer --> UC1
    Customer --> UC2
    Customer --> UC3
    Customer --> UC4
    Customer --> UC5
    Customer --> UC6
    Customer --> UC8
    Customer --> UC9
    Customer --> UC15

    PharmacyAdmin --> UC1
    PharmacyAdmin --> UC2
    PharmacyAdmin --> UC7
    PharmacyAdmin --> UC9
    PharmacyAdmin --> UC10
    PharmacyAdmin --> UC11
    PharmacyAdmin --> UC15

    Admin --> UC1
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
```

---

## Class Diagram (service layer, by module)

```mermaid
classDiagram
    class AuthService {
        +registerCustomer(request)
        +registerPharmacy(request)
        +login(request)
        +forgotPassword(request)
        +resetPassword(request)
    }
    class AdminService {
        +getDashboard()
        +getAllPharmacies()
        +approvePharmacy(id)
        +rejectPharmacy(id)
        +getAllUsers()
        +deleteUser(id)
    }
    class InventoryService {
        +addInventoryItem(request)
        +listMyInventory()
        +getInventoryItem(id)
        +updateInventoryItem(id, request)
        +setAvailability(id, available)
        +removeInventoryItem(id)
        +search(query, filters)
    }
    class PrescriptionRequestService {
        +create(request)
        +getMyRequests()
        +getById(id)
        +update(id, request)
        +delete(id)
        +listPending()
        +close(id)
    }
    class PrescriptionResponseService {
        +create(requestId, request)
        +listForRequest(requestId)
        +listMyResponses()
    }
    class ReservationService {
        +create(request)
        +getMyReservations()
        +getPharmacyReservations()
        +cancel(id, request)
        +complete(id)
    }
    class NotificationService {
        +createNotification(recipient, title, message, type)
        +getUserNotifications(user)
        +getUnreadCount(user)
        +markAsRead(id, currentUser)
    }
    class NotificationEventListener {
        +handlePharmacyVerifiedEvent(event)
        +handlePharmacyRejectedEvent(event)
        +handlePrescriptionAddedEvent(event)
        +handlePharmacyRespondedEvent(event)
        +handleReservationCreatedEvent(event)
        +handleReservationCancelledEvent(event)
    }

    class User {
        +UUID id
        +String name
        +String email
        +Role role
    }
    class Pharmacy {
        +UUID id
        +String licenceNo
        +PharmacyStatus status
    }
    class Inventory {
        +UUID id
        +BigDecimal unitPrice
        +int stockQuantity
        +boolean available
    }
    class PrescriptionRequest {
        +UUID id
        +int patientAge
        +PrescriptionRequestStatus status
    }
    class PrescriptionResponse {
        +UUID id
        +String message
    }
    class Reservation {
        +UUID id
        +int quantity
        +ReservationStatus status
    }
    class Notification {
        +UUID id
        +String title
        +NotificationType type
        +boolean isRead
    }

    AuthService ..> User
    AuthService ..> Pharmacy
    AdminService ..> Pharmacy
    AdminService ..> User
    InventoryService ..> Inventory
    PrescriptionRequestService ..> PrescriptionRequest
    PrescriptionRequestService ..> PrescriptionRequestService : publishes PrescriptionAddedEvent
    PrescriptionResponseService ..> PrescriptionResponse
    ReservationService ..> Reservation
    NotificationEventListener ..> NotificationService : delegates to
    Pharmacy "1" --> "1" User : owned by
    Inventory "many" --> "1" Pharmacy
    PrescriptionRequest "many" --> "1" User : patient
    PrescriptionResponse "many" --> "1" PrescriptionRequest
    Reservation "many" --> "1" Inventory
```

---

## Sequence Diagrams

### Login

```mermaid
sequenceDiagram
    actor U as User (browser)
    participant FE as Frontend (auth.js)
    participant AC as AuthController
    participant AM as AuthenticationManager
    participant AS as AuthServiceImpl
    participant DB as MySQL

    U->>FE: submit login form
    FE->>AC: POST /api/auth/login
    AC->>AM: authenticate(email, password)
    AM->>DB: load user by email, verify BCrypt hash
    AM-->>AC: Authentication OK / BadCredentialsException
    AC->>AS: login(request)
    AS->>DB: find user, (if PHARMACY_ADMIN) check Pharmacy.status
    alt not VERIFIED
        AS-->>AC: PharmacyNotVerifiedException
        AC-->>FE: 403 with status-specific message
    else OK
        AS->>AS: JwtService.generateToken(userId, email, role)
        AS-->>AC: AuthResponse(token, role, id, name)
        AC-->>FE: 200 { token, role, id, name }
        FE->>FE: tokenStorage.setSession(...)
    end
```

### Forgot / Reset Password

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant AC as AuthController
    participant AS as AuthServiceImpl
    participant Mail as MailServiceImpl
    participant DB as MySQL

    U->>FE: enter email, submit
    FE->>AC: POST /api/auth/forgot-password
    AC->>AS: forgotPassword(request)
    AS->>DB: findByEmail(email)
    alt user exists
        AS->>DB: save resetOtp + resetOtpExpiry
        AS->>Mail: sendPasswordResetOtp(email, otp)
        Mail-->>AS: sent (or MailException -> 502, handled)
    else no such user
        Note over AS: silently does nothing - same response either way (no enumeration)
    end
    AS-->>AC: void
    AC-->>FE: 200 "A password reset code has been sent to your email" (always)

    U->>FE: enter email + otp + new password
    FE->>AC: POST /api/auth/reset-password
    AC->>AS: resetPassword(request)
    AS->>DB: findByEmail(email)
    AS->>AS: constant-time compare OTP, check expiry
    alt valid & not expired
        AS->>DB: save new BCrypt password, clear resetOtp
        AS-->>AC: void
        AC-->>FE: 200 "Password reset successful"
    else invalid/expired
        AS-->>AC: InvalidOtpException
        AC-->>FE: 400 with reason
    end
```

### Prescription Request Created → Pharmacies Notified

```mermaid
sequenceDiagram
    actor P as Patient
    participant PC as PrescriptionRequestController
    participant PS as PrescriptionRequestServiceImpl
    participant DB as MySQL
    participant Pub as ApplicationEventPublisher
    participant Listener as NotificationEventListener
    participant NS as NotificationService
    actor Ph as Verified Pharmacies

    P->>PC: POST /api/prescriptions (multipart image + age + note)
    PC->>PS: create(request)
    PS->>DB: upload image, save PrescriptionRequest (status=PENDING)
    PS->>DB: findByStatus(VERIFIED) pharmacies
    PS->>Pub: publishEvent(PrescriptionAddedEvent(pharmacyUserIds))
    PC-->>P: 201 PrescriptionRequestResponse
    Pub->>Listener: handlePrescriptionAddedEvent(event)
    loop each verified pharmacy user
        Listener->>NS: createNotification(recipient, "New Prescription Available", ..., PRESCRIPTION)
    end
    Ph->>PC: GET /api/notifications (bell icon)
    PC-->>Ph: unread notification appears
```

### Admin Approves/Rejects a Pharmacy → Applicant Notified

```mermaid
sequenceDiagram
    actor A as Admin
    participant AC as AdminController
    participant AS as AdminServiceImpl
    participant DB as MySQL
    participant Pub as ApplicationEventPublisher
    participant Listener as NotificationEventListener
    participant NS as NotificationService
    actor Pharm as Pharmacy Applicant

    A->>AC: PUT /api/admin/pharmacies/{id}/approve
    AC->>AS: approvePharmacy(id)
    AS->>DB: set Pharmacy.status = VERIFIED
    AS->>Pub: publishEvent(PharmacyVerifiedEvent(pharmacyUserId))
    AC-->>A: 200 "Pharmacy Approved"
    Pub->>Listener: handlePharmacyVerifiedEvent(event)
    Listener->>NS: createNotification(applicant, "Pharmacy Verified", ..., SYSTEM_ALERT)
    Pharm->>Pharm: can now log in (status == VERIFIED)

    Note over A,Pharm: Reject follows the identical shape - status = REJECTED, PharmacyRejectedEvent, applicant notified, login stays blocked with a REJECTED-specific message.
```

### Notification Read

```mermaid
sequenceDiagram
    actor U as User
    participant NC as NotificationController
    participant NS as NotificationService
    participant DB as MySQL

    U->>NC: PUT /api/notifications/{id}/read
    NC->>NS: markAsRead(id, currentUser)
    NS->>DB: findById(id)
    alt notification not found or belongs to someone else
        NS-->>NC: 404 "Notification not found"
    else owned by caller
        NS->>DB: set isRead = true
        NS-->>NC: void
        NC-->>U: 200 "Notification marked as read"
    end
```

---

## Activity Diagrams

### Customer prescription → reservation journey

```mermaid
flowchart TD
    Start([Patient needs medicine]) --> Search{Found via search?}
    Search -->|Yes| Reserve[Reserve directly from Inventory]
    Search -->|No| Upload[Upload prescription photo]
    Upload --> Wait[Wait for pharmacy responses]
    Wait --> Responses{Any responses received?}
    Responses -->|No| Wait
    Responses -->|Yes| Compare[Compare pharmacies / prices]
    Compare --> ReserveFromResponse[Reserve a response item]
    Reserve --> Confirmed[Reservation CONFIRMED, stock decremented]
    ReserveFromResponse --> Confirmed
    Confirmed --> Pickup{Patient collects on time?}
    Pickup -->|Yes| Complete[Pharmacy marks COMPLETED]
    Pickup -->|No, changes mind| Cancel[Either side cancels -> stock restored]
    Complete --> End([Done])
    Cancel --> End
```

### Pharmacy inventory + response journey

```mermaid
flowchart TD
    Start([Pharmacy logs in]) --> Verified{Pharmacy.status == VERIFIED?}
    Verified -->|No| Blocked[Login blocked - PENDING or REJECTED message]
    Verified -->|Yes| Manage[Manage own inventory: add/update/toggle availability]
    Manage --> Browse[Browse PENDING prescription requests]
    Browse --> Match{Has matching stock?}
    Match -->|No| Browse
    Match -->|Yes| Respond[Submit PrescriptionResponse with one or more items]
    Respond --> RequestStatus[Request status -> RESPONDED]
    RequestStatus --> PatientNotified[Patient notified via PharmacyRespondedEvent]
    PatientNotified --> AwaitReservation{Patient reserves an item?}
    AwaitReservation -->|Yes| Fulfill[Prepare for pickup, mark COMPLETED]
    AwaitReservation -->|No| End1([No further action])
    Fulfill --> End2([Done])
```

### Admin pharmacy verification journey

```mermaid
flowchart TD
    Start([Pharmacy registers]) --> Pending[Pharmacy.status = PENDING]
    Pending --> AdminReview{Admin reviews application}
    AdminReview -->|Approve| Verified[status = VERIFIED, PharmacyVerifiedEvent]
    AdminReview -->|Reject| Rejected[status = REJECTED, PharmacyRejectedEvent]
    Verified --> CanLogin[Pharmacy can log in and operate]
    Rejected --> CannotLogin[Pharmacy blocked, sees rejection reason]
    CanLogin --> End([Done])
    CannotLogin --> End
```

---

## State Diagrams

### PrescriptionRequestStatus

```mermaid
stateDiagram-v2
    [*] --> PENDING : patient submits request
    PENDING --> RESPONDED : a pharmacy submits a PrescriptionResponse
    PENDING --> CLOSED : patient closes it directly
    RESPONDED --> CLOSED : patient closes it
    CLOSED --> [*]
```

### PharmacyStatus

```mermaid
stateDiagram-v2
    [*] --> PENDING : pharmacy registers
    PENDING --> VERIFIED : admin approves
    PENDING --> REJECTED : admin rejects
    VERIFIED --> REJECTED : admin rejects (re-review)
    REJECTED --> VERIFIED : admin approves (re-review)
    VERIFIED --> [*]
    REJECTED --> [*]
```

### ReservationStatus

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED : patient reserves (stock decremented)
    CONFIRMED --> CANCELLED : patient or pharmacy cancels (stock restored)
    CONFIRMED --> COMPLETED : pharmacy marks picked up
    CANCELLED --> [*]
    COMPLETED --> [*]
```
