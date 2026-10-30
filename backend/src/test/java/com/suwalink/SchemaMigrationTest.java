package com.suwalink;

import static org.assertj.core.api.Assertions.assertThat;

import com.suwalink.entity.Role;
import com.suwalink.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Applies the real Liquibase changelog to MySQL 8.4 (the prod image) and lets Hibernate validate the entities against it.
 * Requires a reachable container runtime (see commands.md).
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@TestPropertySource(properties = {
        "spring.liquibase.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"})
class SchemaMigrationTest {

    @Container
    @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4");

    @Autowired
    UserRepository users;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void migrationsMatchEntitiesAndSeedReferenceData() {
        // context started => Hibernate validate passed against the Liquibase schema
        assertThat(users.countByRole(Role.ADMIN)).isEqualTo(1); // from AdminBootstrap, not SQL
        assertThat(users.existsByEmail("bootstrap.admin@suwalink.local")).isTrue();
        // Hibernate validate does not compare MySQL ENUM values, so check the role column explicitly
        assertThat(jdbc.queryForObject(
                "select column_type from information_schema.columns"
                        + " where table_schema = database() and table_name = 'users' and column_name = 'role'",
                String.class)).isEqualTo("enum('CUSTOMER','PHARMACY_OWNER','ADMIN')");
        assertThat(jdbc.queryForObject(
                "select column_type from information_schema.columns"
                        + " where table_schema = database() and table_name = 'prescription_requests'"
                        + " and column_name = 'status'",
                String.class)).isEqualTo("enum('PENDING','RESPONDED','CLOSED','EXPIRED')");
        assertThat(jdbc.queryForObject(
                "select column_type from information_schema.columns"
                        + " where table_schema = database() and table_name = 'reservations'"
                        + " and column_name = 'status'",
                String.class)).isEqualTo("enum('CONFIRMED','CANCELLED','COMPLETED','EXPIRED')");
        assertThat(jdbc.queryForObject("select count(*) from medicine_master", Integer.class)).isGreaterThanOrEqualTo(40);
        assertThat(jdbc.queryForObject(
                "select count(*) from medicine_master where status <> 'APPROVED'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject(
                "select c.name from medicine_master m join categories c on c.id = m.therapeutic_category_id"
                        + " where m.brand_name = 'Prednisolone'", String.class)).isEqualTo("Corticosteroids");
        assertThat(jdbc.queryForObject(
                "select column_default from information_schema.columns"
                        + " where table_schema = database() and table_name = 'users' and column_name = 'reset_otp_attempts'",
                String.class)).isEqualTo("0");
        assertThat(jdbc.queryForList(
                "select column_name from information_schema.statistics"
                        + " where table_schema = database() and table_name = 'inventory'"
                        + " and index_name = 'uk_inventory_pharmacy_medicine' and non_unique = 0"
                        + " order by seq_in_index",
                String.class)).containsExactly("pharmacy_id", "medicine_master_id");
        assertThat(jdbc.queryForObject("select count(*) from DATABASECHANGELOG", Integer.class)).isEqualTo(15);
    }
}
