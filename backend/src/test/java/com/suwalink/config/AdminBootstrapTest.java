package com.suwalink.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminBootstrapTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    private AdminBootstrap bootstrap(String email, String password) {
        return bootstrap(email, password, "SuwaLink Admin");
    }

    private AdminBootstrap bootstrap(String email, String password, String name) {
        return new AdminBootstrap(userRepository, encoder, email, password, name);
    }

    @Test
    void createsAdminWhenNoneExists() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        bootstrap("boot@suwalink.lk", "long-enough-pass").run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(1)).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(Role.ADMIN);
        assertThat(saved.getValue().getEmail()).isEqualTo("boot@suwalink.lk");
        assertThat(encoder.matches("long-enough-pass", saved.getValue().getPassword())).isTrue();
    }

    @Test
    void doesNothingWhenAnAdminAlreadyExists() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

        bootstrap("other@suwalink.lk", "long-enough-pass").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void failsWhenPasswordShorterThan12() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        assertThatThrownBy(() -> bootstrap("boot@suwalink.lk", "short").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_PASSWORD");
        verify(userRepository, never()).save(any());
    }

    @Test
    void failsWhenEmailBlank() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        assertThatThrownBy(() -> bootstrap("", "long-enough-pass").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_EMAIL");
        verify(userRepository, never()).save(any());
    }

    @Test
    void usesDefaultNameWhenNameBlank() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        bootstrap("boot@suwalink.lk", "long-enough-pass", "").run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getName()).isEqualTo("SuwaLink Admin");
    }

    @Test
    void failsWhenPasswordNull() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        assertThatThrownBy(() -> bootstrap("boot@suwalink.lk", null).run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_PASSWORD");
        verify(userRepository, never()).save(any());
    }

    @Test
    void failsWhenPasswordIs11Chars() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        assertThatThrownBy(() -> bootstrap("boot@suwalink.lk", "12345678901").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_PASSWORD");
        verify(userRepository, never()).save(any());
    }

    @Test
    void acceptsPasswordOfExactly12Chars() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        bootstrap("boot@suwalink.lk", "123456789012").run(null);

        verify(userRepository, times(1)).save(any());
    }
}
