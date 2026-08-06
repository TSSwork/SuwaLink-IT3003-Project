# Who Built What

Generated from the git history of this repository (all branches, 126 commits, 15 Jul 2026 – 5 Aug 2026). Each file is listed against the person whose commit **first added it**, with the date and the commit it arrived in.

> A file counts once, to whoever created it. Later edits by other team members aren't shown in the per-file tables — the *lines changed* column in the summary below captures that side of the work.

## Summary

| Team member | Commits | Files created | Lines added | Lines removed | Main areas |
|---|---:|---:|---:|---:|---|
| TSSwork | 61 | 115 | +10,264 | −735 | Backend, Frontend styles, Frontend scripts |
| Kenura Gunarathna | 23 | 73 | +6,131 | −751 | Backend, Database migrations, Documentation |
| UNATTRIBUTED (git identity not set) | 1 | 14 | +889 | −1 | Backend, Documentation, Database migrations |
| Kaveesha Induwara | 26 | 13 | +560 | −26 | Backend, Database migrations, Frontend styles |
| SASADA | 1 | 10 | +458 | −1 | Backend, Frontend scripts, Frontend pages |
| Chamith Madushan | 6 | 7 | +535 | −5 | Backend, Frontend pages |
| Shehan Lakshitha | 8 | 7 | +389 | −56 | Backend, Database migrations |
| **Total** | **126** | **239** | | | |

Git identities behind each name (some members committed under more than one):

- **TSSwork** — `TSSwork <teshanss200@gmail.com>`, `TSS <73296222+TSSwork@users.noreply.github.com>`
- **Kenura Gunarathna** — `Kenura Gunarathna <kenura.gunarathna@thenex.global>`, `Kenura R. Gunarathna <125591481+Kenura-R-Gunarathna@users.noreply.github.com>`
- **UNATTRIBUTED (git identity not set)** — `Your Name <your@email.com>` — commit `1bcd3bd`
- **Kaveesha Induwara** — `Kaveesha Induwara <induwarabarca1899@gmail.com>`
- **SASADA** — `SASADA <sasadasamarakoon@gmail.com>`
- **Chamith Madushan** — `Chamith Madushan <cmadushan061@gmail.com>`, `cmadushan061-source <cmadushan061@gmail.com>`
- **Shehan Lakshitha** — `Shehan Lakshitha <lakshithashehan329@gmail.com>`

## TSSwork

