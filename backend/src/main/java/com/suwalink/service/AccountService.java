package com.suwalink.service;

import com.suwalink.dto.request.DeleteAccountRequest;
import java.util.UUID;

/**
 * Account deletion (by anonymisation; the row stays so reservation and response history survive)
 * and admin suspension. Admin accounts can't be deleted or suspended.
 */
public interface AccountService {

    /** Deletes the current user's account after checking their password. */
    void deleteMyAccount(DeleteAccountRequest request);

    /** Admin: deletes another user's account under the same rules. */
    void deleteUser(UUID id);

    /** Admin: the user can no longer log in and existing tokens stop working. */
    void suspend(UUID id);

    void reactivate(UUID id);
}
