package com.suwalink.util;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Random reservation pickup codes: 10 characters from an alphabet without look-alikes
 * (no I, L, O, 0 or 1), so they are easy to read out at the counter. Uniqueness is checked by the caller.
 */
@Component
public class PickupCodeGenerator {

    static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    static final int LENGTH = 10;

    private final SecureRandom random = new SecureRandom();

    public String next() {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }
}