61 commits, 115 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/.gitattributes`](../backend/.gitattributes) | 2026-07-15 | `6ad174a` first commit |
| [`backend/.gitignore`](../backend/.gitignore) | 2026-07-15 | `6ad174a` first commit |
| [`backend/mvnw`](../backend/mvnw) | 2026-07-15 | `6ad174a` first commit |
| [`backend/mvnw.cmd`](../backend/mvnw.cmd) | 2026-07-15 | `6ad174a` first commit |
| [`backend/pom.xml`](../backend/pom.xml) | 2026-07-15 | `6ad174a` first commit |
| [`backend/src/main/java/com/suwalink/IT3003/It3003Application.java`](../backend/src/main/java/com/suwalink/IT3003/It3003Application.java) | 2026-07-15 | `6ad174a` first commit |
| [`backend/src/main/java/com/suwalink/IT3003/config/SecurityConfig.java`](../backend/src/main/java/com/suwalink/IT3003/config/SecurityConfig.java) | 2026-07-15 | `61ff05e` Spring Secrity Init |
| [`backend/src/main/java/com/suwalink/IT3003/controller/AuthController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/AuthController.java) | 2026-07-15 | `a62322c` update to auth registration |
| [`backend/src/main/java/com/suwalink/IT3003/controller/UserController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/UserController.java) | 2026-07-15 | `da492d4` login user endpoints |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CustomerRegisterRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CustomerRegisterRequest.java) | 2026-07-15 | `1c6cdda` Requests |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/LoginRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/LoginRequest.java) | 2026-07-15 | `534225b` Rest Enpoint Init |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/PharmacyRegisterRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/PharmacyRegisterRequest.java) | 2026-07-15 | `1c6cdda` Requests |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/ApiErrorResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/ApiErrorResponse.java) | 2026-07-15 | `1c6cdda` Requests |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/ApiResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/ApiResponse.java) | 2026-07-15 | `1c6cdda` Requests |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/AuthResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/AuthResponse.java) | 2026-07-15 | `1c6cdda` Requests |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/UserProfileResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/UserProfileResponse.java) | 2026-07-15 | `da492d4` login user endpoints |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Pharmacy.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Pharmacy.java) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Role.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Role.java) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/main/java/com/suwalink/IT3003/entity/User.java`](../backend/src/main/java/com/suwalink/IT3003/entity/User.java) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/main/java/com/suwalink/IT3003/exception/EmailAlreadyExistsException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/EmailAlreadyExistsException.java) | 2026-07-15 | `12f9293` Erro Exception |
| [`backend/src/main/java/com/suwalink/IT3003/exception/GlobalExceptionHandler.java`](../backend/src/main/java/com/suwalink/IT3003/exception/GlobalExceptionHandler.java) | 2026-07-15 | `12f9293` Erro Exception |
| [`backend/src/main/java/com/suwalink/IT3003/exception/PharmacyNotVerifiedException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/PharmacyNotVerifiedException.java) | 2026-07-15 | `534225b` Rest Enpoint Init |
| [`backend/src/main/java/com/suwalink/IT3003/repository/PharmacyRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/PharmacyRepository.java) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/main/java/com/suwalink/IT3003/repository/UserRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/UserRepository.java) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/main/java/com/suwalink/IT3003/security/CurrentUserProvider.java`](../backend/src/main/java/com/suwalink/IT3003/security/CurrentUserProvider.java) | 2026-07-15 | `da492d4` login user endpoints |
| [`backend/src/main/java/com/suwalink/IT3003/security/JwtAuthenticationEntryPoint.java`](../backend/src/main/java/com/suwalink/IT3003/security/JwtAuthenticationEntryPoint.java) | 2026-07-15 | `03ab620` wrong exception hndling fixed |
| [`backend/src/main/java/com/suwalink/IT3003/security/JwtAuthenticationFilter.java`](../backend/src/main/java/com/suwalink/IT3003/security/JwtAuthenticationFilter.java) | 2026-07-15 | `0fa2906` Auth updtae for login |
| [`backend/src/main/java/com/suwalink/IT3003/security/JwtService.java`](../backend/src/main/java/com/suwalink/IT3003/security/JwtService.java) | 2026-07-15 | `61ff05e` Spring Secrity Init |
| [`backend/src/main/java/com/suwalink/IT3003/security/UserDetailsServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/security/UserDetailsServiceImpl.java) | 2026-07-15 | `0fa2906` Auth updtae for login |
| [`backend/src/main/java/com/suwalink/IT3003/service/AuthService.java`](../backend/src/main/java/com/suwalink/IT3003/service/AuthService.java) | 2026-07-15 | `61ff05e` Spring Secrity Init |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/AuthServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/AuthServiceImpl.java) | 2026-07-15 | `61ff05e` Spring Secrity Init |
| [`backend/src/main/java/com/suwalink/IT3003/controller/MedicineCatalogController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/MedicineCatalogController.java) | 2026-08-02 | `5f450d0` medicine endpoint |
| [`backend/src/main/java/com/suwalink/IT3003/controller/PrescriptionResponseController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/PrescriptionResponseController.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/main/java/com/suwalink/IT3003/controller/ReservationController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/ReservationController.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CancelReservationRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CancelReservationRequest.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CreatePrescriptionResponseRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CreatePrescriptionResponseRequest.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CreateReservationRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CreateReservationRequest.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/PrescriptionResponseResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/PrescriptionResponseResponse.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/ReservationResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/ReservationResponse.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/entity/CancelledBy.java`](../backend/src/main/java/com/suwalink/IT3003/entity/CancelledBy.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionResponse.java`](../backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionResponse.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionResponseItem.java`](../backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionResponseItem.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Reservation.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Reservation.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/entity/ReservationStatus.java`](../backend/src/main/java/com/suwalink/IT3003/entity/ReservationStatus.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/event/ReservationCancelledEvent.java`](../backend/src/main/java/com/suwalink/IT3003/event/ReservationCancelledEvent.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/event/ReservationCreatedEvent.java`](../backend/src/main/java/com/suwalink/IT3003/event/ReservationCreatedEvent.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/exception/InsufficientStockException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/InsufficientStockException.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/exception/InvalidReservationStateException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/InvalidReservationStateException.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/exception/PrescriptionRequestClosedException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/PrescriptionRequestClosedException.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/main/java/com/suwalink/IT3003/exception/ReservationAccessDeniedException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/ReservationAccessDeniedException.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/repository/PrescriptionResponseItemRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/PrescriptionResponseItemRepository.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/repository/PrescriptionResponseRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/PrescriptionResponseRepository.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/repository/ReservationRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/ReservationRepository.java) | 2026-08-02 | `d9e8649` reporsitiries fixed |
| [`backend/src/main/java/com/suwalink/IT3003/service/PrescriptionResponseService.java`](../backend/src/main/java/com/suwalink/IT3003/service/PrescriptionResponseService.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/main/java/com/suwalink/IT3003/service/ReservationService.java`](../backend/src/main/java/com/suwalink/IT3003/service/ReservationService.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/PrescriptionResponseServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/PrescriptionResponseServiceImpl.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/ReservationServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/ReservationServiceImpl.java) | 2026-08-02 | `2563f41` reservation fixed |

### Backend tests

| File | Date added | Commit |
|---|---|---|
| [`backend/src/test/java/com/suwalink/IT3003/It3003ApplicationTests.java`](../backend/src/test/java/com/suwalink/IT3003/It3003ApplicationTests.java) | 2026-07-15 | `6ad174a` first commit |
| [`backend/src/test/java/com/suwalink/IT3003/controller/AuthControllerLoginTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/AuthControllerLoginTest.java) | 2026-07-15 | `534225b` Rest Enpoint Init |
| [`backend/src/test/java/com/suwalink/IT3003/controller/AuthControllerRegistrationTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/AuthControllerRegistrationTest.java) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/test/java/com/suwalink/IT3003/controller/UserControllerMeTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/UserControllerMeTest.java) | 2026-07-15 | `da492d4` login user endpoints |
| [`backend/src/test/java/com/suwalink/IT3003/security/JwtServiceTest.java`](../backend/src/test/java/com/suwalink/IT3003/security/JwtServiceTest.java) | 2026-07-15 | `0fa2906` Auth updtae for login |
| [`backend/src/test/java/com/suwalink/IT3003/security/UserDetailsServiceImplTest.java`](../backend/src/test/java/com/suwalink/IT3003/security/UserDetailsServiceImplTest.java) | 2026-07-15 | `0fa2906` Auth updtae for login |
| [`backend/src/test/resources/application-test.properties`](../backend/src/test/resources/application-test.properties) | 2026-07-15 | `5a27951` INIT CLASSES |
| [`backend/src/test/java/com/suwalink/IT3003/controller/PrescriptionResponseControllerTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/PrescriptionResponseControllerTest.java) | 2026-08-02 | `945f7dd` prescription response |
| [`backend/src/test/java/com/suwalink/IT3003/controller/ReservationControllerTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/ReservationControllerTest.java) | 2026-08-02 | `2563f41` reservation fixed |
| [`backend/src/test/java/com/suwalink/IT3003/event/NotificationEventListenerTest.java`](../backend/src/test/java/com/suwalink/IT3003/event/NotificationEventListenerTest.java) | 2026-08-02 | `2d7e675` notification fixed |

### Database migrations

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/db/changelog/sql/008-prescription-responses.sql`](../backend/src/main/resources/db/changelog/sql/008-prescription-responses.sql) | 2026-08-02 | `9438728` prescription migration |
| [`backend/src/main/resources/db/changelog/sql/009-reservations.sql`](../backend/src/main/resources/db/changelog/sql/009-reservations.sql) | 2026-08-02 | `9438728` prescription migration |

