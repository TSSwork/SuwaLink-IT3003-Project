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
 * Applies the real Liquibase changelog to MySQL 8 and lets Hibernate validate the entities against it.
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
    static MySQLContainer mysql = new MySQLContainer("mysql:8.0");

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
        assertThat(jdbc.queryForObject("select count(*) from medicine_master", Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from DATABASECHANGELOG", Integer.class)).isEqualTo(2);
    }
}
