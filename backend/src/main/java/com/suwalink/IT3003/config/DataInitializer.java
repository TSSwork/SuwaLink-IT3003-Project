package com.suwalink.IT3003.config;

import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        if (!userRepository.existsByEmail("admin@suwalink.com")) {

            User admin = User.builder()
                    .name("System Admin")
                    .email("admin@suwalink.com")
                    .phone("0770000000")
                    .password(passwordEncoder.encode("Admin@123"))
                    .role(Role.ADMIN)
                    .build();

            userRepository.save(admin);

            System.out.println("Default Admin Created");
        }

    }
}