### Backend config

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/application.properties`](../backend/src/main/resources/application.properties) | 2026-07-15 | `6ad174a` first commit |

### Frontend pages

| File | Date added | Commit |
|---|---|---|
| [`frontend/index.html`](../frontend/index.html) | 2026-07-15 | `a4a2dc1` Add index/home and pharmacy dashboard stubs |
| [`frontend/login.html`](../frontend/login.html) | 2026-07-15 | `ce38b41` Add login page |
| [`frontend/pharmacy-dashboard.html`](../frontend/pharmacy-dashboard.html) | 2026-07-15 | `a4a2dc1` Add index/home and pharmacy dashboard stubs |
| [`frontend/register.html`](../frontend/register.html) | 2026-07-15 | `34372d7` Add register page (customer/pharmacy tabs) |
| [`frontend/patient-dashboard.html`](../frontend/patient-dashboard.html) | 2026-08-02 | `af7acb7` pharamcy dasboard |
| [`frontend/search.html`](../frontend/search.html) | 2026-08-02 | `51a5709` search ui |

### Frontend styles

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/css/base/reset.css`](../frontend/assets/css/base/reset.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/base/typography.css`](../frontend/assets/css/base/typography.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/banner.css`](../frontend/assets/css/components/banner.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/buttons.css`](../frontend/assets/css/components/buttons.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/cards.css`](../frontend/assets/css/components/cards.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/progress.css`](../frontend/assets/css/components/progress.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/tabs.css`](../frontend/assets/css/components/tabs.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/text-fields.css`](../frontend/assets/css/components/text-fields.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/layout/shell.css`](../frontend/assets/css/layout/shell.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/main.css`](../frontend/assets/css/main.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/themes/tokens.css`](../frontend/assets/css/themes/tokens.css) | 2026-07-15 | `2fda27d` Add MD3 CSS foundation for auth frontend |
| [`frontend/assets/css/components/reserve-control.css`](../frontend/assets/css/components/reserve-control.css) | 2026-08-02 | `af7acb7` pharamcy dasboard |
| [`frontend/assets/css/pages/patient-dashboard.css`](../frontend/assets/css/pages/patient-dashboard.css) | 2026-08-02 | `af7acb7` pharamcy dasboard |
| [`frontend/assets/css/pages/pharmacy-dashboard.css`](../frontend/assets/css/pages/pharmacy-dashboard.css) | 2026-08-02 | `969524c` pharamcy dashboard ui |
| [`frontend/assets/css/pages/search.css`](../frontend/assets/css/pages/search.css) | 2026-08-02 | `51a5709` search ui |
| [`frontend/assets/css/components/bookmark-button.css`](../frontend/assets/css/components/bookmark-button.css) | 2026-08-05 | `030c6c0` bookmark ui bug fixed |

