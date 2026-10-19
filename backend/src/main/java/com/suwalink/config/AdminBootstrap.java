package com.suwalink.config;

import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the initial admin account from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists. */
@Component
@Slf4j
public class AdminBootstrap implements ApplicationRunner {

    private static final String DEFAULT_NAME = "SuwaLink Admin";
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String name;

    public AdminBootstrap(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email}") String email,
            @Value("${app.admin.password}") String password,
            @Value("${app.admin.name}") String name) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
        this.name = name;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.countByRole(Role.ADMIN) > 0) {
            log.info("Admin exists, skipping bootstrap");
            return;
        }
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("ADMIN_EMAIL must be set to create the initial admin");
        }
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "ADMIN_PASSWORD must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        userRepository.save(User.builder()
                .name(name == null || name.isBlank() ? DEFAULT_NAME : name.trim())
                .email(email)
                .phone("0000000000")
                .password(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .build());
        log.info("Bootstrap admin created: {}", email);
    }
}
