package com.suwalink.security;

import java.util.Collection;
import java.util.UUID;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

/** Spring Security user that also carries the account id, so a token can be matched to the exact account. */
@Getter
public class AppUserDetails extends User {

    private final UUID id;

    public AppUserDetails(UUID id, String email, String password, boolean enabled, boolean accountNonLocked,
            Collection<? extends GrantedAuthority> authorities) {
        super(email, password, enabled, true, true, accountNonLocked, authorities);
        this.id = id;
    }
}
