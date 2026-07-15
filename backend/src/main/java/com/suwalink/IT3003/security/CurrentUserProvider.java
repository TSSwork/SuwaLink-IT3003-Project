package com.suwalink.IT3003.security;

import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user in security context");
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));
    }
}