### Frontend scripts

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/js/api/apiService.js`](../frontend/assets/js/api/apiService.js) | 2026-07-15 | `db3ab1d` Add API/auth JS layer |
| [`frontend/assets/js/auth/auth.js`](../frontend/assets/js/auth/auth.js) | 2026-07-15 | `db3ab1d` Add API/auth JS layer |
| [`frontend/assets/js/auth/tokenStorage.js`](../frontend/assets/js/auth/tokenStorage.js) | 2026-07-15 | `db3ab1d` Add API/auth JS layer |
| [`frontend/assets/js/config/env.js`](../frontend/assets/js/config/env.js) | 2026-07-15 | `db3ab1d` Add API/auth JS layer |
| [`frontend/assets/js/pages/indexPage.js`](../frontend/assets/js/pages/indexPage.js) | 2026-07-15 | `a4a2dc1` Add index/home and pharmacy dashboard stubs |
| [`frontend/assets/js/pages/loginPage.js`](../frontend/assets/js/pages/loginPage.js) | 2026-07-15 | `ce38b41` Add login page |
| [`frontend/assets/js/pages/pharmacyDashboardPage.js`](../frontend/assets/js/pages/pharmacyDashboardPage.js) | 2026-07-15 | `a4a2dc1` Add index/home and pharmacy dashboard stubs |
| [`frontend/assets/js/pages/registerPage.js`](../frontend/assets/js/pages/registerPage.js) | 2026-07-15 | `34372d7` Add register page (customer/pharmacy tabs) |
| [`frontend/assets/js/utils/validators.js`](../frontend/assets/js/utils/validators.js) | 2026-07-15 | `db3ab1d` Add API/auth JS layer |
| [`frontend/assets/js/components/reserveControl.js`](../frontend/assets/js/components/reserveControl.js) | 2026-08-02 | `af7acb7` pharamcy dasboard |
| [`frontend/assets/js/pages/patientDashboardPage.js`](../frontend/assets/js/pages/patientDashboardPage.js) | 2026-08-02 | `af7acb7` pharamcy dasboard |
| [`frontend/assets/js/pages/searchPage.js`](../frontend/assets/js/pages/searchPage.js) | 2026-08-02 | `bcb2817` search js and quering |
| [`frontend/assets/js/components/bookmarkButton.js`](../frontend/assets/js/components/bookmarkButton.js) | 2026-08-05 | `030c6c0` bookmark ui bug fixed |

### Documentation

| File | Date added | Commit |
|---|---|---|
| [`AGENTS.md`](../AGENTS.md) | 2026-07-15 | `21c3781` Ai-assited programming update |
| [`CLAUDE.md`](../CLAUDE.md) | 2026-07-15 | `21c3781` Ai-assited programming update |
| [`CONTEXT/DESIGN.md`](../CONTEXT/DESIGN.md) | 2026-07-15 | `88e587a` Ai-Assiter programming setup |
| [`CONTEXT/PITCH_MVP.md`](../CONTEXT/PITCH_MVP.md) | 2026-07-15 | `88e587a` Ai-Assiter programming setup |
| [`CONTEXT/SPECS.md`](../CONTEXT/SPECS.md) | 2026-07-15 | `88e587a` Ai-Assiter programming setup |
| [`README/READ_AUTHENTICATION_ENDPOINT.md`](../README/READ_AUTHENTICATION_ENDPOINT.md) | 2026-07-15 | `9e5c584` README for my part of the work |
| [`README/DEMO_USERS.md`](../README/DEMO_USERS.md) | 2026-08-05 | `030c6c0` bookmark ui bug fixed |

### Project setup

| File | Date added | Commit |
|---|---|---|
| [`.gitignore`](../.gitignore) | 2026-07-15 | `88e587a` Ai-Assiter programming setup |
| [`docker-compose.yml`](../docker-compose.yml) | 2026-07-15 | `5b34f37` docker setup |
| [`skills-lock.json`](../skills-lock.json) | 2026-07-15 | `88e587a` Ai-Assiter programming setup |

## Kenura Gunarathna

23 commits, 73 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/java/com/suwalink/IT3003/config/JpaAuditingConfig.java`](../backend/src/main/java/com/suwalink/IT3003/config/JpaAuditingConfig.java) | 2026-07-18 | `810a6ea` addign inveory drug entities |
| [`backend/src/main/java/com/suwalink/IT3003/controller/CategoryController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/CategoryController.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/controller/InventoryController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/InventoryController.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/controller/ManufacturerController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/ManufacturerController.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/controller/MedicineMasterController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/MedicineMasterController.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CategoryRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CategoryRequest.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CreateInventoryRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CreateInventoryRequest.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/ManufacturerRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/ManufacturerRequest.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/MedicineMasterRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/MedicineMasterRequest.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/UpdateAvailabilityRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/UpdateAvailabilityRequest.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/UpdateInventoryRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/UpdateInventoryRequest.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/CategoryResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/CategoryResponse.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/InventoryResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/InventoryResponse.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/ManufacturerResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/ManufacturerResponse.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/MedicineMasterResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/MedicineMasterResponse.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/entity/BaseAuditEntity.java`](../backend/src/main/java/com/suwalink/IT3003/entity/BaseAuditEntity.java) | 2026-07-18 | `d9440a0` addign cateorgy and maneafucutre entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Category.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Category.java) | 2026-07-18 | `d9440a0` addign cateorgy and maneafucutre entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Currency.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Currency.java) | 2026-07-18 | `645df75` adding migrations and seedings |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Image.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Image.java) | 2026-07-18 | `810a6ea` addign inveory drug entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/ImageType.java`](../backend/src/main/java/com/suwalink/IT3003/entity/ImageType.java) | 2026-07-18 | `810a6ea` addign inveory drug entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Inventory.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Inventory.java) | 2026-07-18 | `810a6ea` addign inveory drug entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Manufacturer.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Manufacturer.java) | 2026-07-18 | `d9440a0` addign cateorgy and maneafucutre entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/MedicineMaster.java`](../backend/src/main/java/com/suwalink/IT3003/entity/MedicineMaster.java) | 2026-07-18 | `810a6ea` addign inveory drug entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionStatus.java`](../backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionStatus.java) | 2026-07-18 | `d9440a0` addign cateorgy and maneafucutre entities |
| [`backend/src/main/java/com/suwalink/IT3003/entity/UnitOfMeasure.java`](../backend/src/main/java/com/suwalink/IT3003/entity/UnitOfMeasure.java) | 2026-07-18 | `645df75` adding migrations and seedings |
| [`backend/src/main/java/com/suwalink/IT3003/exception/DuplicateResourceException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/DuplicateResourceException.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/exception/InventoryAccessDeniedException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/InventoryAccessDeniedException.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/exception/ResourceNotFoundException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/ResourceNotFoundException.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/repository/CategoryRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/CategoryRepository.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/repository/ImageRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/ImageRepository.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/repository/InventoryRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/InventoryRepository.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/repository/ManufacturerRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/ManufacturerRepository.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/repository/MedicineMasterRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/MedicineMasterRepository.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/CategoryService.java`](../backend/src/main/java/com/suwalink/IT3003/service/CategoryService.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/InventoryService.java`](../backend/src/main/java/com/suwalink/IT3003/service/InventoryService.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/ManufacturerService.java`](../backend/src/main/java/com/suwalink/IT3003/service/ManufacturerService.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/MedicineMasterService.java`](../backend/src/main/java/com/suwalink/IT3003/service/MedicineMasterService.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/CategoryServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/CategoryServiceImpl.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/InventoryServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/InventoryServiceImpl.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/ManufacturerServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/ManufacturerServiceImpl.java) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/MedicineMasterServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/MedicineMasterServiceImpl.java) | 2026-07-18 | `5ded019` addign medicie , manifacture controlelrs |
| [`backend/src/main/java/com/suwalink/IT3003/config/WebConfig.java`](../backend/src/main/java/com/suwalink/IT3003/config/WebConfig.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/controller/ImageController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/ImageController.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/ImageResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/ImageResponse.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/exception/FileStorageException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/FileStorageException.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/exception/InvalidFileException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/InvalidFileException.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/service/ImageService.java`](../backend/src/main/java/com/suwalink/IT3003/service/ImageService.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/ImageServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/ImageServiceImpl.java) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/java/com/suwalink/IT3003/entity/PharmacyStatus.java`](../backend/src/main/java/com/suwalink/IT3003/entity/PharmacyStatus.java) | 2026-08-02 | `90de745` Fix backend bugs: JWT secret, password-reset gaps, notification wiring, admin dashboard, pharmacy reject status, inventory image ownership |
| [`backend/src/main/java/com/suwalink/IT3003/event/PharmacyRejectedEvent.java`](../backend/src/main/java/com/suwalink/IT3003/event/PharmacyRejectedEvent.java) | 2026-08-02 | `90de745` Fix backend bugs: JWT secret, password-reset gaps, notification wiring, admin dashboard, pharmacy reject status, inventory image ownership |

