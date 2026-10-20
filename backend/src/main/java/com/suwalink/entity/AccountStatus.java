package com.suwalink.entity;

/** Derived from {@link User#isSuspended()} and {@link User#getDeletedAt()}; used by the admin user list. */
public enum AccountStatus {
    ACTIVE,
    SUSPENDED,
    DELETED;

    public static AccountStatus of(User user) {
        if (user.getDeletedAt() != null) {
            return DELETED;
        }
        return user.isSuspended() ? SUSPENDED : ACTIVE;
    }
}
