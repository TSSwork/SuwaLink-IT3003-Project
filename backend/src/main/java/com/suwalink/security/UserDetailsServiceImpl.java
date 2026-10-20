package com.suwalink.security;

import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.PharmacyVisibilityService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;
    private final PharmacyVisibilityService visibility;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .filter(found -> found.getDeletedAt() == null)
            .orElseThrow(() -> new UsernameNotFoundException("No user found with email: " + email));

        boolean enabled = !(user.isDemo() && !visibility.isDemoModePublic());
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPassword(),
            enabled, true, true, !user.isSuspended(),
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
}