### Backend tests

| File | Date added | Commit |
|---|---|---|
| [`backend/src/test/java/com/suwalink/IT3003/controller/AdminControllerTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/AdminControllerTest.java) | 2026-08-02 | `75c3f13` Add tests for previously-uncovered bug fixes: password reset, admin, notifications, image ownership |
| [`backend/src/test/java/com/suwalink/IT3003/controller/AuthPasswordResetTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/AuthPasswordResetTest.java) | 2026-08-02 | `75c3f13` Add tests for previously-uncovered bug fixes: password reset, admin, notifications, image ownership |
| [`backend/src/test/java/com/suwalink/IT3003/controller/InventoryImageOwnershipTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/InventoryImageOwnershipTest.java) | 2026-08-02 | `75c3f13` Add tests for previously-uncovered bug fixes: password reset, admin, notifications, image ownership |
| [`backend/src/test/java/com/suwalink/IT3003/controller/NotificationControllerTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/NotificationControllerTest.java) | 2026-08-02 | `75c3f13` Add tests for previously-uncovered bug fixes: password reset, admin, notifications, image ownership |
| [`backend/src/test/java/com/suwalink/IT3003/exception/GlobalExceptionHandlerTest.java`](../backend/src/test/java/com/suwalink/IT3003/exception/GlobalExceptionHandlerTest.java) | 2026-08-02 | `75c3f13` Add tests for previously-uncovered bug fixes: password reset, admin, notifications, image ownership |

