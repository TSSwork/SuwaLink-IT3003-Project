# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the backend on a clean, safe base: Java 25, package `com.suwalink`, role `PHARMACY_OWNER`, no secrets in the repo, dev/test/prod profiles, admin created from environment, one squashed Liquibase baseline verified against real MySQL.

**Architecture:** No new features. Mechanical renames first (so later diffs stay small), then configuration split into profiles with secrets read from environment, then an `ApplicationRunner` that bootstraps the admin, then the migration squash, proven by a Testcontainers test that runs Liquibase on MySQL 8 and Hibernate `validate`.

**Tech Stack:** Spring Boot 4.1, Java 25, Maven wrapper, Liquibase, MySQL 8, H2 (tests), Testcontainers (Boot‑managed versions), Mailpit (dev mail).

**Spec:** `docs/superpowers/specs/2026-10-20-suwalink-production-design.md` (§7 builder's calls, §9.9 security/config, §15 phase 0).

## Global Constraints

- Java `25` (LTS). Package root `com.suwalink`. Main class `SuwaLinkApplication`.
- Roles exactly: `ADMIN`, `CUSTOMER`, `PHARMACY_OWNER`.
- No secret values committed: no real mail password, no JWT secret default outside the `dev`/`test` profiles, no admin password outside `dev`.
- `.env.example` committed at repo root; `.env` git‑ignored.
- Profiles: `dev` (default when none set), `test`, `prod`. Swagger UI and `/v3/api-docs` off in `prod`.
- `prod` must fail at startup if `JWT_SECRET`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `ADMIN_EMAIL` or `ADMIN_PASSWORD` is missing.
- Liquibase changelog has exactly two changesets after the squash: `001-baseline`, `002-reference-data`.
- Work on `main`; one commit per task (more is fine). Run all commands from `backend/` unless stated.
- `docs/` is currently in `.gitignore`; do not commit plan/spec files unless the owner changes that.

## Review Focus

1. **Existing dev database after the squash** — Liquibase sees changed changesets and refuses to start. Expected: README tells the developer to run `docker compose down -v` once; covered in Task 6 docs step.
2. **An admin already exists with a different email than `ADMIN_EMAIL`** — expected: no second admin, no password change. Test in Task 5.
3. **`JWT_SECRET` set but shorter than 32 bytes in prod** — expected: startup fails with a message naming `JWT_SECRET`. Test in Task 4.
4. **Leftover `IT3003` / `PHARMACY_ADMIN` strings** (liquibase.properties, docs, old frontend role checks) — expected: zero matches after Tasks 2–3. Grep step in each task.
5. **`ADMIN_PASSWORD` shorter than 12 characters** — expected: startup fails rather than creating a weak admin. Test in Task 5.

---

### Task 1: Java 25 and a green baseline

**Files:**
- Modify: `backend/pom.xml` (`<java.version>`)
- Modify: `backend/src/test/java/com/suwalink/IT3003/It3003ApplicationTests.java` (add `@ActiveProfiles("test")`; today it tries to reach MySQL)
- Modify: `CONTEXT/SPECS.md` (Language line → `Java 25 (LTS)`), `README.md` (stack line, "needs JDK 25")

- [ ] **Step 1:** Set `<java.version>25</java.version>`.
- [ ] **Step 2:** Run `./mvnw -q clean test`. Expected: all tests pass. If any fail for reasons other than the MySQL context test, stop and report them — do not fix unrelated bugs in this phase.
- [ ] **Step 3:** Add `@ActiveProfiles("test")` to `It3003ApplicationTests`; rerun. Expected: `BUILD SUCCESS`.
- [ ] **Step 4:** Update SPECS.md and README.md as listed.
- [ ] **Step 5:** Commit `chore: move to Java 25 LTS and make context test use test profile`.

### Task 2: Package rename `com.suwalink.IT3003` → `com.suwalink`

**Files:**
- Move: `backend/src/main/java/com/suwalink/IT3003/**` → `backend/src/main/java/com/suwalink/**` (same for `src/test/java`) using `git mv`
- Rename: `It3003Application.java` → `SuwaLinkApplication.java`; `It3003ApplicationTests.java` → `SuwaLinkApplicationTests.java`
- Modify: every `package`/`import` line; `backend/pom.xml` (`artifactId`/`name` → `suwalink`); `application.properties` (`spring.application.name=suwalink`); `liquibase.properties` (`referenceUrl` entity package `com.suwalink.entity`); `README.md` structure line; any `README/*.md` mentioning the package

**Interfaces:**
- Produces: `com.suwalink.SuwaLinkApplication`; all later tasks use `com.suwalink.*` packages.

- [ ] **Step 1:** `git mv` the directories and the two class files; `sed -i 's/com\.suwalink\.IT3003/com.suwalink/g'` over all `.java` files under `backend/src`; rename the class identifiers.
- [ ] **Step 2:** Run `grep -rn 'IT3003\|It3003' backend/ README.md README/ commands.md CONTEXT/ --include='*' | grep -v '/target/'`. Expected: no matches (the GitHub repo name in URLs is allowed).
- [ ] **Step 3:** Run `./mvnw -q clean test`. Expected: `BUILD SUCCESS`, same test count as Task 1.
- [ ] **Step 4:** Commit `refactor: rename package to com.suwalink`.

### Task 3: Role rename `PHARMACY_ADMIN` → `PHARMACY_OWNER`

**Files:**
- Modify: `backend/src/main/java/com/suwalink/entity/Role.java`, every `Role.PHARMACY_ADMIN` use (9 sites) and every `hasRole("PHARMACY_ADMIN")` / `@PreAuthorize` string (16 sites) in `backend/src/main/java`
- Modify: all tests referencing the old name
- Modify: old frontend role checks in `frontend/assets/js/**` (frontend is replaced in Phase 2 but must keep working until then)
- Modify: `README/*.md` mentions
- Test: `backend/src/test/java/com/suwalink/controller/AuthControllerRegistrationTest.java`

The SQL enum is renamed in Task 6 (squash); tests use H2 `create-drop`, so they pass without it.

- [ ] **Step 1: Write the failing test** in `AuthControllerRegistrationTest`:

```java
@Test
void pharmacyRegistrationCreatesPharmacyOwnerRole() throws Exception {
    // register a pharmacy through POST /api/auth/register/pharmacy (reuse the class's existing helper/payload)
    User saved = userRepository.findByEmail("owner.role@example.com").orElseThrow();
    assertThat(saved.getRole()).isEqualTo(Role.PHARMACY_OWNER);
}
```

- [ ] **Step 2:** Run `./mvnw -q test -Dtest=AuthControllerRegistrationTest`. Expected: compilation failure, `PHARMACY_OWNER` not found.
- [ ] **Step 3:** Rename the enum constant and every usage (Java, tests, frontend JS, docs).
- [ ] **Step 4:** Run `grep -rn 'PHARMACY_ADMIN' backend/src/main/java backend/src/test frontend README`. Expected: no matches.
- [ ] **Step 5:** Run `./mvnw -q clean test`. Expected: `BUILD SUCCESS`.
- [ ] **Step 6:** Commit `refactor: rename PHARMACY_ADMIN role to PHARMACY_OWNER`.

### Task 4: Profiles, secrets from environment, Mailpit

**Files:**
- Modify: `backend/src/main/resources/application.properties` — shared settings only; every secret/host as a placeholder with **no default**:
  `spring.datasource.url=${DB_URL}`, `spring.datasource.username=${DB_USERNAME}`, `spring.datasource.password=${DB_PASSWORD}`, `app.jwt.secret=${JWT_SECRET}`, `spring.mail.host=${MAIL_HOST}`, `spring.mail.port=${MAIL_PORT:587}`, `spring.mail.username=${MAIL_USERNAME:}`, `spring.mail.password=${MAIL_PASSWORD:}`, `app.mail.from=${MAIL_FROM:no-reply@suwalink.lk}`, `app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:}`, `app.upload.dir=${UPLOAD_DIR:uploads}`, `spring.profiles.default=dev`. Remove the Gmail username/password lines entirely.
- Create: `application-dev.properties` — dev values: DB `jdbc:mysql://localhost:3308/suwalink_db?...` / `suwalink_user` / `suwalink_password`, a dev‑only JWT secret (new random 64 chars, not the old one), `MAIL_HOST` → `localhost`, port `1025`, `spring.mail.properties.mail.smtp.auth=false`, `starttls.enable=false`, CORS `http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500`.
- Create: `application-prod.properties` — `springdoc.api-docs.enabled=false`, `springdoc.swagger-ui.enabled=false`, `spring.mail.properties.mail.smtp.auth=true`, `starttls.enable=true`.
- Modify: `application-test.properties` — add `spring.mail.host=localhost`, `app.mail.from=test@suwalink.local`, `app.cors.allowed-origins=http://localhost:3000` (keep existing values).
- Modify: `backend/src/main/java/com/suwalink/service/impl/MailServiceImpl.java` — sender from `@Value("${app.mail.from}")` instead of `spring.mail.username`.
- Modify: `backend/src/main/java/com/suwalink/security/JwtService.java` — constructor throws `IllegalStateException("JWT_SECRET must be at least 32 bytes")` when the secret is shorter than 32 bytes (UTF‑8).
- Modify: `docker-compose.yml` — add `mailpit` service (`axllent/mailpit:v1.21`, ports `1025:1025`, `8025:8025`).
- Create: `.env.example` (repo root) listing every variable above plus `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `SPRING_PROFILES_ACTIVE=prod`, each with a comment.
- Modify: `.gitignore` — add `.env`.
- Modify: `README.md`, `commands.md` — dev runs need nothing extra (dev profile is default); Mailpit inbox at `http://localhost:8025`; prod needs `.env`.
- Test: `backend/src/test/java/com/suwalink/config/ProdProfileConfigTest.java`, `backend/src/test/java/com/suwalink/security/JwtServiceTest.java`

- [ ] **Step 1: Write the failing tests.**

```java
// ProdProfileConfigTest — boots the real app in prod with every required value except JWT_SECRET
@Test
void prodFailsToStartWithoutJwtSecret() {
    var app = new SpringApplicationBuilder(SuwaLinkApplication.class)
        .profiles("prod").web(WebApplicationType.NONE)
        .properties("DB_URL=jdbc:h2:mem:prodcheck", "DB_USERNAME=sa", "DB_PASSWORD=",
                    "spring.datasource.driverClassName=org.h2.Driver",
                    "spring.liquibase.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
                    "MAIL_HOST=localhost", "ADMIN_EMAIL=a@b.lk", "ADMIN_PASSWORD=long-enough-pass");
    Throwable t = catchThrowable(app::run);
    assertThat(t).isNotNull();
    assertThat(rootCauseMessages(t)).contains("JWT_SECRET");
}

// JwtServiceTest
@Test
void rejectsSecretShorterThan32Bytes() {
    assertThatThrownBy(() -> new JwtService("too-short", 86_400_000L))
        .isInstanceOf(IllegalStateException.class).hasMessageContaining("JWT_SECRET");
}
```

`rootCauseMessages` is a small helper in the test that joins the messages of the cause chain.

- [ ] **Step 2:** Run `./mvnw -q test -Dtest='ProdProfileConfigTest,JwtServiceTest'`. Expected: `JwtServiceTest` fails (Jjwt's `WeakKeyException`, not `IllegalStateException`); `ProdProfileConfigTest` fails because the JWT secret still has a default.
- [ ] **Step 3:** Make the property, `JwtService` and `MailServiceImpl` changes listed above.
- [ ] **Step 4:** Run `./mvnw -q clean test`. Expected: `BUILD SUCCESS`.
- [ ] **Step 5:** Run `grep -rn 'wrnfgnvuzsrjqhzz\|tsspredator200\|pQZQRQOR92' --exclude-dir=target --exclude-dir=.git .` from the repo root. Expected: no matches.
- [ ] **Step 6:** Manual check: `docker compose up -d && ./mvnw spring-boot:run`, then `POST /api/auth/forgot-password` for an existing user. Expected: the OTP email appears in Mailpit at `http://localhost:8025`.
- [ ] **Step 7:** Commit `chore: move secrets to environment, add dev/prod profiles and Mailpit`.

### Task 5: Admin bootstrap from environment

**Files:**
- Create: `backend/src/main/java/com/suwalink/config/AdminBootstrap.java`
- Modify: `application.properties` — `app.admin.email=${ADMIN_EMAIL}`, `app.admin.password=${ADMIN_PASSWORD}`, `app.admin.name=${ADMIN_NAME:SuwaLink Admin}`
- Modify: `application-dev.properties` — `ADMIN_EMAIL=admin@suwalink.local`, `ADMIN_PASSWORD=` a dev‑only value of ≥12 chars (documented in README as dev only)
- Modify: `application-test.properties` — `app.admin.email=bootstrap.admin@suwalink.local`, `app.admin.password=test-admin-password`
- Modify: `README.md` — remove `AdminPass123!`; explain dev admin and `ADMIN_EMAIL`/`ADMIN_PASSWORD` for prod
- Test: `backend/src/test/java/com/suwalink/config/AdminBootstrapTest.java`

**Interfaces:**
- Consumes: `UserRepository.countByRole(Role)`, `UserRepository.save`, `PasswordEncoder`.
- Produces: `AdminBootstrap implements ApplicationRunner`; constructor `(UserRepository, PasswordEncoder, @Value email, @Value password, @Value name)`; public `void run(ApplicationArguments)`. Task 6 relies on it creating the only admin (the SQL insert is removed there).

Behaviour: if `countByRole(ADMIN) > 0` → log at INFO "Admin exists, skipping bootstrap" and return. Otherwise validate (`email` non‑blank, `password.length() >= 12`, else throw `IllegalStateException` naming `ADMIN_EMAIL`/`ADMIN_PASSWORD`) and save a `User` with role `ADMIN`, phone `"0000000000"`, encoded password. Never log the password.

- [ ] **Step 1: Write the failing tests** (plain unit tests with Mockito mocks for the repository and a real `PasswordEncoderFactories.createDelegatingPasswordEncoder()`):

```java
@Test void createsAdminWhenNoneExists()          // countByRole→0: save called once; saved role ADMIN, email "boot@suwalink.lk", password matches "long-enough-pass"
@Test void doesNothingWhenAnAdminAlreadyExists()  // countByRole→1 with a different email configured: save never called
@Test void failsWhenPasswordShorterThan12()       // "short": IllegalStateException, message contains "ADMIN_PASSWORD"; save never called
@Test void failsWhenEmailBlank()                  // "": IllegalStateException, message contains "ADMIN_EMAIL"
```

- [ ] **Step 2:** Run `./mvnw -q test -Dtest=AdminBootstrapTest`. Expected: compilation failure, `AdminBootstrap` not found.
- [ ] **Step 3:** Implement `AdminBootstrap` and the property changes.
- [ ] **Step 4:** Run `./mvnw -q clean test`. Expected: `BUILD SUCCESS` (existing tests that create their own admin still pass because they add a second admin directly, which bootstrap doesn't touch).
- [ ] **Step 5:** Commit `feat: bootstrap admin account from environment`.

### Task 6: Squash Liquibase migrations into one baseline, verified on MySQL

**Files:**
- Create: `backend/src/main/resources/db/changelog/sql/001-baseline.sql` (replaces the old file)
- Create: `backend/src/main/resources/db/changelog/sql/002-reference-data.sql` (content of old `003-seed-reference-data.sql`, unchanged)
- Delete: all other files in `db/changelog/sql/`
- Modify: `db/changelog/db.changelog-master.xml` — exactly two changesets, ids `001-baseline` and `002-reference-data`
- Modify: `backend/src/main/resources/liquibase.properties` — `changeLogFile=src/main/resources/db/changelog/db.changelog-master.xml`
- Modify: `backend/pom.xml` — test deps `org.springframework.boot:spring-boot-testcontainers`, `org.testcontainers:testcontainers-mysql`, `org.testcontainers:testcontainers-junit-jupiter` (versions managed by Boot)
- Modify: `README.md`, `commands.md` — "after pulling this change once: `docker compose down -v && docker compose up -d`"
- Test: `backend/src/test/java/com/suwalink/SchemaMigrationTest.java`

- [ ] **Step 1: Write the failing test.**

```java
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@TestPropertySource(properties = {
    "spring.liquibase.enabled=true",
    "spring.jpa.hibernate.ddl-auto=validate"})
class SchemaMigrationTest {
    @Container @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.0");

    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;

    @Test void migrationsMatchEntitiesAndSeedReferenceData() {
        // context started => Hibernate validate passed against the Liquibase schema
        assertThat(users.countByRole(Role.ADMIN)).isEqualTo(1);          // from AdminBootstrap, not SQL
        assertThat(jdbc.queryForObject("select count(*) from medicine_master", Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject(
            "select count(*) from DATABASECHANGELOG", Integer.class)).isEqualTo(2);
    }
}
```

- [ ] **Step 2:** Run `./mvnw -q test -Dtest=SchemaMigrationTest`. Expected: FAIL — with the old changelog, validate fails on the `role` enum (`PHARMACY_ADMIN`) and/or the changelog count is 12 and admin count is 2 (SQL insert + bootstrap).
- [ ] **Step 3: Generate the baseline.** From the repo root, on a commit *before* this task's changelog edits:
  `docker compose down -v && docker compose up -d mysql`, run `./mvnw spring-boot:run` once so the old changelog applies, stop it, then
  `docker compose exec mysql mysqldump -usuwalink_user -psuwalink_password --no-data --skip-comments --skip-add-drop-table --skip-set-charset --ignore-table=suwalink_db.DATABASECHANGELOG --ignore-table=suwalink_db.DATABASECHANGELOGLOCK suwalink_db > backend/src/main/resources/db/changelog/sql/001-baseline.sql`.
  Then edit it by hand: strip `/*!...*/` conditional lines and `AUTO_INCREMENT=n` values; change the `users.role` enum to `('CUSTOMER','PHARMACY_OWNER','ADMIN')`; keep all `_aud`/`revinfo` tables.
- [ ] **Step 4:** Copy `003-seed-reference-data.sql` to `002-reference-data.sql`; delete the other SQL files; rewrite the master changelog and `liquibase.properties` as listed.
- [ ] **Step 5:** Run `./mvnw -q test -Dtest=SchemaMigrationTest`. Expected: PASS.
- [ ] **Step 6:** Run `./mvnw -q clean test`. Expected: `BUILD SUCCESS`.
- [ ] **Step 7:** Manual check: `docker compose down -v && docker compose up -d && ./mvnw spring-boot:run`. Expected: starts cleanly; logging in as the dev admin works through Swagger at `http://localhost:8080/swagger-ui/index.html`.
- [ ] **Step 8:** Update README/commands docs. Commit `chore: squash Liquibase migrations into a single baseline`.

---

## Done when

- `./mvnw clean test` is green on Java 25, including `SchemaMigrationTest` against MySQL 8.
- Repo greps for the old mail password, the old JWT secret, `IT3003` and `PHARMACY_ADMIN` return nothing.
- `docker compose up -d && ./mvnw spring-boot:run` works with zero extra setup; mail lands in Mailpit.
- With `SPRING_PROFILES_ACTIVE=prod`, the app refuses to start unless the required environment variables are set.
