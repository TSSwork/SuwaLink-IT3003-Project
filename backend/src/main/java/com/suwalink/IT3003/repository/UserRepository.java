package com.suwalink.IT3003.repository;

import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;


public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
    long countByRole(Role role);
    List<User> findAllByRole(Role role);
}