### Database migrations

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/db/changelog/db.changelog-master.xml`](../backend/src/main/resources/db/changelog/db.changelog-master.xml) | 2026-07-18 | `645df75` adding migrations and seedings |
| [`backend/src/main/resources/db/changelog/sql/001-baseline.sql`](../backend/src/main/resources/db/changelog/sql/001-baseline.sql) | 2026-07-18 | `645df75` adding migrations and seedings |
| [`backend/src/main/resources/db/changelog/sql/002-inventory-availability.sql`](../backend/src/main/resources/db/changelog/sql/002-inventory-availability.sql) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/resources/db/changelog/sql/003-seed-reference-data.sql`](../backend/src/main/resources/db/changelog/sql/003-seed-reference-data.sql) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/resources/db/changelog/sql/004-admin-role.sql`](../backend/src/main/resources/db/changelog/sql/004-admin-role.sql) | 2026-07-18 | `ada926b` adding new response req files dto, and controllers |
| [`backend/src/main/resources/db/changelog/sql/005-image-metadata.sql`](../backend/src/main/resources/db/changelog/sql/005-image-metadata.sql) | 2026-07-20 | `2137650` add image upload with webp conversion, admin duplicate checks |
| [`backend/src/main/resources/db/changelog/sql/010-pharmacy-status.sql`](../backend/src/main/resources/db/changelog/sql/010-pharmacy-status.sql) | 2026-08-02 | `90de745` Fix backend bugs: JWT secret, password-reset gaps, notification wiring, admin dashboard, pharmacy reject status, inventory image ownership |
| [`backend/src/main/resources/db/changelog/sql/011-image-owner.sql`](../backend/src/main/resources/db/changelog/sql/011-image-owner.sql) | 2026-08-02 | `90de745` Fix backend bugs: JWT secret, password-reset gaps, notification wiring, admin dashboard, pharmacy reject status, inventory image ownership |

### Backend config

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/liquibase.properties`](../backend/src/main/resources/liquibase.properties) | 2026-07-18 | `645df75` adding migrations and seedings |

### Frontend styles

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/css/pages/admin-dashboard.css`](../frontend/assets/css/pages/admin-dashboard.css) | 2026-08-03 | `cacc4c9` Rebuild admin dashboard as one tabbed page; fix AdminController's missing response envelope |

### Frontend scripts

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/js/pages/adminDashboardPage.js`](../frontend/assets/js/pages/adminDashboardPage.js) | 2026-08-03 | `cacc4c9` Rebuild admin dashboard as one tabbed page; fix AdminController's missing response envelope |

### Documentation

| File | Date added | Commit |
|---|---|---|
| [`commands.md`](../commands.md) | 2026-07-18 | `645df75` adding migrations and seedings |
| [`README/READ_INVENTORY_MODULE.md`](../README/READ_INVENTORY_MODULE.md) | 2026-07-20 | `41f472b` add inventory module README with class diagram, swagger and run instructions |
| [`README/DIAGRAMS.md`](../README/DIAGRAMS.md) | 2026-08-02 | `71f2f2c` Add system diagrams (ER, use case, class, sequence, activity, state) |
| [`README/READ_ADMIN_MODULE.md`](../README/READ_ADMIN_MODULE.md) | 2026-08-02 | `302286d` Fix widespread LazyInitializationException crashes on read endpoints, update module docs |
| [`README/READ_NOTIFICATION_MODULE.md`](../README/READ_NOTIFICATION_MODULE.md) | 2026-08-02 | `302286d` Fix widespread LazyInitializationException crashes on read endpoints, update module docs |
| [`README.md`](../README.md) | 2026-08-03 | `01aa3e6` Add root README with quick start and doc index |

