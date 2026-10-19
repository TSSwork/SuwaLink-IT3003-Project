# Applying this package

This mirrors your repo's folder structure exactly, so from your repo root you can just extract
and overwrite:

```bash
unzip -o prescription-module.zip -d /path/to/suwalink
```

## New files (safe to drop in)

- backend/src/main/java/com/suwalink/entity/PrescriptionRequestStatus.java
- backend/src/main/java/com/suwalink/entity/PrescriptionRequest.java
- backend/src/main/java/com/suwalink/repository/PrescriptionRequestRepository.java
- backend/src/main/java/com/suwalink/dto/request/CreatePrescriptionRequest.java
- backend/src/main/java/com/suwalink/dto/request/UpdatePrescriptionRequest.java
- backend/src/main/java/com/suwalink/dto/response/PrescriptionRequestResponse.java
- backend/src/main/java/com/suwalink/exception/PrescriptionAccessDeniedException.java
- backend/src/main/java/com/suwalink/service/PrescriptionRequestService.java
- backend/src/main/java/com/suwalink/service/impl/PrescriptionRequestServiceImpl.java
- backend/src/main/java/com/suwalink/controller/PrescriptionRequestController.java
- backend/src/main/resources/db/changelog/sql/006-prescription-requests.sql
- backend/src/test/java/com/suwalink/controller/PrescriptionRequestControllerTest.java
- README/READ_PRESCRIPTION_MODULE.md

## Modified files (overwrite — check the diff first if others have touched them since)

- `entity/ImageType.java` — added a `PRESCRIPTION` value (was `PROFILE`, `INVENTORY`)
- `exception/GlobalExceptionHandler.java` — added a 403 handler for
  `PrescriptionAccessDeniedException`, right after the existing `InventoryAccessDeniedException`
  handler
- `db/changelog/db.changelog-master.xml` — added a `006-prescription-requests` `<changeSet>` at
  the end, pointing at the new SQL file

## After copying

```bash
cd backend && ./mvnw clean test
```

I couldn't run Maven myself (no network access to Maven Central from where I built this), so
please run the test suite before committing. The most likely trouble spots if something fails:

- The `@ModelAttribute` multipart binding for the optional `image` part on `PUT` (Spring should
  bind it, but worth confirming in your Spring Boot version).
- The `ALTER TABLE images MODIFY COLUMN image_type ENUM(...)` statement in
  `006-prescription-requests.sql` — MySQL syntax, untested against your actual instance.
