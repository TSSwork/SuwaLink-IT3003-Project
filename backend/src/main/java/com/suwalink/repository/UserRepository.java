package com.suwalink.repository;

import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;


public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
    long countByRole(Role role);
    List<User> findAllByRole(Role role);

    /**
     * Admin user list. {@code q} matches name or email (case-insensitive, optional). With
     * {@code deleted = true} only deleted accounts; otherwise non-deleted ones, optionally narrowed by
     * {@code suspended}.
     */
    @Query("SELECT u FROM User u WHERE "
            + "(:q IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%')) "
            + "     OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))) "
            + "AND ((:deleted = true AND u.deletedAt IS NOT NULL) "
            + "  OR (:deleted = false AND u.deletedAt IS NULL AND (:suspended IS NULL OR u.suspended = :suspended))) "
            + "ORDER BY u.createdAt DESC")
    List<User> searchForAdmin(
            @Param("q") String q,
            @Param("deleted") boolean deleted,
            @Param("suspended") Boolean suspended);

    List<User> findByDemoTrue();
}