### Project setup

| File | Date added | Commit |
|---|---|---|
| [`scripts/dev-up.sh`](../scripts/dev-up.sh) | 2026-07-18 | `810a6ea` addign inveory drug entities |

## UNATTRIBUTED (git identity not set)

1 commits, 14 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/java/com/suwalink/IT3003/controller/PrescriptionRequestController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/PrescriptionRequestController.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/CreatePrescriptionRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/CreatePrescriptionRequest.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/UpdatePrescriptionRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/UpdatePrescriptionRequest.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/PrescriptionRequestResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/PrescriptionRequestResponse.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionRequest.java`](../backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionRequest.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionRequestStatus.java`](../backend/src/main/java/com/suwalink/IT3003/entity/PrescriptionRequestStatus.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/exception/PrescriptionAccessDeniedException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/PrescriptionAccessDeniedException.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/repository/PrescriptionRequestRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/PrescriptionRequestRepository.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/service/PrescriptionRequestService.java`](../backend/src/main/java/com/suwalink/IT3003/service/PrescriptionRequestService.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/PrescriptionRequestServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/PrescriptionRequestServiceImpl.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |

### Backend tests

| File | Date added | Commit |
|---|---|---|
| [`backend/src/test/java/com/suwalink/IT3003/controller/PrescriptionRequestControllerTest.java`](../backend/src/test/java/com/suwalink/IT3003/controller/PrescriptionRequestControllerTest.java) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |

### Database migrations

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/db/changelog/sql/006-prescription-requests.sql`](../backend/src/main/resources/db/changelog/sql/006-prescription-requests.sql) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |

### Documentation

| File | Date added | Commit |
|---|---|---|
| [`APPLY_INSTRUCTIONS.md`](../APPLY_INSTRUCTIONS.md) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |
| [`README/READ_PRESCRIPTION_MODULE.md`](../README/READ_PRESCRIPTION_MODULE.md) | 2026-07-23 | `1bcd3bd` Add prescription request CRUD module |

## Kaveesha Induwara

26 commits, 13 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/java/com/suwalink/IT3003/controller/NotificationController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/NotificationController.java) | 2026-07-27 | `6dd91af` Create NotificationController.java |
| [`backend/src/main/java/com/suwalink/IT3003/dto/NotificationResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/NotificationResponse.java) | 2026-07-27 | `4a78923` Create NotificationResponse.java |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Notification.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Notification.java) | 2026-07-27 | `4390bd8` Create Notification.java |
| [`backend/src/main/java/com/suwalink/IT3003/entity/NotificationType.java`](../backend/src/main/java/com/suwalink/IT3003/entity/NotificationType.java) | 2026-07-27 | `d7dc95c` Create NotificationType.java |
| [`backend/src/main/java/com/suwalink/IT3003/event/NotificationEventListener.java`](../backend/src/main/java/com/suwalink/IT3003/event/NotificationEventListener.java) | 2026-07-27 | `f085dee` Create NotificationEventListener.java |
| [`backend/src/main/java/com/suwalink/IT3003/event/PharmacyRespondedEvent.java`](../backend/src/main/java/com/suwalink/IT3003/event/PharmacyRespondedEvent.java) | 2026-07-27 | `d4007e8` Create PharmacyRespondedEvent.java |
| [`backend/src/main/java/com/suwalink/IT3003/event/PharmacyVerifiedEvent.java`](../backend/src/main/java/com/suwalink/IT3003/event/PharmacyVerifiedEvent.java) | 2026-07-27 | `8816cd2` Create PharmacyVerifiedEvent.java |
| [`backend/src/main/java/com/suwalink/IT3003/event/PrescriptionAddedEvent.java`](../backend/src/main/java/com/suwalink/IT3003/event/PrescriptionAddedEvent.java) | 2026-07-27 | `e0a8a2d` Create PrescriptionAddedEvent.java |
| [`backend/src/main/java/com/suwalink/IT3003/repository/NotificationRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/NotificationRepository.java) | 2026-07-27 | `0f04439` Create NotificationRepository.java |
| [`backend/src/main/java/com/suwalink/IT3003/service/NotificationService.java`](../backend/src/main/java/com/suwalink/IT3003/service/NotificationService.java) | 2026-07-27 | `255538a` Create NotificationService.java |

### Database migrations

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/db/changelog/sql/006-notifications.sql`](../backend/src/main/resources/db/changelog/sql/006-notifications.sql) | 2026-07-27 | `c9ddc16` Create 006-notifications.sql |

### Frontend styles

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/css/components/notifications.css`](../frontend/assets/css/components/notifications.css) | 2026-07-27 | `deb5028` Create notifications.css |

