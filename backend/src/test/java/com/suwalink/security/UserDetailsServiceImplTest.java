package com.suwalink.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PharmacyVisibilityService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

class UserDetailsServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserDetailsServiceImpl userDetailsService = new UserDetailsServiceImpl(userRepository, mock(PharmacyVisibilityService.class));

    @Test
    void loadUserByUsername_whenUserExists_returnsUserDetailsWithRoleAuthority() {
        User user = User.builder()
            .id(UUID.randomUUID())
            .name("Nimal Perera")
            .email("nimal@example.com")
            .phone("0771234567")
            .password("hashed-password")
            .role(Role.CUSTOMER)
            .build();
        when(userRepository.findByEmail("nimal@example.com")).thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserByUsername("nimal@example.com");

        assertThat(userDetails.getUsername()).isEqualTo("nimal@example.com");
        assertThat(userDetails.getPassword()).isEqualTo("hashed-password");
        assertThat(userDetails.getAuthorities())
            .extracting(Object::toString)
            .containsExactly("ROLE_CUSTOMER");
    }

    @Test
    void loadUserByUsername_whenUserNotFound_throwsUsernameNotFoundException() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("missing@example.com"))
            .isInstanceOf(UsernameNotFoundException.class);
    }
}