### Frontend scripts

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/js/notification.js`](../frontend/assets/js/notification.js) | 2026-07-27 | `a908459` Create notification.js |

## SASADA

1 commits, 10 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/ForgotPasswordRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/ForgotPasswordRequest.java) | 2026-08-02 | `d260048` Add password reset with OTP via email |
| [`backend/src/main/java/com/suwalink/IT3003/dto/request/ResetPasswordRequest.java`](../backend/src/main/java/com/suwalink/IT3003/dto/request/ResetPasswordRequest.java) | 2026-08-02 | `d260048` Add password reset with OTP via email |
| [`backend/src/main/java/com/suwalink/IT3003/exception/InvalidOtpException.java`](../backend/src/main/java/com/suwalink/IT3003/exception/InvalidOtpException.java) | 2026-08-02 | `d260048` Add password reset with OTP via email |
| [`backend/src/main/java/com/suwalink/IT3003/service/MailService.java`](../backend/src/main/java/com/suwalink/IT3003/service/MailService.java) | 2026-08-02 | `d260048` Add password reset with OTP via email |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/MailServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/MailServiceImpl.java) | 2026-08-02 | `d260048` Add password reset with OTP via email |

### Database migrations

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/db/changelog/sql/007-password-reset.sql`](../backend/src/main/resources/db/changelog/sql/007-password-reset.sql) | 2026-08-02 | `d260048` Add password reset with OTP via email |

### Frontend pages

| File | Date added | Commit |
|---|---|---|
| [`frontend/forgot-password.html`](../frontend/forgot-password.html) | 2026-08-02 | `d260048` Add password reset with OTP via email |
| [`frontend/reset-password.html`](../frontend/reset-password.html) | 2026-08-02 | `d260048` Add password reset with OTP via email |

### Frontend scripts

| File | Date added | Commit |
|---|---|---|
| [`frontend/assets/js/pages/forgotPasswordPage.js`](../frontend/assets/js/pages/forgotPasswordPage.js) | 2026-08-02 | `d260048` Add password reset with OTP via email |
| [`frontend/assets/js/pages/resetPasswordPage.js`](../frontend/assets/js/pages/resetPasswordPage.js) | 2026-08-02 | `d260048` Add password reset with OTP via email |

## Chamith Madushan

6 commits, 7 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/java/com/suwalink/IT3003/controller/AdminController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/AdminController.java) | 2026-07-22 | `6d37308` user management and pharamcy management |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/DashboardResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/DashboardResponse.java) | 2026-07-22 | `6d37308` user management and pharamcy management |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/PharmacyResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/PharmacyResponse.java) | 2026-07-22 | `6d37308` user management and pharamcy management |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/UserResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/UserResponse.java) | 2026-07-22 | `6d37308` user management and pharamcy management |
| [`backend/src/main/java/com/suwalink/IT3003/service/AdminService.java`](../backend/src/main/java/com/suwalink/IT3003/service/AdminService.java) | 2026-07-22 | `6d37308` user management and pharamcy management |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/AdminServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/AdminServiceImpl.java) | 2026-07-22 | `6d37308` user management and pharamcy management |

### Frontend pages

| File | Date added | Commit |
|---|---|---|
| [`frontend/admin-dashboard.html`](../frontend/admin-dashboard.html) | 2026-07-22 | `6d37308` user management and pharamcy management |

## Shehan Lakshitha

8 commits, 7 files created.

### Backend

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/java/com/suwalink/IT3003/controller/BookmarkController.java`](../backend/src/main/java/com/suwalink/IT3003/controller/BookmarkController.java) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |
| [`backend/src/main/java/com/suwalink/IT3003/dto/response/BookmarkResponse.java`](../backend/src/main/java/com/suwalink/IT3003/dto/response/BookmarkResponse.java) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |
| [`backend/src/main/java/com/suwalink/IT3003/entity/Bookmark.java`](../backend/src/main/java/com/suwalink/IT3003/entity/Bookmark.java) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |
| [`backend/src/main/java/com/suwalink/IT3003/repository/BookmarkRepository.java`](../backend/src/main/java/com/suwalink/IT3003/repository/BookmarkRepository.java) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |
| [`backend/src/main/java/com/suwalink/IT3003/service/BookmarkService.java`](../backend/src/main/java/com/suwalink/IT3003/service/BookmarkService.java) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |
| [`backend/src/main/java/com/suwalink/IT3003/service/impl/BookmarkServiceImpl.java`](../backend/src/main/java/com/suwalink/IT3003/service/impl/BookmarkServiceImpl.java) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |

### Database migrations

| File | Date added | Commit |
|---|---|---|
| [`backend/src/main/resources/db/changelog/sql/002-add-bookmarks-table.sql`](../backend/src/main/resources/db/changelog/sql/002-add-bookmarks-table.sql) | 2026-07-25 | `ffdd044` Add bookmark feature and enhance inventory search with filters |

---

Regenerate the raw data with:

```bash
git log --all --reverse --diff-filter=A --date=short \
    --format='COMMIT|%h|%an|%ad|%s' --name-only
```
